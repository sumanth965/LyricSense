import logging
import os
import shutil
import tempfile
import uuid
from typing import Optional, Tuple

# Configure OpenMP & CTranslate2 thread settings before importing / initializing models to prevent
# severe spin-lock thread contention (__kmp_wait_template) on macOS / multi-core CPUs.
os.environ.setdefault("OMP_NUM_THREADS", str(min(4, max(1, os.cpu_count() or 2))))
os.environ.setdefault("KMP_BLOCKTIME", "0")
os.environ.setdefault("OMP_WAIT_POLICY", "PASSIVE")

from faster_whisper import WhisperModel
import av

from .config import settings
from .schemas import TranscriptionResponse
from .alignment import (
    align_known_lyrics,
    align_segments_with_whisperx,
    process_segments_and_alignment,
)
from .transliteration import get_language_display_name, transliterate_segments_and_words
from .separation import (
    detect_is_music,
    is_vocal_separation_available,
    separate_vocals_demucs,
)
from .audio_processing import (
    compress_to_16k_mono_flac,
    preprocess_to_16k_mono_wav,
)
from .groq_service import is_groq_available, transcribe_with_groq
from .scoring import save_reference_contour

logger = logging.getLogger(__name__)

_model_instance: Optional[WhisperModel] = None
_model_load_error: Optional[str] = None


def _attach_scoring_reference(
    response: TranscriptionResponse,
    audio_path: str,
    vocal_separation_used: bool,
) -> TranscriptionResponse:
    """Extract and persist reference pitch contour for sing-along scoring."""
    if response.analysis_id:
        return response
    analysis_id = str(uuid.uuid4())
    try:
        if audio_path and os.path.isfile(audio_path):
            save_reference_contour(
                analysis_id=analysis_id,
                audio_path=audio_path,
                segments=response.segments,
                has_vocals_stem=vocal_separation_used,
            )
            response.analysis_id = analysis_id
            if not vocal_separation_used:
                response.warnings.append(
                    "Vocal separation was off or unavailable; reference pitch contour was extracted from the full mix, so scoring will be less accurate."
                )
    except Exception as e:
        logger.warning(f"Failed to generate reference contour for scoring: {e}")
    return response


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
    Defaults MODEL_SIZE to large-v3 when DEVICE=cuda. On CPU, defaults to large-v3 with int8,
    while allowing small/base/tiny via settings/.env.
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


def get_audio_duration_seconds(file_path: str) -> Optional[float]:
    """Helper to retrieve audio duration in seconds via PyAV."""
    try:
        with av.open(file_path) as container:
            if container.duration is not None:
                return round(float(container.duration) / 1000000.0, 2)
            audio_streams = [s for s in container.streams if s.type == "audio"]
            if audio_streams and audio_streams[0].duration and audio_streams[0].time_base:
                return round(float(audio_streams[0].duration * audio_streams[0].time_base), 2)
    except Exception:
        pass
    return None


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
        # Optimized decoding parameters per specifications:
        # - beam_size=5, word_timestamps=True
        # - condition_on_previous_text=False
        # - temperature=[0.0, 0.2, 0.4, 0.6]
        # - compression_ratio_threshold=2.4, log_prob_threshold=-1.0, no_speech_threshold=0.6
        # - vad_filter configurable via env (default False to prevent cutting singing notes)
        segments_generator, info = model.transcribe(
            file_path,
            language=lang,
            beam_size=5,
            best_of=5,
            temperature=[0.0, 0.2, 0.4, 0.6],
            word_timestamps=True,
            vad_filter=settings.vad_filter,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
            compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0,
            no_speech_threshold=0.6,
            hallucination_silence_threshold=2.0,
            condition_on_previous_text=False,
        )

        raw_segments = list(segments_generator)
    except Exception as e:
        logger.error(f"Transcription execution failed for '{original_filename}': {e}", exc_info=True)
        raise RuntimeError(f"Transcription failed: {e}") from e

    audio_duration = round(float(info.duration), 2) if info and getattr(info, "duration", None) else None
    if audio_duration is None:
        audio_duration = get_audio_duration_seconds(file_path)

    detected_language = info.language if info and getattr(info, "language", None) else None
    detected_lang_name = get_language_display_name(detected_language)

    # Extract structured segments and validate word timestamps against duration bounds
    segments, alignment_status, warnings, aligned_words, total_words = process_segments_and_alignment(
        raw_segments,
        detected_language=detected_language,
        audio_duration=audio_duration,
    )

    # Check language confidence when auto-detected
    if not lang and info and getattr(info, "language_probability", None) is not None:
        lang_prob = float(info.language_probability)
        if lang_prob < 0.60:
            warnings.append(
                f"Detected language '{detected_language}' has low confidence ({lang_prob:.2f} < 0.60). "
                "Consider specifying language manually."
            )

    # Step: WhisperX forced alignment if requested or configured
    if settings.alignment_method == "whisperx" and segments:
        aligned_segs, align_status, align_warnings, aligned_words, total_words = align_segments_with_whisperx(
            segments,
            audio_path=file_path,
            language_code=detected_language,
            device=settings.device,
            audio_duration=audio_duration,
        )
        segments = aligned_segs
        alignment_status = align_status
        warnings.extend(align_warnings)

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
    separate_vocals: Optional[str] = None,
) -> TranscriptionResponse:
    """
    Transcribes audio file locally using faster-whisper.
    Applies Demucs vocal separation if enabled or auto-detected for music.
    Runs 100% locally.
    """
    # Resolve separation mode ("auto", "on", "off")
    mode = (separate_vocals or settings.separate_vocals_default or "off").strip().lower()
    if enable_vocal_separation and mode == "auto":
        mode = "on"

    is_music = False
    music_note = ""
    should_separate = False

    if mode == "on":
        should_separate = True
    elif mode == "auto":
        is_music, _, music_note = detect_is_music(file_path)
        should_separate = is_music

    temp_vocals_dir = None
    active_audio_path = file_path
    vocal_sep_used = False
    sep_status = "skipped"
    sep_warnings = []

    if should_separate:
        if not is_vocal_separation_available():
            sep_status = "unavailable"
            sep_warnings.append(
                "Vocal separation was requested/recommended but Demucs/PyTorch runtime is not installed."
            )
        else:
            try:
                temp_vocals_dir = tempfile.mkdtemp(prefix="lyricsense_demucs_work_")
                vocals_path, status = separate_vocals_demucs(file_path, output_dir=temp_vocals_dir)
                if status == "completed" and vocals_path and os.path.isfile(vocals_path):
                    active_audio_path = vocals_path
                    vocal_sep_used = True
                    sep_status = "completed"
                    logger.info(f"Using Demucs separated vocals stem: {vocals_path}")
                else:
                    sep_status = "failed"
                    sep_warnings.append(
                        "Local vocal separation could not isolate the vocal track. Used original recording."
                    )
            except Exception as e:
                sep_status = "failed"
                sep_warnings.append(f"Vocal separation error: {e}. Used original recording.")

    try:
        result = _execute_transcription_pass(
            active_audio_path,
            original_filename=original_filename,
            language=language,
        )
        result.vocal_separation_used = vocal_sep_used
        result.separation_status = sep_status
        result.music_detected = is_music if mode == "auto" else None
        if sep_warnings:
            result.warnings.extend(sep_warnings)
        return _attach_scoring_reference(result, active_audio_path, vocal_sep_used)
    finally:
        if temp_vocals_dir and os.path.exists(temp_vocals_dir):
            shutil.rmtree(temp_vocals_dir, ignore_errors=True)


def transcribe_audio_file(
    file_path: str,
    original_filename: str,
    language: Optional[str] = None,
    enable_cloud: bool = True,
    enable_vocal_separation: Optional[bool] = None,
    separate_vocals: Optional[str] = None,
    lyrics: Optional[str] = None,
) -> TranscriptionResponse:
    """
    Target Pipeline Coordinator:
    Audio Preprocessing (16kHz mono WAV with loudnorm)
    -> Demucs vocal separation (auto / on / off)
    -> faster-whisper large-v3 or Groq cloud Whisper-large-v3
    -> WhisperX forced alignment
    -> Monotonic timestamp validation & low-confidence per-word flags.

    Also handles Known-Lyrics Mode when 'lyrics' text is provided.
    """
    # 1. Preprocess input audio to 16 kHz mono WAV with loudnorm
    preprocessed_wav = None
    flac_temp = None
    temp_demucs_dir = None

    try:
        preprocessed_wav = preprocess_to_16k_mono_wav(file_path, apply_loudnorm=True)
        active_audio_path = preprocessed_wav
        audio_dur = get_audio_duration_seconds(preprocessed_wav)

        # 2. Resolve vocal separation strategy
        sep_mode = (separate_vocals or settings.separate_vocals_default or "off").strip().lower()
        if enable_vocal_separation is True:
            sep_mode = "on"
        elif enable_vocal_separation is False and separate_vocals is None:
            sep_mode = "off"

        is_music = False
        should_separate = False

        if sep_mode == "on":
            should_separate = True
        elif sep_mode == "auto":
            is_music, _, _ = detect_is_music(preprocessed_wav)
            should_separate = is_music

        vocal_separation_used = False
        separation_status = "skipped"
        separation_warnings = []

        if should_separate:
            if is_vocal_separation_available():
                temp_demucs_dir = tempfile.mkdtemp(prefix="lyricsense_demucs_proc_")
                try:
                    vocals_path, status = separate_vocals_demucs(preprocessed_wav, output_dir=temp_demucs_dir)
                    if status == "completed" and vocals_path and os.path.isfile(vocals_path):
                        active_audio_path = vocals_path
                        vocal_separation_used = True
                        separation_status = "completed"
                    else:
                        separation_status = "failed"
                        separation_warnings.append("Demucs vocal separation did not produce a vocal stem. Used preprocessed audio.")
                except Exception as e:
                    separation_status = "failed"
                    separation_warnings.append(f"Demucs vocal separation failed: {e}. Used preprocessed audio.")
            else:
                separation_status = "unavailable"
                separation_warnings.append("Vocal separation requested/recommended but Demucs is not installed.")

        # 3. Known-Lyrics Mode
        if lyrics and lyrics.strip():
            logger.info(f"Known-lyrics mode active for '{original_filename}'. Skipping recognition and running forced alignment.")
            aligned_segments, status, warnings, aligned_words, total_words = align_known_lyrics(
                lyrics=lyrics,
                audio_path=active_audio_path,
                language_code=language or "en",
                device=settings.device,
                audio_duration=audio_dur,
            )

            # Transliteration for known lyrics
            aligned_segments, was_transliterated = transliterate_segments_and_words(
                aligned_segments,
                detected_language=language or "en",
            )
            full_transcript = " ".join(seg.text for seg in aligned_segments if seg.text).strip()

            resp_warnings = list(separation_warnings) + warnings
            resp = TranscriptionResponse(
                status="completed",
                filename=original_filename,
                language=language or "en",
                detected_language_name=get_language_display_name(language or "en"),
                duration=audio_dur,
                transcript=full_transcript,
                original_transcript=lyrics.strip() if was_transliterated else None,
                transliterated=was_transliterated,
                segments=aligned_segments,
                alignment_status=status,
                aligned_words_count=aligned_words,
                total_words_count=total_words,
                vocal_separation_used=vocal_separation_used,
                separation_status=separation_status,
                engine_used="local_whisper",
                fallback_used=False,
                fallback_reason=None,
                warnings=resp_warnings,
                music_detected=is_music if sep_mode == "auto" else None,
                known_lyrics_used=True,
            )
            return _attach_scoring_reference(resp, active_audio_path, vocal_separation_used)

        # 4. Hybrid Cloud (Groq) or Local Transcription
        fallback_reason: Optional[str] = None

        if enable_cloud and is_groq_available():
            try:
                # Requirement 6: For cloud mode, compress to 16 kHz mono FLAC to stay under 25 MB
                flac_temp = compress_to_16k_mono_flac(active_audio_path)
                groq_audio_to_send = flac_temp if os.path.isfile(flac_temp) else active_audio_path

                logger.info(f"Dispatching preprocessed FLAC to Groq cloud API for '{original_filename}'...")
                groq_result = transcribe_with_groq(
                    groq_audio_to_send,
                    original_filename=original_filename,
                    language=language,
                )

                if groq_result.transcript and len(groq_result.transcript.strip()) > 0:
                    logger.info(f"Groq cloud transcription succeeded for '{original_filename}'.")
                    groq_result.vocal_separation_used = vocal_separation_used
                    groq_result.separation_status = separation_status
                    groq_result.music_detected = is_music if sep_mode == "auto" else None
                    if separation_warnings:
                        groq_result.warnings.extend(separation_warnings)

                    # Requirement 6: Run WhisperX forced alignment after Groq upload locally
                    if settings.alignment_method == "whisperx" and groq_result.segments:
                        aligned_segs, align_status, align_warnings, aligned_words, total_words = align_segments_with_whisperx(
                            groq_result.segments,
                            audio_path=active_audio_path,
                            language_code=groq_result.language,
                            device=settings.device,
                            audio_duration=audio_dur,
                        )
                        groq_result.segments = aligned_segs
                        groq_result.alignment_status = align_status
                        groq_result.aligned_words_count = aligned_words
                        groq_result.total_words_count = total_words
                        groq_result.warnings.extend(align_warnings)

                    return _attach_scoring_reference(groq_result, active_audio_path, vocal_separation_used)
                else:
                    fallback_reason = "Groq returned an empty transcript."
                    logger.warning(f"{fallback_reason} Falling back to local faster-whisper.")

            except Exception as groq_err:
                fallback_reason = str(groq_err)
                logger.warning(f"Groq cloud transcription failed ({fallback_reason}). Falling back to local faster-whisper.")

        # 5. Local faster-whisper pipeline
        local_result = transcribe_local_audio_file(
            file_path=active_audio_path,
            original_filename=original_filename,
            language=language,
            separate_vocals="off" if vocal_separation_used else sep_mode,
        )

        if vocal_separation_used:
            local_result.vocal_separation_used = True
            local_result.separation_status = separation_status

        if local_result.music_detected is None and sep_mode == "auto":
            local_result.music_detected = is_music

        if separation_warnings:
            local_result.warnings.extend(separation_warnings)

        if fallback_reason:
            local_result.fallback_used = True
            local_result.fallback_reason = fallback_reason
            local_result.warnings.append(f"Cloud transcription notice: {fallback_reason}. Used local engine.")

        local_result.engine_used = "local_whisper"
        return _attach_scoring_reference(local_result, active_audio_path, vocal_separation_used)

    finally:
        # Guaranteed cleanup of all intermediate temporary files
        if preprocessed_wav and os.path.exists(preprocessed_wav) and preprocessed_wav != file_path:
            try:
                os.unlink(preprocessed_wav)
            except Exception:
                pass
        if flac_temp and os.path.exists(flac_temp) and flac_temp != file_path:
            try:
                os.unlink(flac_temp)
            except Exception:
                pass
        if temp_demucs_dir and os.path.exists(temp_demucs_dir):
            shutil.rmtree(temp_demucs_dir, ignore_errors=True)
