import logging
import os
import shutil
import subprocess
import tempfile
from typing import Optional, Tuple
import av

logger = logging.getLogger(__name__)


def get_audio_info(file_path: str) -> Tuple[Optional[int], Optional[int], Optional[str]]:
    """
    Returns (sample_rate, channels, format) for the primary audio stream.
    """
    try:
        with av.open(file_path) as container:
            audio_streams = [s for s in container.streams if s.type == "audio"]
            if not audio_streams:
                return None, None, None
            stream = audio_streams[0]
            sr = stream.rate
            channels = stream.channels
            codec = stream.codec_context.name if stream.codec_context else None
            return sr, channels, codec
    except Exception as e:
        logger.debug(f"Could not inspect audio specs for {file_path}: {e}")
        return None, None, None


def preprocess_to_16k_mono_wav(
    input_path: str,
    output_path: Optional[str] = None,
    apply_loudnorm: bool = True,
) -> str:
    """
    Preprocesses audio to 16 kHz mono WAV with EBU R128 loudness normalization.
    Avoids redundant re-encoding if input is already 16 kHz mono PCM WAV.
    """
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"Input audio file not found: {input_path}")

    sr, channels, codec = get_audio_info(input_path)
    ext = os.path.splitext(input_path)[1].lower()

    # Avoid re-encoding lossy files or already compliant 16kHz mono WAV if loudnorm is not strictly required
    if ext == ".wav" and sr == 16000 and channels == 1 and not apply_loudnorm:
        logger.debug(f"Audio '{input_path}' is already 16 kHz mono WAV. Skipping re-encoding.")
        return input_path

    if not output_path:
        fd, output_path = tempfile.mkstemp(prefix="lyricsense_16k_", suffix=".wav")
        os.close(fd)

    ffmpeg_bin = shutil.which("ffmpeg") or os.path.expanduser("~/.local/bin/ffmpeg")
    if not ffmpeg_bin or not os.path.exists(ffmpeg_bin):
        logger.warning("ffmpeg not found. Proceeding with unprocessed original file.")
        return input_path

    cmd = [
        ffmpeg_bin,
        "-y",
        "-i", input_path,
        "-vn",
        "-ar", "16000",
        "-ac", "1",
    ]

    if apply_loudnorm:
        cmd.extend(["-af", "loudnorm=I=-16:LRA=11:TP=-1.5"])

    cmd.append(output_path)

    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        if proc.returncode != 0:
            if apply_loudnorm:
                logger.warning(
                    f"ffmpeg loudnorm filter failed (code {proc.returncode}). Retrying without loudnorm filter."
                )
                # Retry without loudnorm (often happens on <0.5s audio clips)
                fallback_cmd = [
                    ffmpeg_bin, "-y", "-i", input_path, "-vn", "-ar", "16000", "-ac", "1", output_path
                ]
                retry = subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
                if retry.returncode == 0 and os.path.isfile(output_path):
                    return output_path
            logger.warning(f"ffmpeg conversion failed: {proc.stderr.decode(errors='ignore')}")
            return input_path
        return output_path
    except Exception as e:
        logger.warning(f"Audio preprocessing via ffmpeg failed: {e}. Using original audio.")
        return input_path


def compress_to_16k_mono_flac(
    input_path: str,
    output_path: Optional[str] = None,
) -> str:
    """
    Compresses audio to 16 kHz mono FLAC to minimize payload size for cloud (Groq) uploads.
    """
    if not output_path:
        fd, output_path = tempfile.mkstemp(prefix="lyricsense_groq_", suffix=".flac")
        os.close(fd)

    ffmpeg_bin = shutil.which("ffmpeg") or os.path.expanduser("~/.local/bin/ffmpeg")
    if not ffmpeg_bin or not os.path.exists(ffmpeg_bin):
        return input_path

    cmd = [
        ffmpeg_bin,
        "-y",
        "-i", input_path,
        "-vn",
        "-ar", "16000",
        "-ac", "1",
        "-c:a", "flac",
        output_path,
    ]

    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        if proc.returncode == 0 and os.path.isfile(output_path):
            return output_path
        logger.warning(f"FLAC compression failed: {proc.stderr.decode(errors='ignore')}")
        return input_path
    except Exception as e:
        logger.warning(f"FLAC compression error: {e}. Using original audio.")
        return input_path
