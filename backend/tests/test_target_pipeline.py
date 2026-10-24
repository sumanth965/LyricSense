import io
import math
import os
import struct
import tempfile
import wave
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app, settings
from app.alignment import (
    align_known_lyrics,
    align_segments_with_whisperx,
    validate_and_clean_words,
)
from app.schemas import SegmentItem, TranscriptionResponse, WordItem
from app.separation import detect_is_music, separate_vocals_demucs
from app.transcription import transcribe_audio_file


@pytest.fixture
def client():
    return TestClient(app)


def generate_wav_with_pauses(duration_sec: float = 2.0, sample_rate: int = 16000, pause_ratio: float = 0.5) -> bytes:
    """
    Generates a WAV audio file alternating between tone and silence
    to test the acoustic pause/silence music vs speech detection heuristic.
    """
    num_samples = int(duration_sec * sample_rate)
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)

        # 200ms chunks: tone if in active portion, silence otherwise
        chunk_size = int(0.2 * sample_rate)
        frames = []
        for i in range(num_samples):
            chunk_idx = i // chunk_size
            is_active = (chunk_idx % 2 == 0) if pause_ratio > 0.3 else True

            if is_active:
                sample_val = int(12000.0 * math.sin(2.0 * math.pi * 440.0 * (i / sample_rate)))
            else:
                sample_val = 0
            frames.append(struct.pack("<h", sample_val))

        wf.writeframes(b"".join(frames))

    return buffer.getvalue()


# 1. Test auto music/speech decision heuristic
def test_auto_music_speech_decision(tmp_path):
    # Continuous music audio (0% pauses)
    music_wav_data = generate_wav_with_pauses(duration_sec=2.0, pause_ratio=0.0)
    music_path = str(tmp_path / "continuous_music.wav")
    with open(music_path, "wb") as f:
        f.write(music_wav_data)

    is_music, ratio, note = detect_is_music(music_path)
    assert is_music is True
    assert ratio < 0.20
    assert "music" in note.lower()

    # Speech cadence audio (50% pauses between utterances)
    speech_wav_data = generate_wav_with_pauses(duration_sec=3.0, pause_ratio=0.5)
    speech_path = str(tmp_path / "cadence_speech.wav")
    with open(speech_path, "wb") as f:
        f.write(speech_wav_data)

    is_speech_music, speech_ratio, speech_note = detect_is_music(speech_path)
    assert is_speech_music is False
    assert speech_ratio >= 0.20
    assert "speech" in speech_note.lower()


# 2. Test alignment fallback when no model exists for a language (e.g. Kannada 'kn')
def test_alignment_fallback_when_no_model_exists_for_language(tmp_path):
    wav_path = str(tmp_path / "test.wav")
    with open(wav_path, "wb") as f:
        f.write(generate_wav_with_pauses(1.0))

    segments = [
        SegmentItem(
            start=0.1,
            end=0.9,
            text="ನಮಸ್ಕಾರ ಸ್ನೇಹಿತರೆ",
            words=[
                WordItem(word="ನಮಸ್ಕಾರ", start=0.1, end=0.5, probability=0.85),
                WordItem(word="ಸ್ನೇಹಿತರೆ", start=0.52, end=0.9, probability=0.88),
            ],
        )
    ]

    # Mock whisperx to be available, but get_whisperx_align_model raises ValueError as happens for unsupported languages
    mock_whisperx = MagicMock()
    with patch("app.alignment.WHISPERX_AVAILABLE", True), \
         patch("app.alignment.whisperx", mock_whisperx), \
         patch("app.alignment.get_whisperx_align_model", side_effect=ValueError("No alignment model found for language code kn")):

        aligned_segs, status, warnings, aligned_cnt, total_cnt = align_segments_with_whisperx(
            segments,
            audio_path=wav_path,
            language_code="kn",
            device="cpu",
            audio_duration=1.0,
        )

    # Must fall back gracefully to native faster-whisper timestamps
    assert status in ("native", "completed", "partial")
    assert aligned_cnt == 2
    assert total_cnt == 2
    assert any("no forced alignment model" in w.lower() or "used native" in w.lower() for w in warnings)
    assert aligned_segs[0].words[0].word == "ನಮಸ್ಕಾರ"
    assert aligned_segs[0].words[0].start == 0.1


# 3. Test low_confidence flag per-word
def test_low_confidence_flag_behavior():
    raw_words = [
        WordItem(word="Confident", start=0.1, end=0.5, probability=0.92),
        WordItem(word="Borderline", start=0.55, end=0.8, probability=0.45),
        WordItem(word="Uncertain", start=0.82, end=1.1, probability=0.25),
        WordItem(word="Muffled", start=1.15, end=1.4, probability=0.10),
    ]

    cleaned = validate_and_clean_words(raw_words)
    assert len(cleaned) == 4

    assert cleaned[0].word == "Confident"
    assert cleaned[0].low_confidence is False

    assert cleaned[1].word == "Borderline"
    assert cleaned[1].low_confidence is False

    # Probability 0.25 < threshold 0.40 -> low_confidence must be True
    assert cleaned[2].word == "Uncertain"
    assert cleaned[2].low_confidence is True

    # Probability 0.10 < threshold 0.40 -> low_confidence must be True
    assert cleaned[3].word == "Muffled"
    assert cleaned[3].low_confidence is True


# 4. Test known-lyrics mode (skips recognition, aligns supplied text)
def test_known_lyrics_mode(client):
    wav_bytes = generate_wav_with_pauses(2.0, pause_ratio=0.0)
    lyrics_text = "Line one of the song\nLine two of the song"

    fake_segments = [
        SegmentItem(
            start=0.0,
            end=1.0,
            text="Line one of the song",
            words=[
                WordItem(word="Line", start=0.0, end=0.2, probability=0.9),
                WordItem(word="one", start=0.25, end=0.4, probability=0.9),
                WordItem(word="of", start=0.42, end=0.5, probability=0.9),
                WordItem(word="the", start=0.52, end=0.7, probability=0.9),
                WordItem(word="song", start=0.72, end=0.95, probability=0.9),
            ],
        ),
        SegmentItem(
            start=1.0,
            end=2.0,
            text="Line two of the song",
            words=[
                WordItem(word="Line", start=1.0, end=1.2, probability=0.9),
                WordItem(word="two", start=1.25, end=1.4, probability=0.9),
                WordItem(word="of", start=1.42, end=1.5, probability=0.9),
                WordItem(word="the", start=1.52, end=1.7, probability=0.9),
                WordItem(word="song", start=1.72, end=1.95, probability=0.9),
            ],
        ),
    ]

    with patch("app.transcription.align_known_lyrics", return_value=(fake_segments, "completed", [], 10, 10)) as mock_align, \
         patch("app.transcription.get_model") as mock_get_model:

        response = client.post(
            "/api/transcribe",
            files={"file": ("song.wav", io.BytesIO(wav_bytes), "audio/wav")},
            data={"lyrics": lyrics_text},
        )

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "completed"
    assert data["known_lyrics_used"] is True
    assert "Line one of the song" in data["transcript"]
    assert len(data["segments"]) == 2
    assert data["segments"][0]["words"][0]["word"] == "Line"
    assert data["segments"][0]["words"][0]["low_confidence"] is False

    # Recognition model was NOT invoked
    mock_get_model.assert_not_called()
    mock_align.assert_called_once()


# 5. Test temp directory cleanup when Demucs fails
def test_temp_cleanup_when_demucs_fails(tmp_path):
    wav_path = str(tmp_path / "bad_demucs.wav")
    with open(wav_path, "wb") as f:
        f.write(generate_wav_with_pauses(1.0))

    mock_demucs = MagicMock()
    mock_demucs.separate.main.side_effect = RuntimeError("Demucs out of memory error")

    temp_root = tempfile.gettempdir()
    before_dirs = set(
        d for d in os.listdir(temp_root)
        if d.startswith("lyricsense_demucs_") and os.path.isdir(os.path.join(temp_root, d))
    )

    with patch("app.separation.DEMUCS_AVAILABLE", True), \
         patch.dict("sys.modules", {"demucs": mock_demucs, "demucs.separate": mock_demucs.separate}):

        vocals_path, status = separate_vocals_demucs(wav_path)

    assert status == "failed"
    assert vocals_path is None

    # Check that no new leftover lyricsense_demucs_ directories remain orphaned
    after_dirs = set(
        d for d in os.listdir(temp_root)
        if d.startswith("lyricsense_demucs_") and os.path.isdir(os.path.join(temp_root, d))
    )
    new_orphaned = after_dirs - before_dirs
    assert len(new_orphaned) == 0, f"Found newly orphaned Demucs directories: {new_orphaned}"
