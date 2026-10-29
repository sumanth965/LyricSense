"""
LyricSense Sing-Along Scoring Engine.
Extracts reference pitch contours from vocals, auto-estimates latency,
performs transposition-tolerant octave-folded pitch scoring, word onset timing,
and presence evaluation for live sing-along expo demos.
"""

import json
import logging
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import librosa
import numpy as np
import soundfile as sf

from .config import settings
from .schemas import LineScoreItem, ScoreResponse, SegmentItem, WordItem

logger = logging.getLogger("lyricsense.scoring")

# Reference storage directory
DEFAULT_REF_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "data", "references")
)


def get_references_dir() -> str:
    """Return the absolute path to the reference pitch contour directory."""
    ref_dir = settings.reference_data_dir or DEFAULT_REF_DIR
    os.makedirs(ref_dir, exist_ok=True)
    return ref_dir


def cleanup_old_references(max_age_hours: Optional[float] = None) -> int:
    """
    Remove stored reference contour files older than max_age_hours (default from settings).
    Called on backend startup.
    """
    ttl = (
        max_age_hours
        if max_age_hours is not None
        else getattr(settings, "reference_ttl_hours", 24.0)
    )
    max_age_sec = ttl * 3600.0
    now = time.time()
    ref_dir = get_references_dir()
    removed_count = 0

    if not os.path.isdir(ref_dir):
        return 0

    for entry in os.scandir(ref_dir):
        if entry.is_file() and entry.name.endswith(".npz"):
            try:
                mtime = entry.stat().st_mtime
                if now - mtime > max_age_sec:
                    os.unlink(entry.path)
                    removed_count += 1
            except Exception as e:
                logger.warning(f"Error checking/removing old reference {entry.name}: {e}")

    if removed_count > 0:
        logger.info(f"Cleaned up {removed_count} reference contour file(s) older than {ttl}h.")
    return removed_count


def extract_pitch_contour(
    audio_path: str,
    target_sr: int = 16000,
    hop_length: int = 256,
    engine: Optional[str] = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, float]:
    """
    Extract pitch contour (f0 in MIDI, voiced flag, times, and RMS envelope)
    using librosa.pyin (or crepe if configured).

    Parameters:
        audio_path: path to audio file
        target_sr: sampling rate (default 16000 Hz)
        hop_length: hop length in samples (256 = 16 ms, ~62.5 Hz frame rate for 3-4x faster processing)
        engine: 'pyin' or 'crepe'

    Returns:
        times: 1D np.ndarray of frame center timestamps in seconds
        f0_midi: 1D np.ndarray of MIDI pitch floats (np.nan where unvoiced)
        voiced: 1D boolean np.ndarray
        rms_mean: float mean RMS energy
    """
    chosen_engine = (engine or settings.scoring_pitch_engine or "pyin").strip().lower()

    # Load audio as 16 kHz mono float32
    y, sr = librosa.load(audio_path, sr=target_sr, mono=True)
    if len(y) == 0:
        return np.array([]), np.array([]), np.array([], dtype=bool), 0.0

    # Calculate average RMS energy for quietness check
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    rms_mean = float(np.mean(rms)) if len(rms) > 0 else 0.0

    fmin = float(librosa.note_to_hz("C2"))  # ~65.41 Hz
    fmax = float(librosa.note_to_hz("C6"))  # ~1046.50 Hz

    if chosen_engine == "crepe":
        try:
            import torch
            import torchcrepe

            # torchcrepe expects (batch, samples)
            audio_tensor = torch.tensor(y, dtype=torch.float32).unsqueeze(0)
            pitch, periodicity = torchcrepe.predict(
                audio_tensor,
                sr=sr,
                hop_length=hop_length,
                fmin=fmin,
                fmax=fmax,
                model="tiny",
                batch_size=2048,
                device="cpu",
                return_periodicity=True,
            )
            f0_hz = pitch.squeeze(0).numpy()
            periodicity_np = periodicity.squeeze(0).numpy()
            voiced = periodicity_np > 0.4
            f0_midi = np.full_like(f0_hz, np.nan, dtype=np.float32)
            valid_mask = voiced & (f0_hz >= fmin) & (f0_hz <= fmax)
            f0_midi[valid_mask] = librosa.hz_to_midi(f0_hz[valid_mask])
            times = librosa.times_like(f0_hz, sr=sr, hop_length=hop_length)
            return times, f0_midi, voiced, rms_mean
        except Exception as crepe_err:
            logger.warning(
                f"Torchcrepe engine unavailable or failed ({crepe_err}). Falling back to pyin."
            )

    # Default robust engine: librosa.pyin
    # Using resolution=0.25 (quarter-tone) and hop_length=256 reduces state-space 
    # complexity and cuts CPU runtime by ~3x to 4x while keeping pitch scoring accurate.
    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=fmin,
        fmax=fmax,
        sr=sr,
        hop_length=hop_length,
        resolution=0.25,
        fill_na=np.nan,
    )

    f0_midi = np.full_like(f0, np.nan, dtype=np.float32)
    valid_voiced = (voiced_flag == True) & (~np.isnan(f0)) & (f0 > 0)
    if np.any(valid_voiced):
        f0_midi[valid_voiced] = librosa.hz_to_midi(f0[valid_voiced])

    times = librosa.times_like(f0, sr=sr, hop_length=hop_length)
    return times, f0_midi, valid_voiced, rms_mean


def save_reference_contour(
    analysis_id: str,
    audio_path: str,
    segments: List[SegmentItem],
    has_vocals_stem: bool = True,
) -> str:
    """
    Extract reference pitch contour and persist compressed .npz in backend/data/references/{analysis_id}.npz
    along with transcript segments and word timings.
    """
    ref_dir = get_references_dir()
    out_file = os.path.join(ref_dir, f"{analysis_id}.npz")

    times, f0_midi, voiced, rms_mean = extract_pitch_contour(audio_path)

    # Convert segments to JSON string
    segments_dicts = [seg.model_dump() for seg in segments]
    segments_json = json.dumps(segments_dicts)

    np.savez_compressed(
        out_file,
        times=times,
        f0_midi=f0_midi,
        voiced=voiced,
        segments_json=segments_json,
        created_at=time.time(),
        has_vocals_stem=has_vocals_stem,
        rms_mean=rms_mean,
    )
    logger.info(
        f"Saved reference contour for analysis_id={analysis_id}: "
        f"{len(times)} frames, {int(np.sum(voiced))} voiced frames, vocals_isolated={has_vocals_stem}"
    )
    return out_file


def load_reference_contour(analysis_id: str) -> Optional[Dict[str, Any]]:
    """Load reference pitch contour .npz if it exists."""
    ref_dir = get_references_dir()
    out_file = os.path.join(ref_dir, f"{analysis_id}.npz")
    if not os.path.isfile(out_file):
        return None

    try:
        data = np.load(out_file, allow_pickle=True)
        segments_dicts = json.loads(str(data["segments_json"]))
        segments = [SegmentItem(**d) for d in segments_dicts]
        return {
            "times": data["times"],
            "f0_midi": data["f0_midi"],
            "voiced": data["voiced"],
            "segments": segments,
            "created_at": float(data.get("created_at", 0.0)),
            "has_vocals_stem": bool(data.get("has_vocals_stem", True)),
            "rms_mean": float(data.get("rms_mean", 0.0)),
        }
    except Exception as e:
        logger.error(f"Failed to load reference contour for {analysis_id}: {e}")
        return None


def convert_and_preprocess_user_recording(
    input_path: str,
    output_wav_path: str,
    max_duration_sec: int = 360,
) -> Tuple[float, List[str]]:
    """
    Convert browser user recording (webm/opus/wav/m4a) to 16 kHz mono WAV
    using ffmpeg, normalize loudness, and apply a light noise gate.
    Returns (duration_seconds, warnings).
    """
    warnings: List[str] = []

    # First check duration with ffprobe / av
    try:
        import av

        with av.open(input_path) as container:
            if not container.streams.audio:
                raise ValueError("No audio stream found in user recording.")
            audio_stream = container.streams.audio[0]
            if container.duration:
                dur_sec = float(container.duration) / float(av.time_base)
                if dur_sec > max_duration_sec:
                    raise ValueError(
                        f"Recording length ({dur_sec:.1f}s) exceeds the maximum allowed {max_duration_sec}s."
                    )
    except ValueError:
        raise
    except Exception as e:
        logger.warning(f"Container pre-check error (will continue to ffmpeg): {e}")

    # FFmpeg conversion with light noise gate and loudness normalization
    # agate=threshold=0.02:range=0.08:ratio=2 suppresses room ambient noise without clipping quiet singing
    filter_chain = "agate=threshold=0.02:range=0.08:ratio=2,loudnorm=I=-16:TP=-1.5:LRA=11"

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-vn",
        "-af",
        filter_chain,
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        output_wav_path,
    ]

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except subprocess.CalledProcessError:
        # Fallback to plain loudnorm if gate filter is unsupported
        cmd_fallback = [
            "ffmpeg",
            "-y",
            "-i",
            input_path,
            "-vn",
            "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            output_wav_path,
        ]
        res = subprocess.run(cmd_fallback, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    # Get resulting duration
    y, sr = sf.read(output_wav_path)
    dur = float(len(y)) / float(sr)
    if dur > max_duration_sec:
        raise ValueError(
            f"Recording length ({dur:.1f}s) exceeds maximum allowed {max_duration_sec}s."
        )

    return dur, warnings


def estimate_latency_offset_ms(
    ref_voiced: np.ndarray,
    ref_times: np.ndarray,
    user_voiced: np.ndarray,
    user_times: np.ndarray,
    max_search_ms: float = 600.0,
    hop_sec: float = 0.0125,
) -> float:
    """
    Cross-correlate voiced envelopes of user and reference within +/- 600 ms
    to estimate latency time offset in milliseconds.
    Positive offset means user started later than reference (normal latency).
    """
    if len(ref_voiced) == 0 or len(user_voiced) == 0:
        return 0.0

    ref_v = ref_voiced.astype(np.float32)
    user_v = user_voiced.astype(np.float32)

    # If user envelope is shorter, pad with zeros
    min_len = min(len(ref_v), len(user_v))
    if min_len < 10:
        return 0.0

    # Work on common length
    rv = ref_v[:min_len] - np.mean(ref_v[:min_len])
    uv = user_v[:min_len] - np.mean(user_v[:min_len])

    if np.all(rv == 0) or np.all(uv == 0):
        return 0.0

    max_lags = int(round((max_search_ms / 1000.0) / hop_sec))
    corr = np.correlate(uv, rv, mode="full")
    zero_lag_idx = len(rv) - 1

    start_idx = max(0, zero_lag_idx - max_lags)
    end_idx = min(len(corr), zero_lag_idx + max_lags + 1)

    windowed_corr = corr[start_idx:end_idx]
    best_idx = np.argmax(windowed_corr)
    best_lag = (start_idx + best_idx) - zero_lag_idx

    offset_ms = float(best_lag * hop_sec * 1000.0)
    # Clamp within [-max_search_ms, max_search_ms]
    return float(np.clip(offset_ms, -max_search_ms, max_search_ms))


def score_singalong_take(
    analysis_id: str,
    user_audio_path: str,
    latency_ms_arg: Optional[str] = "auto",
    range_start: Optional[float] = None,
    range_end: Optional[float] = None,
    key_shift_arg: Optional[str] = "auto",
) -> ScoreResponse:
    """
    Complete sing-along scoring algorithm:
    1. Load reference pitch contour.
    2. Convert user recording, check quietness/noise.
    3. Extract user pitch contour.
    4. Auto-estimate or apply latency offset.
    5. Transposition-tolerant octave-folded pitch comparison.
    6. Word timing (onset) and presence evaluation.
    7. Per-line and duration-weighted overall score with grade.
    8. 20 Hz downsampled pitch contour arrays for visualization.
    """
    converted_wav_path = None
    try:
        ref_data = load_reference_contour(analysis_id)
        if not ref_data:
            raise FileNotFoundError(f"Analysis contour '{analysis_id}' not found or expired.")

        ref_times: np.ndarray = ref_data["times"]
        ref_f0: np.ndarray = ref_data["f0_midi"]
        ref_voiced: np.ndarray = ref_data["voiced"]
        segments: List[SegmentItem] = ref_data["segments"]
        has_vocals_stem: bool = ref_data["has_vocals_stem"]

        warnings: List[str] = []
        if not has_vocals_stem:
            warnings.append(
                "Reference pitch contour was extracted from the full mix rather than isolated vocals; scoring may be less accurate."
            )

        # 1. Convert user recording to clean 16 kHz mono WAV in temp location
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
            converted_wav_path = tmp_wav.name
        user_duration, conv_warnings = convert_and_preprocess_user_recording(
            user_audio_path,
            converted_wav_path,
            max_duration_sec=settings.scoring_max_recording_seconds,
        )
        warnings.extend(conv_warnings)

        # 2. Extract user pitch contour
        user_times, user_f0, user_voiced, user_rms = extract_pitch_contour(converted_wav_path)

        # Check quiet recording
        if user_rms < 0.005:
            warnings.append(
                "Recording volume is very low. Please sing closer to your microphone or adjust your input level."
            )

        # Check voiced ratio
        total_user_frames = len(user_voiced)
        user_voiced_count = int(np.sum(user_voiced))
        user_voiced_ratio = user_voiced_count / max(1, total_user_frames)

        if user_voiced_ratio < 0.08 or user_voiced_count < 15:
            warnings.append(
                "Very little singing was detected. Please make sure your microphone is working and unmuted."
            )

        # 3. Time bounds
        t_start = max(0.0, float(range_start)) if range_start is not None else 0.0
        t_end = (
            float(range_end)
            if range_end is not None and range_end > t_start
            else float(ref_times[-1]) if len(ref_times) > 0 else user_duration
        )

        # Align reference time slice
        ref_mask = (ref_times >= t_start) & (ref_times <= t_end)
        ref_sub_times = ref_times[ref_mask]
        ref_sub_f0 = ref_f0[ref_mask]
        ref_sub_voiced = ref_voiced[ref_mask]

        if len(ref_sub_times) == 0:
            return ScoreResponse(
                overall_score=0.0,
                grade="Keep going",
                lines=[],
                key_shift_semitones=0.0,
                estimated_offset_ms=0.0,
                warnings=["Selected audio range contains no reference audio."],
            )

        # 4. Latency estimation / offset
        hop_sec = 0.0125
        if len(ref_times) > 1:
            hop_sec = float(ref_times[1] - ref_times[0])

        estimated_offset_ms = 0.0
        if (
            latency_ms_arg is None
            or str(latency_ms_arg).strip().lower() == "auto"
            or not str(latency_ms_arg).strip()
        ):
            # Estimate cross-correlation offset
            estimated_offset_ms = estimate_latency_offset_ms(
                ref_sub_voiced,
                ref_sub_times,
                user_voiced,
                user_times,
                max_search_ms=600.0,
                hop_sec=hop_sec,
            )
            applied_offset_sec = estimated_offset_ms / 1000.0
        else:
            try:
                estimated_offset_ms = float(latency_ms_arg)
                applied_offset_sec = estimated_offset_ms / 1000.0
            except Exception:
                applied_offset_sec = 0.0

        # User timeline mapped to song timeline:
        # recording at t=0 maps to t_start + applied_offset_sec
        # user_times_in_song = user_times - applied_offset_sec + t_start
        user_adjusted_song_times = user_times - applied_offset_sec + t_start

        # 5. Octave-folded transposition tolerance and key shift
        # Match each reference voiced frame to the closest user frame
        user_matched_midi = np.full_like(ref_sub_f0, np.nan, dtype=np.float32)
        user_matched_voiced = np.zeros_like(ref_sub_voiced, dtype=bool)

        if len(user_times) > 0:
            # For each ref timestamp, find closest index in user_adjusted_song_times
            closest_user_indices = np.searchsorted(user_adjusted_song_times, ref_sub_times)
            closest_user_indices = np.clip(closest_user_indices, 0, len(user_times) - 1)

            # Check time proximity (within 1.5 * hop_sec)
            time_diffs = np.abs(user_adjusted_song_times[closest_user_indices] - ref_sub_times)
            valid_time_mask = time_diffs <= (1.5 * hop_sec)

            for i in range(len(ref_sub_times)):
                if valid_time_mask[i]:
                    u_idx = closest_user_indices[i]
                    if user_voiced[u_idx] and not np.isnan(user_f0[u_idx]):
                        user_matched_voiced[i] = True
                        user_matched_midi[i] = user_f0[u_idx]

        # Overlapping voiced frames between reference and user
        overlap_voiced = ref_sub_voiced & user_matched_voiced & (~np.isnan(ref_sub_f0))

        # Check for mic bleed: if correlation between ref full mix and user is high even in silence
        # (hand-rolled simple bleed indicator)
        if np.sum(ref_sub_voiced) > 10 and np.sum(overlap_voiced) / max(1, np.sum(ref_sub_voiced)) > 0.95:
            # Check if user pitch matches reference exact decimals without human vibrato
            exact_matches = np.abs(user_matched_midi[overlap_voiced] - ref_sub_f0[overlap_voiced]) < 0.05
            if np.mean(exact_matches) > 0.90:
                warnings.append(
                    "Microphone bleed suspected: speaker audio may be entering your mic. Use headphones for best results."
                )

        key_shift_semitones = 0.0
        folded_diffs = []

        if np.any(overlap_voiced):
            raw_diffs = user_matched_midi[overlap_voiced] - ref_sub_f0[overlap_voiced]
            # Fold into [-6, +6)
            folded = ((raw_diffs + 6.0) % 12.0) - 6.0
            folded_diffs = folded

            key_mode = str(key_shift_arg).strip().lower() if key_shift_arg else "auto"
            if key_mode == "auto":
                # Robust median key shift
                key_shift_semitones = float(np.median(folded))
            elif key_mode == "off":
                key_shift_semitones = 0.0
            else:
                try:
                    key_shift_semitones = float(key_shift_arg)
                except Exception:
                    key_shift_semitones = 0.0

        # Frame-by-frame pitch scoring
        tol_cents = float(settings.scoring_pitch_tolerance_cents)  # e.g. 75 cents
        falloff_cents = 200.0

        ref_frame_pitch_scores = np.zeros(len(ref_sub_times), dtype=np.float32)

        for i in range(len(ref_sub_times)):
            if not ref_sub_voiced[i]:
                continue
            if not user_matched_voiced[i]:
                ref_frame_pitch_scores[i] = 0.0
                continue

            diff = user_matched_midi[i] - ref_sub_f0[i] - key_shift_semitones
            # Fold octave
            folded_err = ((diff + 6.0) % 12.0) - 6.0
            err_cents = abs(folded_err) * 100.0

            if err_cents <= tol_cents:
                score = 1.0
            elif err_cents <= falloff_cents:
                score = (falloff_cents - err_cents) / max(1.0, (falloff_cents - tol_cents))
            else:
                score = 0.0
            ref_frame_pitch_scores[i] = float(score)

        # 6. Timing (onset) and Presence per word
        weights = settings.parsed_scoring_weights  # [pitch, timing, presence]
        w_pitch, w_timing, w_presence = weights[0], weights[1], weights[2]

        line_items: List[LineScoreItem] = []
        scored_line_durations: List[float] = []
        scored_line_scores: List[float] = []

        # Find user-voiced timestamps in song timeline
        user_voiced_song_times = (
            user_adjusted_song_times[user_voiced] if np.any(user_voiced) else np.array([])
        )

        for idx, seg in enumerate(segments):
            # Check overlap with range
            if seg.end < t_start or seg.start > t_end:
                continue

            seg_start = max(t_start, seg.start)
            seg_end = min(t_end, seg.end)
            seg_dur = max(0.01, seg_end - seg_start)

            # Slices of frames belonging to this segment
            seg_frame_mask = (ref_sub_times >= seg_start) & (ref_sub_times <= seg_end)
            seg_ref_voiced = ref_sub_voiced[seg_frame_mask]

            ref_voiced_count = int(np.sum(seg_ref_voiced))
            total_seg_frames = len(seg_ref_voiced)

            # Skip lines with almost no reference voicing (< 0.1s or < 5% frames)
            if ref_voiced_count < max(2, int(0.05 * total_seg_frames)) or (
                ref_voiced_count * hop_sec < 0.10
            ):
                line_items.append(
                    LineScoreItem(
                        index=idx,
                        start=round(seg.start, 2),
                        end=round(seg.end, 2),
                        text=seg.text,
                        score=0.0,
                        pitch=0.0,
                        timing=0.0,
                        presence=0.0,
                        skipped=True,
                    )
                )
                continue

            # A. Pitch score for segment
            seg_pitch_scores = ref_frame_pitch_scores[seg_frame_mask & ref_sub_voiced]
            line_pitch = (
                float(np.mean(seg_pitch_scores) * 100.0) if len(seg_pitch_scores) > 0 else 0.0
            )

            # B. Timing and Presence per word
            word_onset_scores: List[float] = []
            word_presence_scores: List[float] = []

            words_to_eval = [w for w in seg.words if w.start is not None and w.end is not None]
            if not words_to_eval:
                # If segment has no word breakdown, treat entire segment as one unit
                dummy_word = WordItem(word=seg.text, start=seg_start, end=seg_end)
                words_to_eval = [dummy_word]

            for w in words_to_eval:
                w_start = w.start if w.start is not None else seg_start
                w_end = w.end if w.end is not None else seg_end

                # Onset score: user-voiced frame within +/- 400 ms of word.start
                if len(user_voiced_song_times) > 0:
                    diffs_to_onset = user_voiced_song_times - w_start
                    # Frames within +/- 400 ms
                    valid_onsets = diffs_to_onset[np.abs(diffs_to_onset) <= 0.400]
                    if len(valid_onsets) > 0:
                        # Best onset offset
                        min_err_sec = float(np.min(np.abs(valid_onsets)))
                        err_ms = min_err_sec * 1000.0
                        if err_ms <= 100.0:
                            onset_score = 1.0
                        else:
                            onset_score = max(0.0, (400.0 - err_ms) / 300.0)
                    else:
                        onset_score = 0.0
                else:
                    onset_score = 0.0
                word_onset_scores.append(onset_score)

                # Presence score: fraction of word's ref-voiced frames where user is voiced
                w_frame_mask = (ref_sub_times >= w_start) & (ref_sub_times <= w_end)
                w_ref_voiced = ref_sub_voiced[w_frame_mask]
                w_user_voiced = user_matched_voiced[w_frame_mask]

                ref_v_in_word = int(np.sum(w_ref_voiced))
                if ref_v_in_word > 0:
                    both_v = int(np.sum(w_ref_voiced & w_user_voiced))
                    pres_score = float(both_v / ref_v_in_word)
                else:
                    pres_score = 1.0 if np.any(w_user_voiced) else 0.5
                word_presence_scores.append(pres_score)

            line_timing = (
                float(np.mean(word_onset_scores) * 100.0) if word_onset_scores else 0.0
            )
            line_presence = (
                float(np.mean(word_presence_scores) * 100.0) if word_presence_scores else 0.0
            )

            # Combined line score
            raw_line_score = (
                w_pitch * line_pitch + w_timing * line_timing + w_presence * line_presence
            )
            line_score = round(float(np.clip(raw_line_score, 0.0, 100.0)), 1)

            line_items.append(
                LineScoreItem(
                    index=idx,
                    start=round(seg.start, 2),
                    end=round(seg.end, 2),
                    text=seg.text,
                    score=line_score,
                    pitch=round(line_pitch, 1),
                    timing=round(line_timing, 1),
                    presence=round(line_presence, 1),
                    skipped=False,
                )
            )
            scored_line_durations.append(seg_dur)
            scored_line_scores.append(line_score)

        # Overall score: duration-weighted mean of scored lines
        if scored_line_durations and sum(scored_line_durations) > 0:
            total_dur = sum(scored_line_durations)
            overall_score = float(
                sum(s * d for s, d in zip(scored_line_scores, scored_line_durations)) / total_dur
            )
        else:
            overall_score = 0.0
        overall_score = round(float(np.clip(overall_score, 0.0, 100.0)), 1)

        # Grade assignment
        if overall_score >= 95.0:
            grade = "Perfect take"
        elif overall_score >= 85.0:
            grade = "Great"
        elif overall_score >= 70.0:
            grade = "Good"
        elif overall_score >= 50.0:
            grade = "Nice effort"
        else:
            grade = "Keep going"

        # 8. Downsample contours to ~20 Hz (dt = 0.05s) for UI chart
        chart_sample_hz = 20.0
        dt = 1.0 / chart_sample_hz
        chart_times = np.arange(t_start, t_end + dt / 2.0, dt)

        downsampled_ref: List[Optional[float]] = []
        downsampled_user: List[Optional[float]] = []

        for ct in chart_times:
            # Nearest reference frame
            r_idx = np.searchsorted(ref_sub_times, ct)
            r_idx = min(len(ref_sub_times) - 1, max(0, r_idx))
            if ref_sub_voiced[r_idx] and not np.isnan(ref_sub_f0[r_idx]):
                downsampled_ref.append(round(float(ref_sub_f0[r_idx]), 1))
            else:
                downsampled_ref.append(None)

            # Nearest user frame in song time
            if len(user_adjusted_song_times) > 0:
                u_idx = np.searchsorted(user_adjusted_song_times, ct)
                u_idx = min(len(user_adjusted_song_times) - 1, max(0, u_idx))
                time_dist = abs(user_adjusted_song_times[u_idx] - ct)
                if time_dist <= dt and user_voiced[u_idx] and not np.isnan(user_f0[u_idx]):
                    # Subtract key shift so contours align visually in user's sung key
                    adj_midi = float(user_f0[u_idx]) - float(key_shift_semitones)
                    downsampled_user.append(round(adj_midi, 1))
                else:
                    downsampled_user.append(None)
            else:
                downsampled_user.append(None)

        return ScoreResponse(
            overall_score=overall_score,
            grade=grade,
            lines=line_items,
            key_shift_semitones=round(float(key_shift_semitones), 1),
            estimated_offset_ms=round(float(estimated_offset_ms), 1),
            warnings=warnings,
            reference_contour=downsampled_ref,
            user_contour=downsampled_user,
            contour_sample_rate_hz=chart_sample_hz,
            range_start=round(t_start, 2) if range_start is not None else None,
            range_end=round(t_end, 2) if range_end is not None else None,
        )

    finally:
        # Guarantee deletion of user recording and converted wav on success and failure
        if converted_wav_path and os.path.exists(converted_wav_path):
            try:
                os.unlink(converted_wav_path)
            except Exception:
                pass
        if user_audio_path and os.path.exists(user_audio_path):
            try:
                os.unlink(user_audio_path)
            except Exception:
                pass
