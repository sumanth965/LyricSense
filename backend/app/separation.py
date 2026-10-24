import logging
import os
import shutil
import tempfile
from typing import Any, Optional, Tuple
import av
import numpy as np

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


# Alias for clarity
is_demucs_available = is_vocal_separation_available


def _get_demucs_device() -> str:
    """
    Selects the optimal acceleration device for Demucs.
    On Apple Silicon, selects 'mps' if available; otherwise 'cuda' if available; defaults to 'cpu'.
    """
    try:
        import torch
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available() and torch.backends.mps.is_built():
            return "mps"
        if torch.cuda.is_available():
            return "cuda"
    except Exception:
        pass
    return "cpu"


def detect_is_music(audio_path: str) -> Tuple[bool, float, str]:
    """
    Determines whether an audio track is likely music (backing instruments/percussion)
    or speech (spoken word/podcast) for the 'separate_vocals=auto' pipeline decision.

    ACOUSTIC HEURISTIC:
    1. Non-speech / Pause energy ratio:
       Spoken human speech naturally contains frequent pause intervals between words,
       phrases, and breath intervals (typically 25% - 50% low-energy silence/pause frames).
       In contrast, musical recordings feature continuous background energy (drums, bass,
       pads, guitars, reverberation tails) that persists even when the singer is silent,
       resulting in a very low pause/silence ratio (typically < 15%).
    2. Dynamic energy continuity:
       We inspect 50ms audio frames across up to 30 seconds of the track using PyAV.
       We compute the short-time Root Mean Square (RMS) energy per frame.
       We measure the fraction of frames where RMS energy drops below 15% of the 90th
       percentile energy ('pause_ratio').
    3. Decision Boundary:
       - If pause_ratio < 0.20 (less than 20% silence/pauses):
         The track has continuous background acoustic presence consistent with music.
         Returns (True, pause_ratio, "Continuous musical backing detected (pause ratio < 20%)")
       - Otherwise (pause_ratio >= 0.20):
         The track has distinct speech-pause cadence consistent with speech.
         Returns (False, pause_ratio, "Intermittent speech-pause cadence detected (pause ratio >= 20%)")
    """
    if not os.path.isfile(audio_path):
        return True, 0.0, "File not found; defaulted to music"

    try:
        samples_list = []
        max_duration_seconds = 30.0
        total_duration = 0.0

        with av.open(audio_path) as container:
            audio_streams = [s for s in container.streams if s.type == "audio"]
            if not audio_streams:
                return True, 0.0, "No audio stream; defaulted to music"

            stream = audio_streams[0]
            sr = stream.rate or 16000

            for frame in container.decode(stream):
                # Convert frame to 1D float32 array
                arr = frame.to_ndarray()
                if arr.ndim > 1:
                    arr = np.mean(arr, axis=0)  # Mix to mono
                if arr.dtype != np.float32:
                    arr = arr.astype(np.float32) / (np.iinfo(arr.dtype).max if np.issubdtype(arr.dtype, np.integer) else 1.0)

                samples_list.append(arr)
                total_duration += len(arr) / sr
                if total_duration >= max_duration_seconds:
                    break

        if not samples_list:
            return True, 0.0, "No audio frames decoded; defaulted to music"

        full_samples = np.concatenate(samples_list)
        if len(full_samples) == 0:
            return True, 0.0, "Empty audio buffer; defaulted to music"

        # Divide into 50ms windows
        window_size = int(sr * 0.05)  # 50ms
        if window_size <= 0:
            window_size = 800

        num_windows = len(full_samples) // window_size
        if num_windows < 5:
            # Short audio: calculate simple RMS
            rms = np.sqrt(np.mean(full_samples**2))
            return (True, 0.0, "Short clip with sustained energy") if rms > 0.01 else (False, 1.0, "Silent/quiet clip")

        # Compute RMS per window
        reshaped = full_samples[: num_windows * window_size].reshape(num_windows, window_size)
        rms_values = np.sqrt(np.mean(reshaped**2, axis=1))

        peak_energy = float(np.percentile(rms_values, 90))
        if peak_energy < 1e-4:
            # Virtually completely silent audio
            return False, 1.0, "Silent audio track (pause ratio 100%)"

        threshold = 0.15 * peak_energy
        pause_frames = int(np.sum(rms_values < threshold))
        pause_ratio = round(pause_frames / num_windows, 3)

        if pause_ratio < 0.20:
            note = f"Continuous musical backing detected (pause ratio {pause_ratio * 100:.1f}% < 20%)"
            return True, pause_ratio, note
        else:
            note = f"Intermittent speech-pause cadence detected (pause ratio {pause_ratio * 100:.1f}% >= 20%)"
            return False, pause_ratio, note

    except Exception as e:
        logger.warning(f"Error during acoustic music/speech detection: {e}. Defaulting to music.")
        return True, 0.0, f"Analysis error ({e}); defaulted to music"


def separate_vocals_demucs(
    audio_path: str,
    output_dir: Optional[str] = None,
) -> Tuple[Optional[str], str]:
    """
    Separates vocal stem from background instruments using local Demucs htdemucs model.
    Runs with --two-stems=vocals to isolate the vocal track.
    
    Guarantees cleanup of temporary directories on both success and failure.

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

    created_temp_dir = (output_dir is None)
    target_dir = output_dir or tempfile.mkdtemp(prefix="lyricsense_demucs_")
    os.makedirs(target_dir, exist_ok=True)

    try:
        device = _get_demucs_device()
        logger.info(f"Running Demucs htdemucs --two-stems=vocals for '{os.path.basename(audio_path)}' (device={device})...")
        import demucs.separate

        def _run_demucs(dev: str):
            args = ["--two-stems", "vocals", "-n", "htdemucs", "-o", target_dir]
            if dev != "cpu":
                args.extend(["-d", dev])
            args.append(audio_path)
            demucs.separate.main(args)

        try:
            _run_demucs(device)
        except Exception as dev_err:
            if device == "mps":
                logger.warning(f"Demucs MPS separation failed ({dev_err}). Falling back to CPU...")
                _run_demucs("cpu")
            else:
                raise dev_err

        # Locating the output vocals stem: target_dir/htdemucs/{track_name}/vocals.wav
        track_stem = os.path.splitext(os.path.basename(audio_path))[0]
        expected_vocals_path = os.path.join(target_dir, "htdemucs", track_stem, "vocals.wav")

        if os.path.isfile(expected_vocals_path):
            logger.info(f"Demucs vocal separation completed: '{expected_vocals_path}'")
            return expected_vocals_path, "completed"

        # Search recursively in target_dir for any vocals.wav
        for root, _, files in os.walk(target_dir):
            for f in files:
                if f.lower() == "vocals.wav":
                    found = os.path.join(root, f)
                    logger.info(f"Located separated vocals at: '{found}'")
                    return found, "completed"

        logger.warning("Demucs finished but separated vocals.wav was not found.")
        if created_temp_dir:
            shutil.rmtree(target_dir, ignore_errors=True)
        return None, "failed"

    except Exception as e:
        logger.error(f"Demucs vocal separation failed: {e}", exc_info=True)
        if created_temp_dir:
            shutil.rmtree(target_dir, ignore_errors=True)
        return None, "failed"


# Backward-compatible alias
separate_vocals_locally = separate_vocals_demucs


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
    """
    if not vocal_result:
        return raw_result, "Vocal separation not available; using original audio transcription."

    raw_score = calculate_transcript_quality_score(raw_result)
    vocal_score = calculate_transcript_quality_score(vocal_result)

    logger.info(
        f"Transcription Quality Comparison: Original={raw_score:.1f}/100, "
        f"Isolated Vocals={vocal_score:.1f}/100"
    )

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
