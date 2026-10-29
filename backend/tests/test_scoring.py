"""
Unit and integration tests for Sing-Along Scoring Engine.
Uses purely synthetic audio signals (sine waves, noise, silence).
Tests octave folding, transposition tolerance, latency compensation,
warnings, error handling, and temp file cleanup.
"""

import io
import json
import os
import shutil
import tempfile
import uuid
from typing import List, Tuple

import librosa
import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import SegmentItem, WordItem
from app.scoring import (
    cleanup_old_references,
    get_references_dir,
    load_reference_contour,
    save_reference_contour,
    score_singalong_take,
)


def generate_synthetic_melody_wav(
    notes: List[Tuple[float, float, float]],  # (freq_hz, start_sec, end_sec)
    total_duration: float,
    sr: int = 16000,
) -> np.ndarray:
    """Generate a clean synthetic sine wave melody at 16 kHz."""
    total_samples = int(sr * total_duration)
    audio = np.zeros(total_samples, dtype=np.float32)

    for freq, start_t, end_t in notes:
        start_idx = int(start_t * sr)
        end_idx = min(total_samples, int(end_t * sr))
        num_samples = end_idx - start_idx
        if num_samples > 0 and freq > 0:
            t = np.arange(num_samples) / sr
            # Apply light cosine envelope at boundaries to prevent click artifacts
            env = np.ones(num_samples, dtype=np.float32)
            fade = min(num_samples // 10, 160)
            if fade > 0:
                env[:fade] = np.linspace(0, 1, fade)
                env[-fade:] = np.linspace(1, 0, fade)
            audio[start_idx:end_idx] += 0.5 * np.sin(2 * np.pi * freq * t) * env

    return audio


def write_wav_file(path: str, audio: np.ndarray, sr: int = 16000) -> str:
    """Write float32 array to 16-bit PCM WAV."""
    sf.write(path, audio, sr, subtype="PCM_16")
    return path


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def synthetic_melody_setup():
    """
    Creates a 4-second synthetic melody with 4 distinct notes:
    C4 (261.63 Hz), E4 (329.63 Hz), G4 (392.00 Hz), C5 (523.25 Hz).
    Persists a reference contour under a unique analysis_id.
    """
    sr = 16000
    duration = 4.0
    notes = [
        (261.63, 0.0, 1.0),  # C4
        (329.63, 1.0, 2.0),  # E4
        (392.00, 2.0, 3.0),  # G4
        (523.25, 3.0, 4.0),  # C5
    ]
    ref_audio = generate_synthetic_melody_wav(notes, duration, sr)

    segments = [
        SegmentItem(
            start=0.0,
            end=4.0,
            text="Hold the note longer",
            words=[
                WordItem(word="Hold", start=0.0, end=1.0),
                WordItem(word="the", start=1.0, end=2.0),
                WordItem(word="note", start=2.0, end=3.0),
                WordItem(word="longer", start=3.0, end=4.0),
            ],
        )
    ]

    analysis_id = f"test_analysis_{uuid.uuid4().hex[:8]}"
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        ref_path = tmp.name

    write_wav_file(ref_path, ref_audio, sr)
    save_reference_contour(analysis_id, ref_path, segments, has_vocals_stem=True)

    try:
        os.unlink(ref_path)
    except Exception:
        pass

    yield analysis_id, ref_audio, segments, notes

    # Teardown: delete reference contour file
    ref_dir = get_references_dir()
    ref_file = os.path.join(ref_dir, f"{analysis_id}.npz")
    if os.path.exists(ref_file):
        try:
            os.unlink(ref_file)
        except Exception:
            pass


def test_identical_contour_near_100(synthetic_melody_setup):
    """Identical melody singing should score near 100."""
    analysis_id, ref_audio, _, _ = synthetic_melody_setup
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        user_path = tmp.name
    write_wav_file(user_path, ref_audio)

    res = score_singalong_take(analysis_id, user_path, latency_ms_arg="0", key_shift_arg="auto")
    assert res.overall_score >= 88.0, f"Expected high score for identical audio, got {res.overall_score}"
    assert res.grade in ("Great", "Perfect take")
    assert len(res.lines) == 1
    assert not res.lines[0].skipped
    assert res.lines[0].pitch >= 85.0


def test_octave_folding_higher_and_lower(synthetic_melody_setup):
    """Melody sung one octave higher or lower should still score high due to octave folding."""
    analysis_id, _, _, notes = synthetic_melody_setup
    sr = 16000

    # One octave higher (frequencies * 2)
    notes_oct_up = [(freq * 2.0, s, e) for freq, s, e in notes]
    audio_oct_up = generate_synthetic_melody_wav(notes_oct_up, 4.0, sr)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        user_path_up = tmp.name
    write_wav_file(user_path_up, audio_oct_up)

    res_up = score_singalong_take(analysis_id, user_path_up, latency_ms_arg="0", key_shift_arg="off")
    assert res_up.overall_score >= 85.0, f"Octave up should score high, got {res_up.overall_score}"

    # One octave lower (frequencies / 2)
    notes_oct_down = [(freq / 2.0, s, e) for freq, s, e in notes]
    audio_oct_down = generate_synthetic_melody_wav(notes_oct_down, 4.0, sr)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        user_path_down = tmp.name
    write_wav_file(user_path_down, audio_oct_down)

    res_down = score_singalong_take(analysis_id, user_path_down, latency_ms_arg="0", key_shift_arg="off")
    assert res_down.overall_score >= 85.0, f"Octave down should score high, got {res_down.overall_score}"


def test_transposition_by_3_semitones(synthetic_melody_setup):
    """Melody transposed by +3 semitones scores high with key_shift near +3 when key_shift='auto'."""
    analysis_id, _, _, notes = synthetic_melody_setup
    sr = 16000

    shift_ratio = 2.0 ** (3.0 / 12.0)  # +3 semitones
    notes_transposed = [(freq * shift_ratio, s, e) for freq, s, e in notes]
    audio_transposed = generate_synthetic_melody_wav(notes_transposed, 4.0, sr)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        user_path = tmp.name
    write_wav_file(user_path, audio_transposed)

    res = score_singalong_take(analysis_id, user_path, latency_ms_arg="0", key_shift_arg="auto")
    assert res.overall_score >= 85.0, f"Transposed take should score high with auto shift, got {res.overall_score}"
    assert 2.4 <= res.key_shift_semitones <= 3.6, f"Expected key shift near +3, got {res.key_shift_semitones}"


def test_off_by_one_semitone_key_shift_off(synthetic_melody_setup):
    """Melody off by a constant 1 semitone (100 cents) with key_shift='off' scores noticeably lower."""
    analysis_id, _, _, notes = synthetic_melody_setup
    sr = 16000

    shift_ratio = 2.0 ** (1.0 / 12.0)  # +1 semitone = +100 cents
    notes_off = [(freq * shift_ratio, s, e) for freq, s, e in notes]
    audio_off = generate_synthetic_melody_wav(notes_off, 4.0, sr)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        user_path = tmp.name
    write_wav_file(user_path, audio_off)

    res_off = score_singalong_take(analysis_id, user_path, latency_ms_arg="0", key_shift_arg="off")
    # Tolerance is 75 cents; at 100 cents error, linear falloff is (200-100)/(200-75) = 80.0%
    # Pitch score should be penalized to ~80% (noticeably lower than 100%)
    assert res_off.lines[0].pitch <= 82.0, f"Pitch score should be noticeably lower with key_shift off, got {res_off.lines[0].pitch}"
    assert res_off.overall_score <= 91.0, f"Overall score should be noticeably lower with key_shift off, got {res_off.overall_score}"


def test_random_noise_low_score_and_warning(synthetic_melody_setup):
    """Random white noise should produce a low score and trigger warnings."""
    analysis_id, _, _, _ = synthetic_melody_setup
    sr = 16000
    noise = np.random.uniform(-0.15, 0.15, size=sr * 4).astype(np.float32)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        user_path = tmp.name
    write_wav_file(user_path, noise)

    res = score_singalong_take(analysis_id, user_path, latency_ms_arg="0", key_shift_arg="auto")
    assert res.overall_score <= 45.0, f"Expected low score for noise, got {res.overall_score}"
    assert len(res.warnings) > 0


def test_silence_near_zero_and_warning(synthetic_melody_setup):
    """Silence should produce a near-zero score with 'very little singing detected' warning."""
    analysis_id, _, _, _ = synthetic_melody_setup
    sr = 16000
    silence = np.zeros(sr * 4, dtype=np.float32)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        user_path = tmp.name
    write_wav_file(user_path, silence)

    res = score_singalong_take(analysis_id, user_path, latency_ms_arg="0", key_shift_arg="auto")
    assert res.overall_score <= 15.0, f"Silence should score near zero, got {res.overall_score}"
    assert any("little singing" in w.lower() for w in res.warnings)


def test_singing_delayed_by_250ms(synthetic_melody_setup):
    """Delayed singing by ~250 ms should have latency auto-estimated and keep score high."""
    analysis_id, ref_audio, _, _ = synthetic_melody_setup
    sr = 16000

    # Prepend 250 ms (0.25s * 16000 = 4000 samples) of silence
    delay_samples = int(0.250 * sr)
    delayed_audio = np.concatenate([np.zeros(delay_samples, dtype=np.float32), ref_audio])

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        user_path = tmp.name
    write_wav_file(user_path, delayed_audio)

    res = score_singalong_take(analysis_id, user_path, latency_ms_arg="auto", key_shift_arg="auto")
    # Estimated offset should be positive around 250 ms (+/- 100 ms)
    assert 150.0 <= res.estimated_offset_ms <= 350.0, f"Expected ~250ms offset, got {res.estimated_offset_ms}"
    assert res.overall_score >= 75.0, f"Score should stay high after latency compensation, got {res.overall_score}"


def test_unknown_or_expired_analysis_id(client):
    """POST /api/score with unknown analysis_id returns clean 404."""
    sr = 16000
    dummy_audio = np.zeros(sr * 2, dtype=np.float32)
    buf = io.BytesIO()
    sf.write(buf, dummy_audio, sr, format="WAV")
    buf.seek(0)

    response = client.post(
        "/api/score",
        data={"analysis_id": "nonexistent_uuid_12345"},
        files={"file": ("singing.wav", buf, "audio/wav")},
    )
    assert response.status_code == 404
    body = response.json()
    assert "not found" in body["detail"].lower()


def test_temp_files_deleted_on_success_and_failure(synthetic_melody_setup):
    """Verify that temp files are cleaned up immediately on success and on failure."""
    analysis_id, ref_audio, _, _ = synthetic_melody_setup

    # Test success cleanup
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        success_user_path = tmp.name
    write_wav_file(success_user_path, ref_audio)

    assert os.path.exists(success_user_path)
    score_singalong_take(analysis_id, success_user_path)
    # The scoring function guarantees deletion of user_audio_path
    assert not os.path.exists(success_user_path), "User recording temp file should be deleted on success."

    # Test failure cleanup
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        fail_user_path = tmp.name
    write_wav_file(fail_user_path, ref_audio)

    assert os.path.exists(fail_user_path)
    with pytest.raises(Exception):
        score_singalong_take("nonexistent_id_for_failure_test", fail_user_path)
    assert not os.path.exists(fail_user_path), "User recording temp file should be deleted even on failure."


def test_cleanup_old_references(synthetic_melody_setup):
    """Test cleanup_old_references cleans up references older than TTL."""
    analysis_id, _, _, _ = synthetic_melody_setup
    ref_dir = get_references_dir()
    ref_path = os.path.join(ref_dir, f"{analysis_id}.npz")
    assert os.path.exists(ref_path)

    # Set mtime to 48 hours ago
    old_time = os.path.getmtime(ref_path) - (48 * 3600)
    os.utime(ref_path, (old_time, old_time))

    removed = cleanup_old_references(max_age_hours=24.0)
    assert removed >= 1
    assert not os.path.exists(ref_path)
