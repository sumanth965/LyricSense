import io
import math
import struct
import wave
from unittest.mock import MagicMock, PropertyMock, patch
import pytest
from fastapi.testclient import TestClient

from app.main import app, settings
from app.alignment import validate_and_clean_words, process_segments_and_alignment, is_hallucinated_segment
from app.schemas import WordItem


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


# 1. Health endpoint test
def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "model_size" in data
    assert "device" in data
    assert "compute_type" in data
    assert "ffmpeg_available" in data
    assert "alignment_available" in data
    assert data["status"] in ("healthy", "degraded")


# 2. Invalid upload: unsupported file extension
def test_invalid_extension(client):
    fake_txt = io.BytesIO(b"Hello world")
    response = client.post(
        "/api/transcribe",
        files={"file": ("test.txt", fake_txt, "text/plain")},
    )
    assert response.status_code == 400
    assert "Unsupported audio format" in response.json()["detail"]


# 3. Invalid upload: empty file (0 bytes)
def test_empty_audio_upload(client):
    empty_file = io.BytesIO(b"")
    response = client.post(
        "/api/transcribe",
        files={"file": ("empty.mp3", empty_file, "audio/mpeg")},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]


# 4. Invalid upload: corrupted / non-audio binary content
def test_corrupted_audio_file(client):
    corrupt_file = io.BytesIO(b"RIFF\x00\x00\x00\x00WAVEfmt \x10\x00\x00\x00this is not valid audio")
    response = client.post(
        "/api/transcribe",
        files={"file": ("corrupt.wav", corrupt_file, "audio/wav")},
    )
    assert response.status_code == 400
    assert "Unable to decode audio" in response.json()["detail"] or "valid audio stream" in response.json()["detail"]


# 5. Oversized upload test (> 100 MB limit)
def test_oversized_upload(client):
    with patch.object(type(settings), "max_upload_size_bytes", new_callable=PropertyMock) as mock_size:
        mock_size.return_value = 500  # 500 bytes limit
        wav_data = generate_test_wav(duration_seconds=1.0)
        assert len(wav_data) > 500
        response = client.post(
            "/api/transcribe",
            files={"file": ("large.wav", io.BytesIO(wav_data), "audio/wav")},
        )
        assert response.status_code == 413
        assert "exceeds the maximum allowed size" in response.json()["detail"]


# 6. Valid transcription response structure with mocked inference
def test_valid_transcription_structure(client):
    wav_bytes = generate_test_wav(duration_seconds=1.5)

    mock_word = MagicMock(word="Singing", start=0.2, end=0.8, probability=0.95)
    mock_segment = MagicMock(
        start=0.2,
        end=1.2,
        text="Singing freely in sync",
        words=[
            mock_word,
            MagicMock(word="freely", start=0.85, end=1.1, probability=0.92),
        ],
    )
    mock_info = MagicMock(language="en", duration=1.5)

    with patch("app.main.transcribe_audio_file") as mock_transcribe:
        from app.schemas import TranscriptionResponse, SegmentItem, WordItem
        mock_transcribe.return_value = TranscriptionResponse(
            status="completed",
            filename="sample.wav",
            language="en",
            duration=1.5,
            transcript="Singing freely in sync",
            segments=[
                SegmentItem(
                    start=0.2,
                    end=1.2,
                    text="Singing freely in sync",
                    words=[
                        WordItem(word="Singing", start=0.2, end=0.8, probability=0.95),
                        WordItem(word="freely", start=0.85, end=1.1, probability=0.92),
                    ],
                )
            ],
            alignment_status="completed",
            warnings=[],
        )

        response = client.post(
            "/api/transcribe",
            files={"file": ("sample.wav", io.BytesIO(wav_bytes), "audio/wav")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["filename"] == "sample.wav"
        assert data["language"] == "en"
        assert data["duration"] == 1.5
        assert "Singing freely in sync" in data["transcript"]
        assert len(data["segments"]) == 1
        assert data["segments"][0]["words"][0]["word"] == "Singing"
        assert data["segments"][0]["words"][0]["start"] == 0.2
        assert data["segments"][0]["words"][0]["end"] == 0.8
        assert data["alignment_status"] == "completed"


# 7. Word timestamp validation and timestamp bounds logic
def test_word_timestamp_validation():
    raw_words = [
        WordItem(word=" Hello ", start=0.5, end=1.0),
        WordItem(word="inverted", start=2.0, end=1.5),  # Inverted: should be set to None, not fabricated
        WordItem(word="zero_duration", start=1.2, end=1.2),  # Zero duration (start == end): set to None
        WordItem(word="negative", start=-0.2, end=0.8),  # Negative start: should clamp to 0.0
        WordItem(word="missing", start=None, end=None),
        WordItem(word="   ", start=0.0, end=1.0),  # Empty string: should be omitted
    ]

    cleaned = validate_and_clean_words(raw_words)
    assert len(cleaned) == 5

    assert cleaned[0].word == "Hello"
    assert cleaned[0].start == 0.5
    assert cleaned[0].end == 1.0

    assert cleaned[1].word == "inverted"
    assert cleaned[1].start is None
    assert cleaned[1].end is None

    assert cleaned[2].word == "zero_duration"
    assert cleaned[2].start is None
    assert cleaned[2].end is None

    assert cleaned[3].word == "negative"
    assert cleaned[3].start == 0.0
    assert cleaned[3].end == 0.8

    assert cleaned[4].word == "missing"
    assert cleaned[4].start is None


# 8. Missing alignment handling: does not fabricate fake timestamps
def test_missing_alignment_handling():
    mock_segment = MagicMock(
        start=0.0,
        end=3.0,
        text="Acoustic intro without clear words",
        words=[],
    )

    segments, alignment_status, warnings = process_segments_and_alignment([mock_segment], detected_language="en")
    assert alignment_status == "unavailable"
    assert len(warnings) > 0
    assert segments[0].text == "Acoustic intro without clear words"
    assert segments[0].words == []


# 9. Temporary file cleanup guarantee on failure
def test_temp_file_cleanup_on_failure(client):
    with patch("app.main.transcribe_audio_file") as mock_transcribe:
        mock_transcribe.side_effect = RuntimeError("Simulated model memory error")

        wav_bytes = generate_test_wav(duration_seconds=0.5)
        response = client.post(
            "/api/transcribe",
            files={"file": ("test_fail.wav", io.BytesIO(wav_bytes), "audio/wav")},
        )
        assert response.status_code == 500
        assert "Transcription failed" in response.json()["detail"]


# 10. Empty or silent transcription does not fabricate fake lyrics
def test_empty_or_failed_transcription_no_fake_lyrics(client):
    with patch("app.main.transcribe_audio_file") as mock_transcribe:
        from app.schemas import TranscriptionResponse
        mock_transcribe.return_value = TranscriptionResponse(
            status="completed",
            filename="silent.wav",
            language=None,
            duration=2.0,
            transcript="",
            segments=[],
            alignment_status="unavailable",
            warnings=["No speech or singing was recognized in the audio file."],
        )

        wav_bytes = generate_test_wav(duration_seconds=2.0)
        response = client.post(
            "/api/transcribe",
            files={"file": ("silent.wav", io.BytesIO(wav_bytes), "audio/wav")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["transcript"] == ""
        assert data["segments"] == []
        assert len(data["warnings"]) > 0
        assert "No speech or singing was recognized" in data["warnings"][0]


# 11. Accurate duration fallback calculation across segments
def test_duration_calculation_fallback():
    from app.schemas import SegmentItem, WordItem
    from app.transcription import process_segments_and_alignment

    raw_seg1 = MagicMock(start=0.0, end=4.5, text="First verse line", words=[])
    raw_seg2 = MagicMock(start=5.0, end=12.8, text="Second verse line", words=[])

    segments, alignment_status, warnings = process_segments_and_alignment([raw_seg1, raw_seg2])
    assert len(segments) == 2
    max_duration = round(max(s.end for s in segments), 2)
    assert max_duration == 12.8


# 12. Hallucination filter catches known YouTube phantom phrases
def test_hallucination_filter_catches_phantom_phrases():
    assert is_hallucinated_segment("Thank you for watching!") is True
    assert is_hallucinated_segment("Please subscribe") is True
    assert is_hallucinated_segment("Subtitles by") is True


# 13. Hallucination filter does NOT catch legitimate song lyrics
def test_hallucination_filter_preserves_real_lyrics():
    # Choruses that repeat words are normal in songs
    assert is_hallucinated_segment("Baby baby baby oh") is False
    assert is_hallucinated_segment("na na na na hey hey hey goodbye") is False
    assert is_hallucinated_segment("My heart is in your way, my heart is breaking") is False
    assert is_hallucinated_segment("Love me love me say that you love me") is False
    assert is_hallucinated_segment("Hello from the other side") is False
    assert is_hallucinated_segment("Yeah yeah yeah she's got it") is False


# 14. Hallucination filter catches extreme single-char loops
def test_hallucination_filter_catches_extreme_loops():
    # 15+ of the same single character
    assert is_hallucinated_segment("ज़ " * 20) is True
    # But short repetitions should pass
    assert is_hallucinated_segment("la la la") is False


# 15. Hallucination filter handles empty and whitespace
def test_hallucination_filter_empty():
    assert is_hallucinated_segment("") is True
    assert is_hallucinated_segment("   ") is True


# 16. Multi-segment transcription preserves all segments
def test_multi_segment_transcription_preserved():
    mock_segments = [
        MagicMock(
            start=0.0, end=4.0,
            text="First verse of the song",
            words=[
                MagicMock(word="First", start=0.0, end=0.5, probability=0.9),
                MagicMock(word="verse", start=0.6, end=1.0, probability=0.85),
                MagicMock(word="of", start=1.1, end=1.3, probability=0.95),
                MagicMock(word="the", start=1.4, end=1.5, probability=0.9),
                MagicMock(word="song", start=1.6, end=2.0, probability=0.88),
            ],
        ),
        MagicMock(
            start=5.0, end=9.0,
            text="Second verse continues here",
            words=[
                MagicMock(word="Second", start=5.0, end=5.5, probability=0.9),
                MagicMock(word="verse", start=5.6, end=6.0, probability=0.87),
                MagicMock(word="continues", start=6.1, end=6.8, probability=0.82),
                MagicMock(word="here", start=6.9, end=7.2, probability=0.91),
            ],
        ),
        MagicMock(
            start=10.0, end=14.0,
            text="Final chorus of the song",
            words=[
                MagicMock(word="Final", start=10.0, end=10.5, probability=0.88),
                MagicMock(word="chorus", start=10.6, end=11.0, probability=0.85),
                MagicMock(word="of", start=11.1, end=11.3, probability=0.95),
                MagicMock(word="the", start=11.4, end=11.5, probability=0.9),
                MagicMock(word="song", start=11.6, end=12.0, probability=0.87),
            ],
        ),
    ]

    segments, alignment_status, warnings = process_segments_and_alignment(mock_segments, detected_language="en")

    # All 3 segments must be preserved
    assert len(segments) == 3
    assert segments[0].text == "First verse of the song"
    assert segments[1].text == "Second verse continues here"
    assert segments[2].text == "Final chorus of the song"

    # All words must have valid timestamps
    total_words = sum(len(seg.words) for seg in segments)
    assert total_words == 14
    assert alignment_status == "completed"

    # Timestamps are chronologically ordered across segments
    assert segments[0].end <= segments[1].start
    assert segments[1].end <= segments[2].start
