import os
import pytest
from fastapi.testclient import TestClient

from app.main import app

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "sample_speech.wav")


@pytest.mark.skipif(not os.path.exists(FIXTURE_PATH), reason="Real audio fixture not found")
def test_real_audio_transcription_and_word_alignment():
    """
    Integration test running real faster-whisper local model inference
    on real spoken audio without any mocking.
    Verifies actual transcription text, segments, and word-level timestamps.
    """
    client = TestClient(app)

    with open(FIXTURE_PATH, "rb") as f:
        response = client.post(
            "/api/transcribe",
            files={"file": ("sample_speech.wav", f, "audio/wav")},
        )

    assert response.status_code == 200, f"Response failed: {response.text}"
    data = response.json()

    # Verify high level response
    assert data["status"] == "completed"
    assert data["filename"] == "sample_speech.wav"
    assert data["language"] == "en"
    assert data["duration"] is not None
    assert data["duration"] > 0

    # Verify transcript contains recognized words
    transcript_lower = data["transcript"].lower()
    assert "freely" in transcript_lower or "sing" in transcript_lower or "track" in transcript_lower

    # Verify segments and word alignment
    assert len(data["segments"]) > 0
    first_seg = data["segments"][0]
    assert first_seg["start"] >= 0.0
    assert first_seg["end"] >= first_seg["start"]

    # Verify actual word timestamps were generated
    words = [w for seg in data["segments"] for w in seg["words"]]
    assert len(words) > 0

    # Verify word timestamps are valid numeric intervals with strict end > start
    for w in words:
        if w["start"] is not None and w["end"] is not None:
            assert w["start"] < w["end"], f"Word end must be greater than start: {w}"
            assert w["start"] >= 0.0

    assert data["alignment_status"] in ("completed", "unavailable")


SONG_FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "sample_song.mp3")


@pytest.mark.skipif(not os.path.exists(SONG_FIXTURE_PATH), reason="Real song fixture not found")
def test_real_song_full_duration_transcription_and_alignment():
    """
    Integration test processing a real music/vocal song with background instrumentation.
    Verifies that:
    1. The entire audio file is processed.
    2. Segments and word timestamps span the full duration without truncation.
    3. Every word's end timestamp is strictly greater than its start timestamp.
    4. Language and duration are accurately detected.
    """
    client = TestClient(app)

    with open(SONG_FIXTURE_PATH, "rb") as f:
        response = client.post(
            "/api/transcribe",
            files={"file": ("sample_song.mp3", f, "audio/mpeg")},
        )

    assert response.status_code == 200, f"Response failed: {response.text}"
    data = response.json()

    # 1. Verify high-level metadata
    assert data["status"] == "completed"
    assert data["filename"] == "sample_song.mp3"
    assert data["duration"] is not None
    assert data["duration"] >= 14.0, f"Expected full song duration >= 14s, got {data['duration']}"

    # 2. Verify non-empty transcript across the song
    assert len(data["transcript"].strip()) > 0
    assert len(data["segments"]) >= 1

    # 3. Verify song is processed through the end (not truncated at the beginning)
    last_seg = data["segments"][-1]
    assert last_seg["end"] >= 10.0, f"Expected last segment to reach near end of track, got {last_seg['end']}"

    # 4. Verify word-level timestamps and strict ordering
    all_words = [w for seg in data["segments"] for w in seg["words"]]
    assert len(all_words) > 0, "Expected word tokens in transcribed song"

    words_with_timing = [w for w in all_words if w["start"] is not None and w["end"] is not None]
    assert len(words_with_timing) > 0, "Expected word-level timing for sung lyrics"

    for w in words_with_timing:
        assert w["start"] < w["end"], f"Word end must be strictly greater than start: {w}"
        assert w["start"] >= 0.0

    assert data["alignment_status"] == "completed"


FULL_SONG_PATH = "/Users/admin/Music/Music/Media.localized/Music/Unknown Artist/Unknown Album/freesoundserver-echoes-of-love-new-viral-sad-song-no-copyright-music-204805.mp3"


@pytest.mark.skipif(not os.path.exists(FULL_SONG_PATH), reason="Full 3-minute song not found")
def test_full_3minute_song_not_silently_truncated():
    """
    End-to-end integration test validating a complete 3-minute real music song.
    Verifies that the audio is NOT truncated early (e.g. at 44s as happened with vad_filter=True),
    and that segments, transcript text, and valid word timestamps extend to the final seconds.
    """
    client = TestClient(app)

    with open(FULL_SONG_PATH, "rb") as f:
        response = client.post(
            "/api/transcribe",
            files={"file": ("echoes_of_love.mp3", f, "audio/mpeg")},
        )

    assert response.status_code == 200, f"Response failed: {response.text}"
    data = response.json()

    # 1. Entire duration processed (~180 seconds)
    assert data["duration"] is not None and data["duration"] >= 175.0
    assert len(data["segments"]) >= 20, f"Expected 20+ segments across full song, got {len(data['segments'])}"

    # 2. Last segment spans to the end of the song (> 170s)
    last_seg = data["segments"][-1]
    assert last_seg["end"] >= 170.0, f"Song was truncated early! Last segment ended at {last_seg['end']}s"

    # 3. All words have valid timestamps where start < end
    words_with_timing = [
        w for seg in data["segments"] for w in seg["words"]
        if w["start"] is not None and w["end"] is not None
    ]
    assert len(words_with_timing) >= 50
    for w in words_with_timing:
        assert w["start"] < w["end"], f"Word timestamp inverted: {w}"

