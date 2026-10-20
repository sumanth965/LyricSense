import logging
import os
import shutil
from typing import Optional, Tuple

# Configure OpenMP & CTranslate2 thread settings before importing / initializing models to prevent
# severe spin-lock thread contention (__kmp_wait_template) on macOS / multi-core CPUs.
os.environ.setdefault("OMP_NUM_THREADS", str(min(4, max(1, os.cpu_count() or 2))))
os.environ.setdefault("KMP_BLOCKTIME", "0")
os.environ.setdefault("OMP_WAIT_POLICY", "PASSIVE")

from faster_whisper import WhisperModel
from .config import settings
from .schemas import TranscriptionResponse
from .alignment import process_segments_and_alignment
from .transliteration import transliterate_segments_and_words, get_language_display_name

logger = logging.getLogger(__name__)

_model_instance: Optional[WhisperModel] = None
_model_load_error: Optional[str] = None


def check_ffmpeg() -> bool:
    """Checks whether ffmpeg is available on PATH or common locations."""
    # First check shutil.which
    if shutil.which("ffmpeg") is not None:
        return True
    # Check if PATH has ffmpeg or ~/.local/bin has ffmpeg
    home_local = os.path.expanduser("~/.local/bin/ffmpeg")
    if os.path.isfile(home_local) and os.access(home_local, os.X_OK):
        return True
    return False


def get_model() -> WhisperModel:
    """
    Returns the singleton WhisperModel instance.
    Initializes lazily if not already created.
    """
    global _model_instance, _model_load_error

    if _model_instance is not None:
        return _model_instance

    device = settings.device.lower()
    compute_type = settings.compute_type.lower()
    model_size = settings.model_size

    # Fallback to cpu / int8 if cuda is not available
    if device == "cuda":
        try:
            import torch
            if not torch.cuda.is_available():
                logger.warning("CUDA requested but not available. Falling back to CPU with int8.")
                device = "cpu"
                compute_type = "int8"
        except ImportError:
            device = "cpu"
            compute_type = "int8"

    logger.info(
        f"Initializing faster-whisper model '{model_size}' on device '{device}' with compute_type '{compute_type}'..."
    )

    try:
        cpu_threads = min(4, max(1, os.cpu_count() or 2))
        kwargs = {
            "device": device,
            "compute_type": compute_type,
            "cpu_threads": cpu_threads,
            "num_workers": 1,
        }
        if settings.model_cache_dir:
            kwargs["download_root"] = settings.model_cache_dir

        _model_instance = WhisperModel(model_size, **kwargs)
        _model_load_error = None
        logger.info(f"faster-whisper model '{model_size}' loaded successfully (cpu_threads={cpu_threads}).")
        return _model_instance
    except Exception as e:
        _model_load_error = str(e)
        logger.error(f"Failed to initialize faster-whisper model: {e}", exc_info=True)
        raise RuntimeError(
            f"Failed to initialize transcription model '{model_size}' on {device}: {e}"
        ) from e


def is_model_loaded() -> bool:
    return _model_instance is not None


def get_model_load_error() -> Optional[str]:
    return _model_load_error


def transcribe_audio_file(
    file_path: str,
    original_filename: str,
    language: Optional[str] = None,
) -> TranscriptionResponse:
    """
    Transcribes the audio file located at file_path using faster-whisper.
    Generates segment and word-level timestamps without uploading to any external service.
    """
    model = get_model()

    # Clean language parameter if specified (e.g. 'hi', 'en', 'es')
    lang = (
        language.strip().lower()
        if language and language.strip().lower() not in ("auto", "none", "", "null")
        else None
    )

    # Log file diagnostics
    file_size_bytes = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    file_size_mb = round(file_size_bytes / (1024 * 1024), 2)
    logger.info(
        f"Transcribing audio file '{original_filename}' "
        f"(path: {file_path}, size: {file_size_mb} MB, language: {lang or 'auto'})..."
    )

    try:
        # Use beam_size=5 for higher accuracy with songs containing background music.
        # condition_on_previous_text=True maintains language coherence across segments
        #   and prevents mid-song language switches to non-existent Hindi/Urdu/etc.
        # vad_filter=False ensures full-song coverage (Silero VAD mistakenly cuts off musical singing).
        # repetition_penalty=1.2 and no_repeat_ngram_size=3 prevent repetitive hallucination loops.
        # alignment.py further cleans any phantom hallucinated loops from instrumental interludes.
        segments_generator, info = model.transcribe(
            file_path,
            language=lang,
            beam_size=5,
            best_of=5,
            temperature=0.0,
            word_timestamps=True,
            vad_filter=False,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
            condition_on_previous_text=True,
        )

        # Evaluate generator to list
        raw_segments = list(segments_generator)
    except Exception as e:
        logger.error(f"Transcription execution failed for '{original_filename}': {e}", exc_info=True)
        raise RuntimeError(f"Transcription failed: {e}") from e

    # Log raw segment count before filtering
    raw_word_count = sum(
        len(seg.words) if hasattr(seg, "words") and seg.words else 0
        for seg in raw_segments
    )
    logger.info(
        f"Raw transcription produced {len(raw_segments)} segments, "
        f"{raw_word_count} words for '{original_filename}'"
    )

    # Extract structured segments and word timestamps
    segments, alignment_status, warnings = process_segments_and_alignment(
        raw_segments,
        detected_language=info.language if info else None,
    )

    # Determine detected language
    detected_language = info.language if info and getattr(info, "language", None) else None
    detected_lang_name = get_language_display_name(detected_language)

    # Construct raw transcript before transliteration
    original_transcript = " ".join(seg.text for seg in segments if seg.text).strip()

    # Step: Transliterate detected lyrics into Roman / English alphabet
    # Preserves 100% of word-level timestamps and segment intervals
    segments, was_transliterated = transliterate_segments_and_words(
        segments,
        detected_language=detected_language,
    )

    # Construct final English alphabet transcript text
    full_transcript = " ".join(seg.text for seg in segments if seg.text).strip()

    # Determine accurate audio duration
    duration = None
    if info and getattr(info, "duration", None):
        duration = round(float(info.duration), 2)
    elif segments:
        duration = round(max(seg.end for seg in segments), 2)

    # For empty recordings or silence
    if not full_transcript:
        warnings.append("No speech or singing was recognized in the audio file.")

    # Diagnostic logging
    total_words = sum(len(seg.words) for seg in segments)
    words_with_ts = sum(
        1 for seg in segments for w in seg.words
        if w.start is not None and w.end is not None
    )
    first_seg_start = segments[0].start if segments else None
    last_seg_end = segments[-1].end if segments else None
    logger.info(
        f"Transcription completed for '{original_filename}': "
        f"language={detected_language} ({detected_lang_name or 'Unknown'}), "
        f"transliterated={was_transliterated}, duration={duration}s, "
        f"segments={len(segments)}, words={total_words} ({words_with_ts} with timestamps), "
        f"transcript_chars={len(full_transcript)}, "
        f"first_seg_start={first_seg_start}, last_seg_end={last_seg_end}, "
        f"alignment_status={alignment_status}"
    )

    return TranscriptionResponse(
        status="completed",
        filename=original_filename,
        language=detected_language,
        detected_language_name=detected_lang_name,
        duration=duration,
        transcript=full_transcript,
        original_transcript=original_transcript if was_transliterated else None,
        transliterated=was_transliterated,
        segments=segments,
        alignment_status=alignment_status,
        warnings=warnings,
    )
