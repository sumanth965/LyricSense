import logging
import re
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

from .config import settings
from .schemas import SegmentItem, WordItem

logger = logging.getLogger(__name__)

# Check WhisperX availability
try:
    import whisperx
    import torch
    if hasattr(torch, "set_num_threads"):
        try:
            torch.set_num_threads(1)
        except Exception:
            pass
    WHISPERX_AVAILABLE = True
except (ImportError, Exception):
    whisperx = None
    WHISPERX_AVAILABLE = False


def is_whisperx_available() -> bool:
    """Returns True if WhisperX is installed and available."""
    return WHISPERX_AVAILABLE


# In-memory cache for WhisperX alignment models: {(language_code, device): (model, metadata)}
_align_model_cache: Dict[Tuple[str, str], Tuple[Any, Any]] = {}


def get_whisperx_align_model(language_code: str, device: str = "cpu") -> Tuple[Any, Any]:
    """
    Retrieves or loads a WhisperX alignment model for the specified language.
    Caches loaded models in memory to avoid reloading on every request.
    """
    key = (language_code.lower().strip(), device.lower().strip())
    if key in _align_model_cache:
        return _align_model_cache[key]

    if not WHISPERX_AVAILABLE or whisperx is None:
        raise RuntimeError("WhisperX is not available in the environment.")

    logger.info(f"Loading WhisperX alignment model for language='{key[0]}' on device='{key[1]}'...")
    align_model, align_metadata = whisperx.load_align_model(
        language_code=key[0],
        device=key[1],
    )
    _align_model_cache[key] = (align_model, align_metadata)
    logger.info(f"WhisperX alignment model for '{key[0]}' cached successfully.")
    return align_model, align_metadata


def validate_and_clean_words(
    raw_words: List[WordItem],
    max_duration: Optional[float] = None,
    enforce_monotonic: bool = False,
) -> List[WordItem]:
    """
    Validates word timestamps:
    - start <= end
    - non-negative numbers (negative clamped to 0.0)
    - start within audio duration bounds
    - optionally enforces monotonic timestamps (no temporal inversions)
    - preserves word text and attached punctuation
    - flags low_confidence (true when probability < LOW_CONFIDENCE_THRESHOLD)
    - never evenly distributes or fabricates timestamps
    """
    cleaned: List[WordItem] = []
    prev_valid_start: Optional[float] = None

    threshold = getattr(settings, "low_confidence_threshold", 0.4)

    for w in raw_words:
        if isinstance(w, dict):
            text = str(w.get("word", "")).strip()
            start = w.get("start")
            end = w.get("end")
            prob = w.get("probability", w.get("score"))
        else:
            text = w.word.strip()
            start = w.start
            end = w.end
            prob = getattr(w, "probability", None)

        if not text:
            continue

        # Ensure start and end are valid numbers and end > start
        if start is not None and end is not None:
            if start < 0:
                start = 0.0
            if max_duration is not None and start > max_duration + 1.0:
                # Timestamp exceeds audio duration bound
                start = None
                end = None
            elif end <= start:
                # Discard invalid inverted or zero-duration timestamps rather than fabricating
                start = None
                end = None
            elif enforce_monotonic and prev_valid_start is not None and start < prev_valid_start:
                # Discard temporal inversion to enforce strictly monotonic timestamps
                start = None
                end = None
            else:
                start = round(float(start), 3)
                end = round(float(end), 3)
                prev_valid_start = start
        else:
            start = None
            end = None

        prob_val = round(float(prob), 3) if prob is not None else None
        is_low_conf = bool(prob_val is not None and prob_val < threshold)

        cleaned.append(
            WordItem(
                word=text,
                start=start,
                end=end,
                probability=prob_val,
                low_confidence=is_low_conf,
            )
        )
    return cleaned


# Known Whisper phantom hallucination phrases that appear during instrumental sections.
KNOWN_HALLUCINATION_PHRASES = {
    "thank you for watching",
    "thanks for watching",
    "please subscribe",
    "subtitles by",
    "like and subscribe",
    "subscribe to my channel",
    "don't forget to subscribe",
    "please like and subscribe",
    "transcribed by",
    "translated by",
}


def is_hallucinated_segment(text: str) -> bool:
    """
    Checks if a segment is a known Whisper phantom hallucination or instrumental loop.
    Legitimate singing repetitions in choruses are preserved.
    """
    stripped = text.strip()
    if not stripped:
        return True

    cleaned = re.sub(r"[^\w\s]", "", stripped).strip().lower()

    for phrase in KNOWN_HALLUCINATION_PHRASES:
        if phrase in cleaned:
            remaining = cleaned.replace(phrase, "").strip()
            if len(remaining) <= 10:
                logger.info(f"Filtering out known hallucination phrase segment: '{stripped}'")
                return True

    words = re.findall(r"\S+", stripped)
    if not words:
        return True

    # 1. Single-token repetition loops
    if len(words) >= 10:
        counts = Counter(w.lower() for w in words)
        most_common_word, freq = counts.most_common(1)[0]
        if freq >= 10 and len(most_common_word) <= 2 and (freq / len(words) >= 0.85):
            logger.info(f"Filtering out single-token repetition loop: '{stripped[:80]}...'")
            return True

    # 2. Very long consecutive identical token runs (8+ consecutive same token)
    match = re.search(r"(\b\S+\b)(?:\s+\1){7,}", stripped, re.IGNORECASE)
    if match:
        repeated_token = match.group(1)
        if len(repeated_token) <= 3:
            logger.info(f"Filtering out long consecutive repeat of '{repeated_token}': '{stripped[:80]}...'")
            return True

    # 3. High single non-whitespace character dominance
    chars = [c for c in stripped if not c.isspace()]
    if len(chars) >= 15:
        c_counts = Counter(chars)
        top_char, c_freq = c_counts.most_common(1)[0]
        if c_freq / len(chars) >= 0.70:
            logger.info(f"Filtering out character spam segment: '{stripped[:80]}...'")
            return True

    return False


def process_segments_and_alignment(
    raw_segments: list,
    detected_language: Optional[str] = None,
    audio_duration: Optional[float] = None,
    total_duration: Optional[float] = None,
) -> Tuple[List[SegmentItem], str, List[str], int, int]:
    """
    Transforms raw Whisper segments into structured SegmentItems with validated word timestamps.
    Filters out instrumental hallucination loops and known phantom phrases.
    Returns (segments, alignment_status, warnings, aligned_words_count, total_words_count).
    """
    max_dur = audio_duration if audio_duration is not None else total_duration
    segments: List[SegmentItem] = []
    warnings: List[str] = []
    total_words = 0
    words_with_timestamps = 0
    filtered_hallucinations_count = 0

    for seg in raw_segments:
        if isinstance(seg, dict):
            raw_start = seg.get("start", 0.0)
            raw_end = seg.get("end", 0.0)
            raw_text = seg.get("text", "")
            raw_words_list = seg.get("words", [])
        else:
            raw_start = getattr(seg, "start", 0.0)
            raw_end = getattr(seg, "end", 0.0)
            raw_text = getattr(seg, "text", "")
            raw_words_list = getattr(seg, "words", []) or []

        seg_start = round(max(0.0, float(raw_start)), 3)
        seg_end = round(max(seg_start, float(raw_end)), 3)
        seg_text = raw_text.strip()

        if is_hallucinated_segment(seg_text):
            filtered_hallucinations_count += 1
            continue

        words_list: List[WordItem] = []
        if raw_words_list:
            for w in raw_words_list:
                total_words += 1
                if isinstance(w, dict):
                    w_start = float(w["start"]) if w.get("start") is not None else None
                    w_end = float(w["end"]) if w.get("end") is not None else None
                    w_prob = float(w.get("probability", w.get("score"))) if w.get("probability", w.get("score")) is not None else None
                    w_word = str(w.get("word", ""))
                else:
                    w_start = float(w.start) if w.start is not None else None
                    w_end = float(w.end) if w.end is not None else None
                    w_prob = float(w.probability) if hasattr(w, "probability") and w.probability is not None else None
                    w_word = w.word

                threshold = getattr(settings, "low_confidence_threshold", 0.4)
                raw_word = WordItem(
                    word=w_word,
                    start=w_start,
                    end=w_end,
                    probability=w_prob,
                    low_confidence=bool(w_prob is not None and w_prob < threshold),
                )
                words_list.append(raw_word)

        cleaned_words = validate_and_clean_words(words_list, max_duration=max_dur)
        for cw in cleaned_words:
            if cw.start is not None and cw.end is not None:
                words_with_timestamps += 1

        segments.append(
            SegmentItem(
                start=seg_start,
                end=seg_end,
                text=seg_text,
                words=cleaned_words,
            )
        )

    if filtered_hallucinations_count > 0:
        logger.info(f"Cleaned {filtered_hallucinations_count} hallucinated/loop segments from output.")

    # Determine alignment status honestly
    if total_words > 0 and words_with_timestamps == total_words:
        alignment_status = "completed"
    elif total_words > 0 and words_with_timestamps > 0:
        alignment_status = "partial"
        unaligned = total_words - words_with_timestamps
        warnings.append(
            f"Partial word synchronization: {words_with_timestamps} of {total_words} words have exact alignment. "
            f"{unaligned} word(s) in musical transitions or quiet singing lack exact timestamps."
        )
    elif total_words > 0 and words_with_timestamps == 0:
        alignment_status = "failed"
        warnings.append(
            "Word-level alignment could not establish timings. Segment boundaries are preserved."
        )
    else:
        alignment_status = "unavailable"
        warnings.append("No word-level timestamps were generated by the model.")

    return segments, alignment_status, warnings, words_with_timestamps, total_words


def align_segments_with_whisperx(
    segments: List[SegmentItem],
    audio_path: str,
    language_code: Optional[str] = None,
    device: str = "cpu",
    audio_duration: Optional[float] = None,
) -> Tuple[List[SegmentItem], str, List[str], int, int]:
    """
    Runs WhisperX wav2vec2 forced phoneme alignment on segments against audio.
    If no alignment model exists for the detected language (e.g. Kannada, Telugu) or if
    WhisperX is unavailable/fails, falls back to faster-whisper's native word timestamps,
    sets alignment_status to 'native' or 'partial', and adds a warning to the response.
    Never crashes.
    """
    lang = (language_code or "en").strip().lower()
    warnings: List[str] = []

    # Calculate native baseline counts
    native_total_words = sum(len(seg.words) for seg in segments)
    native_aligned_words = sum(
        1 for seg in segments for w in seg.words if w.start is not None and w.end is not None
    )

    if not WHISPERX_AVAILABLE or whisperx is None:
        warnings.append(
            "WhisperX forced alignment runtime not installed. Preserved native Whisper word timestamps."
        )
        status = "completed" if native_total_words > 0 and native_aligned_words == native_total_words else "native"
        return segments, status, warnings, native_aligned_words, native_total_words

    try:
        align_model, align_metadata = get_whisperx_align_model(lang, device=device)
    except Exception as model_err:
        logger.warning(
            f"No WhisperX forced alignment model available for language '{lang}': {model_err}. "
            "Falling back to native Whisper word timestamps."
        )
        warnings.append(
            f"No forced alignment model available for language '{lang}'. Used native Whisper word timestamps."
        )
        status = "completed" if native_total_words > 0 and native_aligned_words == native_total_words else "native"
        return segments, status, warnings, native_aligned_words, native_total_words

    try:
        logger.info(f"Executing WhisperX forced alignment on {len(segments)} segments for language '{lang}'...")
        audio_arr = whisperx.load_audio(audio_path)

        input_segments = [
            {"start": seg.start, "end": seg.end, "text": seg.text}
            for seg in segments
        ]

        aligned_output = whisperx.align(
            input_segments,
            align_model,
            align_metadata,
            audio_arr,
            device=device,
            return_char_alignments=False,
        )

        aligned_segments_data = aligned_output.get("segments", [])
        if not aligned_segments_data:
            warnings.append("WhisperX returned empty alignment. Preserved native Whisper word timestamps.")
            return segments, "native", warnings, native_aligned_words, native_total_words

        new_segments: List[SegmentItem] = []
        total_words = 0
        words_with_timestamps = 0

        for i, raw_seg in enumerate(aligned_segments_data):
            orig_seg = segments[i] if i < len(segments) else None
            seg_start = round(float(raw_seg.get("start", orig_seg.start if orig_seg else 0.0)), 3)
            seg_end = round(float(raw_seg.get("end", orig_seg.end if orig_seg else seg_start)), 3)
            seg_text = raw_seg.get("text", orig_seg.text if orig_seg else "").strip()

            raw_word_list = raw_seg.get("words", [])
            word_items: List[WordItem] = []

            for w in raw_word_list:
                total_words += 1
                w_text = str(w.get("word", "")).strip()
                w_start = float(w["start"]) if w.get("start") is not None else None
                w_end = float(w["end"]) if w.get("end") is not None else None
                w_score = float(w["score"]) if w.get("score") is not None else None

                word_items.append(
                    WordItem(
                        word=w_text,
                        start=w_start,
                        end=w_end,
                        probability=w_score,
                    )
                )

            cleaned_words = validate_and_clean_words(word_items, max_duration=audio_duration)
            for cw in cleaned_words:
                if cw.start is not None and cw.end is not None:
                    words_with_timestamps += 1

            new_segments.append(
                SegmentItem(
                    start=seg_start,
                    end=seg_end,
                    text=seg_text,
                    words=cleaned_words,
                )
            )

        status = "completed" if total_words > 0 and words_with_timestamps == total_words else "partial"
        logger.info(
            f"WhisperX forced alignment finished: words={total_words} ({words_with_timestamps} aligned), status={status}"
        )
        return new_segments, status, warnings, words_with_timestamps, total_words

    except Exception as align_err:
        logger.warning(
            f"WhisperX alignment execution failed: {align_err}. Falling back to native Whisper word timestamps."
        )
        warnings.append(f"WhisperX forced alignment notice: {align_err}. Used native Whisper word timestamps.")
        status = "completed" if native_total_words > 0 and native_aligned_words == native_total_words else "native"
        return segments, status, warnings, native_aligned_words, native_total_words


def align_known_lyrics(
    lyrics: str,
    audio_path: str,
    language_code: Optional[str] = "en",
    device: str = "cpu",
    audio_duration: Optional[float] = None,
) -> Tuple[List[SegmentItem], str, List[str], int, int]:
    """
    Known-Lyrics Mode:
    Skips speech recognition and directly aligns user-supplied lyrics against the audio.
    Breaks lyrics into line segments and runs WhisperX forced alignment.
    If WhisperX is unavailable or language unsupported, provides coarse monotonic line segmentation.
    """
    raw_lines = [line.strip() for line in lyrics.splitlines() if line.strip()]
    if not raw_lines:
        return [], "unavailable", ["Provided lyrics were empty."], 0, 0

    dur = audio_duration or 30.0
    line_dur = dur / len(raw_lines)

    initial_segments: List[SegmentItem] = []
    for i, line in enumerate(raw_lines):
        s_start = round(i * line_dur, 3)
        s_end = round((i + 1) * line_dur, 3)
        words = [WordItem(word=w) for w in line.split() if w]
        initial_segments.append(
            SegmentItem(
                start=s_start,
                end=s_end,
                text=line,
                words=words,
            )
        )

    # Attempt WhisperX forced alignment
    aligned_segments, status, warnings, aligned_words, total_words = align_segments_with_whisperx(
        initial_segments,
        audio_path=audio_path,
        language_code=language_code,
        device=device,
        audio_duration=audio_duration,
    )

    if status in ("native", "unavailable") and not any("forced" in w.lower() for w in warnings):
        warnings.append("Known lyrics aligned using coarse line timing boundaries.")

    return aligned_segments, status, warnings, aligned_words, total_words
