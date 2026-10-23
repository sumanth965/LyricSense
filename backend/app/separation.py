import logging
import os
import shutil
import tempfile
from typing import Any, Optional, Tuple
from .schemas import TranscriptionResponse

logger = logging.getLogger(__name__)

# Check Demucs and PyTorch availability
try:
    import torch
    import demucs.separate
    DEMUCS_AVAILABLE = True
except (ImportError, Exception):
    DEMUCS_AVAILABLE = False


def is_vocal_separation_available() -> bool:
    """Returns True if local Demucs and PyTorch runtime are installed and available."""
    return DEMUCS_AVAILABLE


def separate_vocals_locally(
    audio_path: str,
    output_dir: Optional[str] = None,
) -> Tuple[Optional[str], str]:
    """
    Separates vocal stem from background instruments using local Demucs model.
    Runs 100% on-device without sending any audio to external services.
    
    Returns:
        (vocals_wav_path, status)
        where status is one of "completed", "failed", "unavailable".
    """
    if not DEMUCS_AVAILABLE:
        logger.info("Local Demucs is not installed. Vocal separation unavailable.")
        return None, "unavailable"

    if not os.path.isfile(audio_path):
        logger.error(f"Cannot separate vocals: Audio file '{audio_path}' not found.")
        return None, "failed"

    target_dir = output_dir or tempfile.mkdtemp(prefix="lyricsense_demucs_")
    os.makedirs(target_dir, exist_ok=True)

    try:
        logger.info(f"Running local Demucs vocal separation for '{os.path.basename(audio_path)}'...")
        # Local Demucs execution
        import demucs.separate
        demucs.separate.main([
            "--two-stems", "vocals",
            "-n", "htdemucs",
            "-o", target_dir,
            audio_path,
        ])

        # Locating the output vocals stem: target_dir/htdemucs/{track_name}/vocals.wav
        track_stem = os.path.splitext(os.path.basename(audio_path))[0]
        expected_vocals_path = os.path.join(target_dir, "htdemucs", track_stem, "vocals.wav")

        if os.path.isfile(expected_vocals_path):
            logger.info(f"Local Demucs vocal separation completed: '{expected_vocals_path}'")
            return expected_vocals_path, "completed"

        # Search recursively in target_dir for any vocals.wav
        for root, _, files in os.walk(target_dir):
            for f in files:
                if f.lower() == "vocals.wav":
                    found = os.path.join(root, f)
                    logger.info(f"Located separated vocals at: '{found}'")
                    return found, "completed"

        logger.warning("Demucs finished but separated vocals.wav was not found.")
        return None, "failed"

    except Exception as e:
        logger.error(f"Local Demucs separation failed: {e}", exc_info=True)
        return None, "failed"


def calculate_transcript_quality_score(
    transcription: Any,
    word_count: Optional[int] = None,
) -> float:
    """
    Calculates an empirical quality heuristic score (0.0 - 100.0) for a transcription:
    - High average word probability adds points
    - Aligned word ratio adds points
    - High repetition or suspicious repetition loop reduces score
    - Empty or nearly empty transcript gets low score
    """
    if isinstance(transcription, str):
        text = transcription.strip()
        tokens = [t.lower() for t in text.split() if t]
        if not tokens:
            return 0.0
        unique_tokens = len(set(tokens))
        vocab_diversity = unique_tokens / len(tokens)
        return round(vocab_diversity * 100.0, 2)

    if isinstance(transcription, dict):
        transcript_text = transcription.get("transcript", "").strip()
        segments = transcription.get("segments", [])
    else:
        transcript_text = getattr(transcription, "transcript", "").strip()
        segments = getattr(transcription, "segments", [])

    if not transcript_text:
        return 0.0

    words = []
    for seg in segments:
        seg_words = seg.get("words", []) if isinstance(seg, dict) else getattr(seg, "words", [])
        if seg_words:
            words.extend(seg_words)

    total_words = len(words)
    if total_words == 0:
        tokens = [t.lower() for t in transcript_text.split() if t]
        if not tokens:
            return 0.0
        unique_tokens = len(set(tokens))
        vocab_diversity = unique_tokens / len(tokens)
        return round(min(100.0, vocab_diversity * 80.0), 2)

    # 1. Average word probability (0.0 - 1.0 -> 0 - 50 points)
    probs = []
    for w in words:
        p = w.get("probability") if isinstance(w, dict) else getattr(w, "probability", None)
        if p is not None:
            probs.append(p)
    avg_prob = sum(probs) / len(probs) if probs else 0.5
    prob_score = avg_prob * 50.0

    # 2. Timing alignment ratio (0.0 - 1.0 -> 0 - 30 points)
    aligned_count = 0
    for w in words:
        s = w.get("start") if isinstance(w, dict) else getattr(w, "start", None)
        e = w.get("end") if isinstance(w, dict) else getattr(w, "end", None)
        if s is not None and e is not None:
            aligned_count += 1
    alignment_score = (aligned_count / total_words) * 30.0

    # 3. Repetition penalty (0 - 20 points, drops if words repeat unnaturally)
    word_tokens = []
    for w in words:
        token_txt = w.get("word") if isinstance(w, dict) else getattr(w, "word", "")
        if token_txt:
            word_tokens.append(str(token_txt).lower().strip())
    unique_tokens = len(set(word_tokens))
    vocab_diversity = unique_tokens / total_words if total_words > 0 else 1.0
    diversity_score = min(20.0, vocab_diversity * 25.0)

    total_score = prob_score + alignment_score + diversity_score
    return round(total_score, 2)


def select_best_transcription(
    raw_result: TranscriptionResponse,
    vocal_result: Optional[TranscriptionResponse],
) -> Tuple[TranscriptionResponse, str]:
    """
    Compares raw audio transcription with isolated vocal transcription.
    Selects the higher quality result based on documented empirical checks.
    
    Returns:
        (best_result, comparison_note)
    """
    if not vocal_result:
        return raw_result, "Vocal separation not available; using original audio transcription."

    raw_score = calculate_transcript_quality_score(raw_result)
    vocal_score = calculate_transcript_quality_score(vocal_result)

    logger.info(
        f"Transcription Quality Comparison: Original={raw_score:.1f}/100, "
        f"Isolated Vocals={vocal_score:.1f}/100"
    )

    # If vocal score is higher by at least 3 points, prefer vocal separation
    if vocal_score > raw_score + 3.0:
        if isinstance(vocal_result, dict):
            vocal_result["vocal_separation_used"] = True
            vocal_result["separation_status"] = "completed"
            vocal_result.setdefault("warnings", []).append(
                f"Vocal separation selected (quality score: {vocal_score:.1f} vs original {raw_score:.1f})."
            )
        else:
            vocal_result.vocal_separation_used = True
            vocal_result.separation_status = "completed"
            vocal_result.warnings.append(
                f"Vocal separation selected (quality score: {vocal_score:.1f} vs original {raw_score:.1f})."
            )
        return vocal_result, "Isolated vocals transcription selected based on higher vocal clarity."

    # Otherwise stick with original audio transcription
    if isinstance(raw_result, dict):
        raw_result["vocal_separation_used"] = False
        raw_result["separation_status"] = "rejected_lower_quality"
        raw_result.setdefault("warnings", []).append(
            f"Original audio transcription selected (quality score: {raw_score:.1f} vs separated {vocal_score:.1f})."
        )
    else:
        raw_result.vocal_separation_used = False
        raw_result.separation_status = "rejected_lower_quality"
        raw_result.warnings.append(
            f"Original audio transcription selected (quality score: {raw_score:.1f} vs separated {vocal_score:.1f})."
        )
    return raw_result, "Original audio transcription selected based on higher quality score."
