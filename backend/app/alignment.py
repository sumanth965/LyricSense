import logging
import re
from collections import Counter
from typing import List, Optional, Tuple
from .schemas import SegmentItem, WordItem

logger = logging.getLogger(__name__)


def validate_and_clean_words(
    raw_words: List[WordItem],
    max_duration: Optional[float] = None,
) -> List[WordItem]:
    """
    Validates word timestamps:
    - start <= end
    - non-negative numbers
    - start within audio duration bounds
    - detects temporal inversions without fabricating timestamps
    - preserves word text and attached punctuation
    - never evenly distributes or fabricates timestamps
    """
    cleaned: List[WordItem] = []
    prev_valid_start: Optional[float] = None

    for w in raw_words:
        if isinstance(w, dict):
            text = str(w.get("word", "")).strip()
            start = w.get("start")
            end = w.get("end")
            prob = w.get("probability")
        else:
            text = w.word.strip()
            start = w.start
            end = w.end
            prob = w.probability

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
            else:
                start = round(start, 3)
                end = round(end, 3)
        else:
            start = None
            end = None

        cleaned.append(
            WordItem(
                word=text,
                start=start,
                end=end,
                probability=round(prob, 3) if prob is not None else None,
            )
        )
    return cleaned


# Known Whisper phantom hallucination phrases that appear during instrumental sections.
# These are model artifacts and never part of any real song lyric.
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
    
    IMPORTANT: Songs legitimately repeat words in choruses, hooks, and ad-libs.
    This filter must only catch obvious Whisper artifacts:
    1. Known phantom YouTube/subtitle phrases
    2. Extreme single-token repetition loops (10+ consecutive identical tokens)
    3. Non-linguistic character spam
    
    It must NOT filter legitimate chorus repetition or short phrases.
    """
    stripped = text.strip()
    if not stripped:
        return True

    # Clean punctuation to check for known phantom phrases
    cleaned = re.sub(r"[^\w\s]", "", stripped).strip().lower()

    # Check known phantom phrases (these never appear in real songs)
    for phrase in KNOWN_HALLUCINATION_PHRASES:
        if phrase in cleaned:
            # Check if this phrase constitutes almost the entire segment
            remaining = cleaned.replace(phrase, "").strip()
            if len(remaining) <= 10:
                logger.info(f"Filtering out known hallucination phrase segment: '{stripped}'")
                return True

    words = re.findall(r"\S+", stripped)
    if not words:
        return True

    # 1. Single-token repetition loops: only filter when a SINGLE token dominates
    #    with 10+ consecutive repetitions (not just high frequency — songs repeat!)
    #    Example: 'ज़ ज़ ज़ ज़ ज़ ज़ ज़ ज़ ज़ ज़' — clearly a loop
    if len(words) >= 10:
        counts = Counter(w.lower() for w in words)
        most_common_word, freq = counts.most_common(1)[0]
        # Only filter if the SAME single-character or very short token appears 10+ times
        # AND makes up 85%+ of the segment. Songs have chorus repeats but with multiple words.
        if freq >= 10 and len(most_common_word) <= 2 and (freq / len(words) >= 0.85):
            logger.info(f"Filtering out single-token repetition loop: '{stripped[:80]}...'")
            return True

    # 2. Very long consecutive identical token runs (8+ consecutive same token)
    #    This catches 'na na na na na na na na na na' style hallucination loops
    #    but not legitimate 2-3 word repeats in choruses
    match = re.search(r"(\b\S+\b)(?:\s+\1){7,}", stripped, re.IGNORECASE)
    if match:
        repeated_token = match.group(1)
        # Only filter if the repeated token is very short (1-3 chars) — likely hallucination
        if len(repeated_token) <= 3:
            logger.info(f"Filtering out long consecutive repeat of '{repeated_token}': '{stripped[:80]}...'")
            return True

    # 3. High single non-whitespace character dominance with very short words
    #    (catches Devanagari/Arabic single-char spam but not normal text)
    chars = [c for c in stripped if not c.isspace()]
    if len(chars) >= 15:
        c_counts = Counter(chars)
        top_char, c_freq = c_counts.most_common(1)[0]
        # 70%+ dominance by a single character in 15+ char segment = spam
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
    Transforms faster-whisper segments into structured SegmentItems with validated word timestamps.
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

        # Filter out hallucinated loops and known instrumental phantom text
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
                    w_prob = float(w["probability"]) if w.get("probability") is not None else None
                    w_word = str(w.get("word", ""))
                else:
                    w_start = float(w.start) if w.start is not None else None
                    w_end = float(w.end) if w.end is not None else None
                    w_prob = float(w.probability) if hasattr(w, "probability") and w.probability is not None else None
                    w_word = w.word

                raw_word = WordItem(
                    word=w_word,
                    start=w_start,
                    end=w_end,
                    probability=w_prob,
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
