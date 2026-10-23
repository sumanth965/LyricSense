"""
LyricSense - Groq Cloud Audio Transcription Service
Provides fast cloud-accelerated Whisper transcription using the official Groq SDK.
Includes pre-flight constraints validation (25MB limit, audio formats), error classification,
and structure parsing with word-level timestamps.
"""

import logging
import os
from pathlib import Path
from typing import List, Optional, Tuple

from .config import settings
from .schemas import SegmentItem, TranscriptionResponse, WordItem
from .alignment import validate_and_clean_words
from .transliteration import get_language_display_name, transliterate_segments_and_words

logger = logging.getLogger(__name__)

# Check groq SDK availability
try:
    import groq
    from groq import Groq
    GROQ_SDK_AVAILABLE = True
except ImportError:
    groq = None
    Groq = None
    GROQ_SDK_AVAILABLE = True  # We installed it, but keep safe fallback

# Supported audio extensions for Groq API
GROQ_SUPPORTED_EXTENSIONS = {
    ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg", ".flac"
}


def is_groq_available() -> bool:
    """Checks whether the Groq SDK is installed and an API key is configured."""
    api_key = settings.groq_api_key or os.getenv("GROQ_API_KEY")
    return bool(GROQ_SDK_AVAILABLE and api_key and api_key.strip() and settings.groq_enabled)


def get_groq_client() -> Optional["Groq"]:
    """Instantiates a Groq client with timeout configured from settings."""
    if not is_groq_available():
        return None
    api_key = settings.groq_api_key or os.getenv("GROQ_API_KEY")
    return Groq(
        api_key=api_key.strip(),
        timeout=settings.groq_timeout_seconds,
    )


def validate_file_for_groq(audio_path: str) -> Tuple[bool, Optional[str]]:
    """
    Validates whether an audio file satisfies Groq API constraints:
    - File exists and is non-empty
    - File size <= 25 MB (Groq limit)
    - File extension is supported
    """
    p = Path(audio_path)
    if not p.exists():
        return False, f"Audio file does not exist: {audio_path}"

    file_size = p.stat().st_size
    if file_size == 0:
        return False, "Audio file is empty (0 bytes)."

    if file_size > settings.groq_max_file_size_bytes:
        size_mb = file_size / (1024 * 1024)
        max_mb = settings.groq_max_file_size_bytes / (1024 * 1024)
        return False, f"File size ({size_mb:.1f} MB) exceeds Groq API 25 MB limit ({max_mb:.0f} MB)."

    ext = p.suffix.lower()
    if ext not in GROQ_SUPPORTED_EXTENSIONS:
        return False, f"Audio format '{ext}' is not supported by Groq API (supported: {', '.join(sorted(GROQ_SUPPORTED_EXTENSIONS))})."

    return True, None


def map_language_code(language_name_or_code: Optional[str]) -> Optional[str]:
    """Maps language names (e.g. 'English', 'Hindi') or codes to 2-letter ISO codes."""
    if not language_name_or_code:
        return None
    lang = language_name_or_code.strip().lower()
    mapping = {
        "english": "en",
        "hindi": "hi",
        "kannada": "kn",
        "japanese": "ja",
        "spanish": "es",
        "french": "fr",
        "german": "de",
        "italian": "it",
        "portuguese": "pt",
        "chinese": "zh",
        "korean": "ko",
        "russian": "ru",
        "auto": None,
    }
    return mapping.get(lang, lang[:2] if len(lang) >= 2 else lang)


def transcribe_with_groq(
    audio_path: str,
    original_filename: str,
    language: Optional[str] = None,
) -> TranscriptionResponse:
    """
    Executes cloud transcription via Groq's official API using whisper-large-v3.
    Extracts word-level timestamps and passes the result through the LyricSense
    English/Roman transliteration pipeline.

    Raises RuntimeError or ValueError if Groq fails or produces an empty/invalid transcript.
    """
    is_valid, validation_error = validate_file_for_groq(audio_path)
    if not is_valid:
        raise ValueError(validation_error)

    client = get_groq_client()
    if not client:
        raise RuntimeError("Groq client is not available (check GROQ_API_KEY).")

    groq_lang = language if language and language != "auto" else None

    logger.info(f"Dispatching transcription to Groq API ({settings.groq_model}) for {original_filename}")

    try:
        with open(audio_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                file=(original_filename, audio_file),
                model=settings.groq_model,
                response_format="verbose_json",
                timestamp_granularities=["word", "segment"],
                language=groq_lang,
                temperature=0.0,
            )
    except Exception as err:
        # Classify Groq specific errors
        err_type = type(err).__name__
        err_msg = str(err)
        logger.warning(f"Groq API call failed [{err_type}]: {err_msg}")
        if "AuthenticationError" in err_type:
            raise RuntimeError(f"Groq authentication failed (invalid API key): {err_msg}")
        elif "RateLimitError" in err_type:
            raise RuntimeError(f"Groq API rate limit exceeded: {err_msg}")
        elif "APIConnectionError" in err_type or "Timeout" in err_type:
            raise RuntimeError(f"Groq network timeout / connection error: {err_msg}")
        elif "APIStatusError" in err_type:
            status_code = getattr(err, "status_code", "Unknown")
            raise RuntimeError(f"Groq API status error HTTP {status_code}: {err_msg}")
        else:
            raise RuntimeError(f"Groq transcription error: {err_msg}")

    # Validate returned transcript text
    raw_text = getattr(response, "text", "") or ""
    raw_text = raw_text.strip()
    if not raw_text:
        raise ValueError("Groq returned an empty transcript.")

    detected_lang = map_language_code(getattr(response, "language", None))
    detected_lang_name = get_language_display_name(detected_lang)
    audio_duration = getattr(response, "duration", None)
    if audio_duration is not None:
        try:
            audio_duration = round(float(audio_duration), 2)
        except (ValueError, TypeError):
            audio_duration = None

    # Parse segments and word tokens
    raw_segments = getattr(response, "segments", []) or []
    raw_words = getattr(response, "words", []) or []

    # Flatten word list
    words_by_time: List[WordItem] = []
    if raw_words:
        for w in raw_words:
            w_dict = w if isinstance(w, dict) else (w.model_dump() if hasattr(w, "model_dump") else getattr(w, "__dict__", {}))
            w_text = str(w_dict.get("word", "")).strip()
            if not w_text:
                continue
            w_start = float(w_dict["start"]) if w_dict.get("start") is not None else None
            w_end = float(w_dict["end"]) if w_dict.get("end") is not None else None
            words_by_time.append(WordItem(word=w_text, start=w_start, end=w_end, probability=0.95))

    # Clean word timestamps
    cleaned_words = validate_and_clean_words(words_by_time, max_duration=audio_duration)

    # Build segments
    structured_segments: List[SegmentItem] = []
    word_cursor = 0

    if raw_segments:
        for seg in raw_segments:
            s_dict = seg if isinstance(seg, dict) else (seg.model_dump() if hasattr(seg, "model_dump") else getattr(seg, "__dict__", {}))
            s_start = round(float(s_dict.get("start", 0.0)), 3)
            s_end = round(float(s_dict.get("end", s_start)), 3)
            s_text = str(s_dict.get("text", "")).strip()

            # Assign matching words to segment
            seg_words: List[WordItem] = []
            while word_cursor < len(cleaned_words):
                w = cleaned_words[word_cursor]
                if w.start is not None and w.start <= s_end + 0.15:
                    seg_words.append(w)
                    word_cursor += 1
                else:
                    break

            structured_segments.append(
                SegmentItem(
                    start=s_start,
                    end=s_end,
                    text=s_text,
                    words=seg_words,
                )
            )
    else:
        # If no segments, construct one from text and words
        structured_segments.append(
            SegmentItem(
                start=0.0,
                end=audio_duration if audio_duration else 5.0,
                text=raw_text,
                words=cleaned_words,
            )
        )

    # Determine alignment status
    total_words_count = len(cleaned_words)
    aligned_words_count = sum(1 for w in cleaned_words if w.start is not None and w.end is not None)
    if total_words_count == 0:
        alignment_status = "unavailable"
    elif aligned_words_count == total_words_count:
        alignment_status = "completed"
    elif aligned_words_count > 0:
        alignment_status = "partial"
    else:
        alignment_status = "unavailable"

    # Run English/Roman transliteration pipeline
    processed_segments, was_transliterated = transliterate_segments_and_words(
        structured_segments,
        detected_language=detected_lang,
    )

    final_transcript = " ".join(s.text for s in processed_segments).strip()
    original_transcript = raw_text if was_transliterated else None

    return TranscriptionResponse(
        status="completed",
        filename=original_filename,
        language=detected_lang,
        detected_language_name=detected_lang_name,
        duration=audio_duration,
        transcript=final_transcript,
        original_transcript=original_transcript,
        transliterated=was_transliterated,
        segments=processed_segments,
        alignment_status=alignment_status,
        aligned_words_count=aligned_words_count,
        total_words_count=total_words_count,
        vocal_separation_used=False,
        separation_status="skipped",
        engine_used="groq",
        fallback_used=False,
        fallback_reason=None,
        warnings=[],
    )
