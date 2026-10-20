import logging
import os
import tempfile
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

import av
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .schemas import HealthResponse, TranscriptionResponse
from .transcription import check_ffmpeg, get_model, is_model_loaded, transcribe_audio_file

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("lyricsense.backend")

# Supported audio extensions
SUPPORTED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm", ".wma"}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting LyricSense backend...")
    ffmpeg_ok = check_ffmpeg()
    if not ffmpeg_ok:
        logger.warning(
            "FFmpeg was not detected on PATH. Local audio decoding of some formats may fail. "
            "Please install FFmpeg or make it available on PATH."
        )
    else:
        logger.info("FFmpeg detected and ready.")

    # Pre-warm the singleton WhisperModel so the first user request doesn't wait for model initialization
    try:
        logger.info("Pre-warming local WhisperModel into memory...")
        get_model()
        logger.info("Local WhisperModel pre-warmed and ready.")
    except Exception as e:
        logger.warning(f"Failed to pre-warm WhisperModel at startup: {e}")

    yield

    logger.info("Shutting down LyricSense backend...")


app = FastAPI(
    title="LyricSense Local Audio Transcription API",
    description="Privacy-focused, 100% local audio transcription and word alignment using faster-whisper.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware restricted to configured frontend origins and local dev ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint reporting backend and model status.
    """
    ffmpeg_available = check_ffmpeg()
    model_ready = is_model_loaded()

    status_str = "healthy" if ffmpeg_available else "degraded"

    return HealthResponse(
        status=status_str,
        model_size=settings.model_size,
        device=settings.device,
        compute_type=settings.compute_type,
        model_loaded=model_ready,
        ffmpeg_available=ffmpeg_available,
        alignment_available=True,
    )


@app.post("/api/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file to transcribe"),
    language: Optional[str] = Form(None, description="Optional target language code (e.g. 'hi', 'en', 'es')"),
) -> TranscriptionResponse:
    """
    Transcribes an uploaded audio file locally using faster-whisper.
    Enforces file size limits, safe temporary storage, audio stream validation,
    and returns segment and word-level timestamps.
    """
    # 1. Validate filename and extension
    original_filename = file.filename or "uploaded_audio"
    # Never trust user-provided filename as a filesystem path
    safe_basename = os.path.basename(original_filename)
    _, ext = os.path.splitext(safe_basename.lower())

    if ext and ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format '{ext}'. Supported formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    # 2. Prepare safe temporary file
    target_dir = settings.temp_dir or tempfile.gettempdir()
    os.makedirs(target_dir, exist_ok=True)
    temp_filename = f"lyricsense_{uuid.uuid4().hex}{ext or '.tmp'}"
    temp_path = os.path.join(target_dir, temp_filename)

    bytes_written = 0
    max_bytes = settings.max_upload_size_bytes

    try:
        # Stream file to disk while enforcing size limit
        with open(temp_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1 MB chunks
                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail=f"Audio file exceeds the maximum allowed size of {settings.max_upload_size_mb} MB.",
                    )
                buffer.write(chunk)

        if bytes_written == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )

        # 3. Validate audio decodability using PyAV
        try:
            with av.open(temp_path) as container:
                audio_streams = [s for s in container.streams if s.type == "audio"]
                if not audio_streams:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="The uploaded file does not contain a valid audio stream.",
                    )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Audio decode validation failed for '{safe_basename}': {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decode audio. The file may be corrupted or in an unsupported codec.",
            ) from e

        # 4. Perform local faster-whisper transcription & word alignment
        try:
            result = transcribe_audio_file(
                temp_path,
                original_filename=safe_basename,
                language=language,
            )
            return result
        except Exception as e:
            logger.error(f"Transcription failed: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Transcription failed during local model processing. Please try another audio file.",
            ) from e

    finally:
        # 5. Guaranteed cleanup of temporary audio files
        if os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
                logger.debug(f"Cleaned up temporary file: {temp_path}")
            except Exception as e:
                logger.warning(f"Failed to remove temporary file {temp_path}: {e}")
