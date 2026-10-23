import io
import math
import struct
import wave
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from app.main import app, settings
from app.groq_service import (
    is_groq_available,
    validate_file_for_groq,
    transcribe_with_groq,
)
from app.schemas import TranscriptionResponse


@pytest.fixture
def client():
    return TestClient(app)


def generate_test_wav(duration_seconds: float = 1.0, sample_rate: int = 16000) -> bytes:
    """Generates a minimal valid in-memory PCM 16-bit mono WAV file."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        num_samples = int(duration_seconds * sample_rate)
        samples = []
        for i in range(num_samples):
            value = int(32767.0 * 0.5 * math.sin(2.0 * math.pi * 440.0 * i / sample_rate))
            samples.append(value)
        wf.writeframes(struct.pack(f"<{len(samples)}h", *samples))
    return buf.getvalue()


def make_dummy_local_response(
    text: str = "Local fallback text",
    engine_used: str = "local_whisper",
    fallback_used: bool = False,
    fallback_reason: str = None,
) -> TranscriptionResponse:
    """Creates a valid TranscriptionResponse schema object for mocking local whisper."""
    return TranscriptionResponse(
        status="completed",
        filename="song.wav",
        language="en",
        detected_language_name="English",
        duration=1.0,
        transcript=text,
        original_transcript=text,
        transliterated=False,
        segments=[],
        alignment_status="completed",
        aligned_words_count=0,
        total_words_count=0,
        vocal_separation_used=False,
        separation_status="skipped",
        engine_used=engine_used,
        fallback_used=fallback_used,
        fallback_reason=fallback_reason,
        warnings=[],
    )


# 1. Health check includes Groq metadata
def test_health_includes_groq_status(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "groq_available" in data
    assert "cloud_transcription_enabled" in data
    assert "groq_model" in data
    assert data["groq_model"] == settings.groq_model


# 2. Pre-flight validation checks
def test_validate_file_for_groq(tmp_path):
    # Valid file
    valid_file = tmp_path / "test.mp3"
    valid_file.write_bytes(b"dummy audio content")
    is_valid, reason = validate_file_for_groq(str(valid_file))
    assert is_valid is True
    assert reason is None

    # Oversized file (> 25MB)
    mock_stat = MagicMock()
    mock_stat.st_size = 26 * 1024 * 1024
    with patch.object(Path, "stat", return_value=mock_stat):
        is_valid, reason = validate_file_for_groq(str(valid_file))
        assert is_valid is False
        assert "exceeds Groq API 25 MB limit" in reason

    # Unsupported extension
    txt_file = tmp_path / "test.txt"
    txt_file.write_bytes(b"hello")
    is_valid, reason = validate_file_for_groq(str(txt_file))
    assert is_valid is False
    assert "not supported by Groq API" in reason


# 3. Successful Groq transcription with words and romanization
def test_groq_transcription_success(client):
    wav_bytes = generate_test_wav(1.5)

    fake_groq_resp = MagicMock()
    fake_groq_resp.text = "नमस्ते दुनिया hello world"
    fake_groq_resp.language = "hi"
    fake_groq_resp.duration = 1.5
    fake_groq_resp.segments = [
        {
            "id": 0,
            "start": 0.0,
            "end": 1.5,
            "text": "नमस्ते दुनिया hello world",
        }
    ]
    fake_groq_resp.words = [
        {"word": "नमस्ते", "start": 0.0, "end": 0.5},
        {"word": "दुनिया", "start": 0.6, "end": 1.0},
        {"word": "hello", "start": 1.1, "end": 1.3},
        {"word": "world", "start": 1.3, "end": 1.5},
    ]

    mock_client = MagicMock()
    mock_client.audio.transcriptions.create.return_value = fake_groq_resp

    with patch("app.groq_service.Groq", return_value=mock_client), \
         patch("app.groq_service.is_groq_available", return_value=True), \
         patch.object(settings, "groq_api_key", "gsk_test_key"):

        response = client.post(
            "/api/transcribe",
            files={"file": ("song.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"enable_cloud": "true"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["engine_used"] == "groq"
    assert data["fallback_used"] is False
    assert data["fallback_reason"] is None
    assert len(data["segments"]) == 1
    # Check that transliteration occurred to Roman script
    first_seg = data["segments"][0]
    assert "Namaste" in first_seg["text"] or "namaste" in first_seg["text"].lower()
    assert len(first_seg["words"]) == 4


# 4. Groq returns empty text -> Fallback to local whisper
def test_groq_empty_response_falls_back(client):
    wav_bytes = generate_test_wav(1.0)

    fake_groq_resp = MagicMock()
    fake_groq_resp.text = "   "  # Empty / whitespace text
    fake_groq_resp.language = "en"
    fake_groq_resp.duration = 1.0
    fake_groq_resp.segments = []
    fake_groq_resp.words = []

    mock_client = MagicMock()
    mock_client.audio.transcriptions.create.return_value = fake_groq_resp

    local_resp = make_dummy_local_response("Local fallback text")

    with patch("app.groq_service.Groq", return_value=mock_client), \
         patch("app.groq_service.is_groq_available", return_value=True), \
         patch.object(settings, "groq_api_key", "gsk_test_key"), \
         patch("app.transcription.transcribe_local_audio_file", return_value=local_resp):

        response = client.post(
            "/api/transcribe",
            files={"file": ("song.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"enable_cloud": "true"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["engine_used"] == "local_whisper"
    assert data["fallback_used"] is True
    assert "empty" in data["fallback_reason"].lower()


# 5. Groq timeout / connection error -> Fallback to local whisper
def test_groq_timeout_falls_back(client):
    wav_bytes = generate_test_wav(1.0)

    from groq import APIConnectionError

    mock_client = MagicMock()
    mock_client.audio.transcriptions.create.side_effect = APIConnectionError(request=MagicMock())

    local_resp = make_dummy_local_response("Local fallback after connection error")

    with patch("app.groq_service.Groq", return_value=mock_client), \
         patch("app.groq_service.is_groq_available", return_value=True), \
         patch.object(settings, "groq_api_key", "gsk_test_key"), \
         patch("app.transcription.transcribe_local_audio_file", return_value=local_resp):

        response = client.post(
            "/api/transcribe",
            files={"file": ("song.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"enable_cloud": "true"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["engine_used"] == "local_whisper"
    assert data["fallback_used"] is True
    assert "network/timeout" in data["fallback_reason"].lower() or "connection" in data["fallback_reason"].lower()


# 6. Groq rate limit error -> Fallback to local whisper
def test_groq_rate_limit_falls_back(client):
    wav_bytes = generate_test_wav(1.0)

    from groq import RateLimitError

    mock_response = MagicMock()
    mock_response.status_code = 429
    mock_response.headers = {}

    mock_client = MagicMock()
    mock_client.audio.transcriptions.create.side_effect = RateLimitError(
        message="Rate limit reached",
        response=mock_response,
        body=None
    )

    local_resp = make_dummy_local_response("Local fallback after rate limit")

    with patch("app.groq_service.Groq", return_value=mock_client), \
         patch("app.groq_service.is_groq_available", return_value=True), \
         patch.object(settings, "groq_api_key", "gsk_test_key"), \
         patch("app.transcription.transcribe_local_audio_file", return_value=local_resp):

        response = client.post(
            "/api/transcribe",
            files={"file": ("song.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"enable_cloud": "true"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["engine_used"] == "local_whisper"
    assert data["fallback_used"] is True
    assert "rate limit" in data["fallback_reason"].lower()


# 7. Groq Authentication Error (invalid API key) -> Fallback to local whisper
def test_groq_auth_error_falls_back(client):
    wav_bytes = generate_test_wav(1.0)

    from groq import AuthenticationError

    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.headers = {}

    mock_client = MagicMock()
    mock_client.audio.transcriptions.create.side_effect = AuthenticationError(
        message="Invalid API Key",
        response=mock_response,
        body=None
    )

    local_resp = make_dummy_local_response("Local fallback after auth error")

    with patch("app.groq_service.Groq", return_value=mock_client), \
         patch("app.groq_service.is_groq_available", return_value=True), \
         patch.object(settings, "groq_api_key", "invalid_key"), \
         patch("app.transcription.transcribe_local_audio_file", return_value=local_resp):

        response = client.post(
            "/api/transcribe",
            files={"file": ("song.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"enable_cloud": "true"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["engine_used"] == "local_whisper"
    assert data["fallback_used"] is True
    assert "authentication" in data["fallback_reason"].lower()


# 8. User disables cloud transcription (enable_cloud=False)
def test_cloud_disabled_by_user(client):
    wav_bytes = generate_test_wav(1.0)

    local_resp = make_dummy_local_response("Local only")

    with patch("app.transcription.transcribe_with_groq") as mock_groq_call, \
         patch("app.transcription.transcribe_local_audio_file", return_value=local_resp):

        response = client.post(
            "/api/transcribe",
            files={"file": ("song.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"enable_cloud": "false"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["engine_used"] == "local_whisper"
    assert data["fallback_used"] is False
    # Groq should NEVER have been called
    mock_groq_call.assert_not_called()


# 9. Oversized audio file (> 25MB) bypasses Groq pre-flight check and falls back
def test_oversized_file_falls_back_without_calling_groq(client):
    wav_bytes = generate_test_wav(1.0)

    local_resp = make_dummy_local_response("Local result for large file")

    with patch("app.groq_service.validate_file_for_groq", return_value=(False, "File size (30.0 MB) exceeds Groq API 25 MB limit (25 MB).")), \
         patch("app.groq_service.Groq") as mock_groq_cls, \
         patch("app.transcription.transcribe_local_audio_file", return_value=local_resp):

        response = client.post(
            "/api/transcribe",
            files={"file": ("big_song.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"enable_cloud": "true"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["engine_used"] == "local_whisper"
    assert data["fallback_used"] is True
    assert "25 mb limit" in data["fallback_reason"].lower()
    mock_groq_cls.assert_not_called()


# 10. Both engines fail -> Clean error response
def test_both_engines_fail(client):
    wav_bytes = generate_test_wav(1.0)

    with patch("app.transcription.transcribe_with_groq", side_effect=RuntimeError("Groq cloud failed")), \
         patch("app.transcription.transcribe_local_audio_file", side_effect=RuntimeError("Local whisper failed")):

        response = client.post(
            "/api/transcribe",
            files={"file": ("bad_audio.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"enable_cloud": "true"},
        )

    assert response.status_code == 500
    assert "transcription failed" in response.json()["detail"].lower()
