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
from .separation import (
    is_vocal_separation_available,
    separate_vocals_locally,
    select_best_transcription,
)
from .groq_service import is_groq_available, transcribe_with_groq

logger = logging.getLogger(__name__)

_model_instance: Optional[WhisperModel] = None
_model_load_error: Optional[str] = None


def check_ffmpeg() -> bool:
    """Checks whether ffmpeg is available on PATH or common locations."""
    if shutil.which("ffmpeg") is not None:
        return True
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


def _execute_transcription_pass(
    file_path: str,
    original_filename: str,
    language: Optional[str] = None,
) -> TranscriptionResponse:
    """Internal helper running faster-whisper decoding on a single audio file."""
    model = get_model()

    lang = (
        language.strip().lower()
        if language and language.strip().lower() not in ("auto", "none", "", "null")
        else None
    )

    file_size_bytes = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    file_size_mb = round(file_size_bytes / (1024 * 1024), 2)
    logger.info(
        f"Transcribing '{original_filename}' "
        f"(size: {file_size_mb} MB, language: {lang or 'auto'})..."
    )

    try:
        # Music-optimized decoding:
        # 1. beam_size=5, best_of=5 for high vocal clarity
        # 2. temperature=[0.0, 0.2, 0.4, 0.6, 0.8] fallback for quiet or difficult singing
        # 3. condition_on_previous_text=False prevents cascading repeated hallucinations
        # 4. vad_filter=False ensures soft singing notes and expressive vibrato are never clipped
        # 5. repetition_penalty=1.2 and no_repeat_ngram_size=3 prevent repetitive loops
        # 6. hallucination_silence_threshold=2.0 drops phantom hallucinations during instrumental pauses
        # 7. no_speech_threshold=0.6 cleanly marks instrumental interludes
        segments_generator, info = model.transcribe(
            file_path,
            language=lang,
            beam_size=5,
            best_of=5,
            temperature=[0.0, 0.2, 0.4, 0.6, 0.8],
            word_timestamps=True,
            vad_filter=False,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
            compression_ratio_threshold=2.4,
            no_speech_threshold=0.6,
            hallucination_silence_threshold=2.0,
            condition_on_previous_text=False,
        )

        raw_segments = list(segments_generator)
    except Exception as e:
        logger.error(f"Transcription execution failed for '{original_filename}': {e}", exc_info=True)
        raise RuntimeError(f"Transcription failed: {e}") from e

    audio_duration = round(float(info.duration), 2) if info and getattr(info, "duration", None) else None

    # Extract structured segments and validate word timestamps against duration bounds
    segments, alignment_status, warnings, aligned_words, total_words = process_segments_and_alignment(
        raw_segments,
        detected_language=info.language if info else None,
        audio_duration=audio_duration,
    )

    detected_language = info.language if info and getattr(info, "language", None) else None
    detected_lang_name = get_language_display_name(detected_language)

    original_transcript = " ".join(seg.text for seg in segments if seg.text).strip()

    # Step: Transliterate detected lyrics into Roman / English alphabet
    segments, was_transliterated = transliterate_segments_and_words(
        segments,
        detected_language=detected_language,
    )

    full_transcript = " ".join(seg.text for seg in segments if seg.text).strip()

    if audio_duration is None and segments:
        audio_duration = round(max(seg.end for seg in segments), 2)

    if not full_transcript:
        warnings.append("No speech or singing was recognized in the audio file.")

    logger.info(
        f"Transcription pass finished for '{original_filename}': "
        f"lang={detected_language} ({detected_lang_name or 'Auto'}), "
        f"words={total_words} ({aligned_words} aligned), "
        f"status={alignment_status}"
    )

    return TranscriptionResponse(
        status="completed",
        filename=original_filename,
        language=detected_language,
        detected_language_name=detected_lang_name,
        duration=audio_duration,
        transcript=full_transcript,
        original_transcript=original_transcript if was_transliterated else None,
        transliterated=was_transliterated,
        segments=segments,
        alignment_status=alignment_status,
        aligned_words_count=aligned_words,
        total_words_count=total_words,
        vocal_separation_used=False,
        separation_status="skipped",
        engine_used="local_whisper",
        fallback_used=False,
        fallback_reason=None,
        warnings=warnings,
    )


def transcribe_local_audio_file(
    file_path: str,
    original_filename: str,
    language: Optional[str] = None,
    enable_vocal_separation: bool = False,
) -> TranscriptionResponse:
    """
    Transcribes audio file locally using faster-whisper.
    Optionally evaluates local Demucs vocal separation when requested and available.
    Never sends any audio to external cloud services.
    """
    raw_result = _execute_transcription_pass(
        file_path,
        original_filename=original_filename,
        language=language,
    )

    if not enable_vocal_separation:
        return raw_result

    # Evaluate optional local Demucs vocal separation
    if not is_vocal_separation_available():
        raw_result.separation_status = "unavailable"
        raw_result.warnings.append(
            "Vocal separation was requested but local Demucs/PyTorch runtime is not installed."
        )
        return raw_result

    temp_vocals_dir = None
    try:
        vocals_path, sep_status = separate_vocals_locally(file_path)
        if sep_status != "completed" or not vocals_path:
            raw_result.separation_status = "failed"
            raw_result.warnings.append(
                "Local vocal separation could not isolate the vocal track. Used original recording."
            )
            return raw_result

        temp_vocals_dir = os.path.dirname(vocals_path)
        vocal_result = _execute_transcription_pass(
            vocals_path,
            original_filename=f"{original_filename} (isolated vocals)",
            language=language,
        )

        best_result, note = select_best_transcription(raw_result, vocal_result)
        logger.info(f"Vocal separation evaluation: {note}")
        return best_result

    except Exception as e:
        logger.warning(f"Vocal separation comparison failed: {e}. Using original recording.")
        raw_result.separation_status = "failed"
        raw_result.warnings.append(f"Vocal separation error: {e}. Used original recording.")
        return raw_result
    finally:
        if temp_vocals_dir and os.path.exists(temp_vocals_dir):
            try:
                shutil.rmtree(temp_vocals_dir, ignore_errors=True)
            except Exception:
                pass


def transcribe_audio_file(
    file_path: str,
    original_filename: str,
    language: Optional[str] = None,
    enable_cloud: bool = True,
    enable_vocal_separation: bool = False,
) -> TranscriptionResponse:
    """
    Hybrid transcription coordinator:
    1. If cloud transcription is enabled and Groq API is available, attempts Groq Whisper-large-v3 first.
    2. If Groq succeeds with non-empty transcript, returns the cloud result.
    3. If Groq is disabled, unavailable, times out, rate-limited, or fails quality checks,
       automatically falls back to local faster-whisper + optional Demucs without losing the uploaded audio.
    4. Records honest engine_used, fallback_used, and fallback_reason diagnostics.
    """
    fallback_reason: Optional[str] = None

    if enable_cloud and is_groq_available():
        try:
            logger.info(f"Attempting cloud transcription via Groq API for '{original_filename}'...")
            groq_result = transcribe_with_groq(
                file_path,
                original_filename=original_filename,
                language=language,
            )

            # Quality check on Groq result
            if groq_result.transcript and len(groq_result.transcript.strip()) > 0:
                logger.info(f"Groq cloud transcription succeeded for '{original_filename}'.")
                return groq_result
            else:
                fallback_reason = "Groq returned an empty transcript."
                logger.warning(f"{fallback_reason} Falling back to local faster-whisper.")

        except Exception as groq_err:
            fallback_reason = str(groq_err)
            logger.warning(f"Groq cloud transcription failed ({fallback_reason}). Falling back to local faster-whisper.")

    # Execute local faster-whisper processing (either as primary offline or as automatic fallback)
    local_result = transcribe_local_audio_file(
        file_path,
        original_filename=original_filename,
        language=language,
        enable_vocal_separation=enable_vocal_separation,
    )

    if fallback_reason:
        local_result.fallback_used = True
        local_result.fallback_reason = fallback_reason
        local_result.warnings.append(f"Cloud transcription notice: {fallback_reason}. Used local engine.")

    local_result.engine_used = "local_whisper"
    return local_result

