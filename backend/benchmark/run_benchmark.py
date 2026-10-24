#!/usr/bin/env python3
"""
LyricSense Accuracy & Performance Benchmark Script
Evaluates lyric transcription accuracy (WER via jiwer) and execution time across a directory
of audio files with matching .txt reference lyric transcripts.

Usage:
    python benchmark/run_benchmark.py --dir /path/to/test_dataset
    python benchmark/run_benchmark.py --dir ./tests/fixtures --model tiny --separate off --vad off
"""

import argparse
import csv
from datetime import datetime
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import jiwer
from app.config import settings
from app.transcription import transcribe_audio_file, get_audio_duration_seconds


SUPPORTED_AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"}


def find_benchmark_pairs(audio_dir: str, lyrics_dir: Optional[str] = None) -> List[Dict[str, str]]:
    """
    Scans directory for audio files that have a matching .txt reference lyric file.
    Looks for matching .txt either in lyrics_dir or in the same audio_dir.
    """
    pairs = []
    audio_p = Path(audio_dir)
    lyrics_p = Path(lyrics_dir) if lyrics_dir else audio_p

    if not audio_p.is_dir():
        return pairs

    for entry in sorted(audio_p.iterdir()):
        if entry.is_file() and entry.suffix.lower() in SUPPORTED_AUDIO_EXTS:
            txt_path = lyrics_p / f"{entry.stem}.txt"
            if not txt_path.is_file():
                txt_path = entry.with_suffix(".txt")

            if txt_path.is_file():
                pairs.append({
                    "audio": str(entry),
                    "reference": str(txt_path),
                    "stem": entry.stem,
                    "filename": entry.name,
                })
    return pairs


def run_benchmark(
    audio_dir: str,
    lyrics_dir: Optional[str] = None,
    separate: str = "auto",
    vad: str = "off",
    model_size: Optional[str] = None,
    enable_cloud: bool = False,
):
    pairs = find_benchmark_pairs(audio_dir, lyrics_dir)
    if not pairs:
        print(f"\n[!] No matching audio + .txt lyric pairs found in audio dir: '{audio_dir}'")
        print("    Ensure your dataset contains pairs like 'track1.wav' and 'track1.txt'.")
        return

    # Apply configuration overrides
    vad_bool = (vad.lower() == "on")
    settings.vad_filter = vad_bool
    if model_size:
        settings.model_size = model_size

    print("\n" + "=" * 80)
    print("LyricSense Transcription & Accuracy Benchmark")
    print("=" * 80)
    print(f" Dataset Directory : {audio_dir}")
    print(f" Benchmark Pairs   : {len(pairs)} file(s)")
    print(f" Whisper Model     : {settings.model_size}")
    print(f" Vocal Separation  : {separate}")
    print(f" VAD Filter        : {vad_bool}")
    print(f" Cloud Engine      : {'Enabled (Groq)' if enable_cloud else 'Disabled (Local offline)'}")
    print("=" * 80)

    results = []
    all_refs = []
    all_hyps = []
    total_audio_duration = 0.0
    total_processing_time = 0.0

    print(f"\n{'#':<3} {'Filename':<28} {'Dur (s)':<9} {'Proc (s)':<10} {'RTFx':<8} {'Ref':<6} {'Hyp':<6} {'WER (%)':<9} {'Status'}")
    print("-" * 95)

    for idx, item in enumerate(pairs, 1):
        audio_path = item["audio"]
        ref_path = item["reference"]
        filename = item["filename"]

        # Read reference text
        with open(ref_path, "r", encoding="utf-8", errors="ignore") as f:
            ref_text = f.read().strip()

        audio_dur = get_audio_duration_seconds(audio_path) or 0.0
        total_audio_duration += audio_dur

        # Measure wall-clock processing time
        t0 = time.perf_counter()
        try:
            resp = transcribe_audio_file(
                file_path=audio_path,
                original_filename=filename,
                enable_cloud=enable_cloud,
                separate_vocals=separate,
            )
            elapsed = time.perf_counter() - t0
            total_processing_time += elapsed

            hyp_text = resp.transcript.strip()
            all_refs.append(ref_text)
            all_hyps.append(hyp_text)

            # Compute WER via jiwer
            file_wer = jiwer.wer(ref_text, hyp_text) if ref_text else (0.0 if not hyp_text else 1.0)
            wer_pct = file_wer * 100.0

            rtfx = round(audio_dur / elapsed, 2) if elapsed > 0 and audio_dur > 0 else 0.0
            ref_words = len(ref_text.split())
            hyp_words = len(hyp_text.split())

            short_name = filename if len(filename) <= 27 else filename[:24] + "..."
            print(
                f"{idx:<3} {short_name:<28} {audio_dur:<9.1f} {elapsed:<10.2f} {rtfx:<8.2f} "
                f"{ref_words:<6} {hyp_words:<6} {wer_pct:<9.1f} {resp.alignment_status}"
            )

            results.append({
                "filename": filename,
                "audio_dur": audio_dur,
                "elapsed": elapsed,
                "rtfx": rtfx,
                "ref_words": ref_words,
                "hyp_words": hyp_words,
                "wer": wer_pct,
                "status": resp.alignment_status,
            })

        except Exception as e:
            elapsed = time.perf_counter() - t0
            print(f"{idx:<3} {filename[:27]:<28} {audio_dur:<9.1f} {elapsed:<10.2f} {'ERR':<8} {'-':<6} {'-':<6} {'ERR':<9} FAILED ({e})")

    # Overall Corpus WER calculation
    overall_wer = jiwer.wer(all_refs, all_hyps) * 100.0 if all_refs else 0.0
    overall_rtfx = round(total_audio_duration / total_processing_time, 2) if total_processing_time > 0 else 0.0

    print("-" * 95)
    print("\n" + "=" * 80)
    print("FINAL BENCHMARK SUMMARY TABLE")
    print("=" * 80)
    print(f"{'Configuration':<30} | {'Value'}")
    print("-" * 80)
    print(f"{'Whisper Model Size':<30} | {settings.model_size}")
    print(f"{'Vocal Separation (Demucs)':<30} | {separate}")
    print(f"{'Voice Activity Detection (VAD)':<30} | {vad_bool}")
    print(f"{'Inference Device':<30} | {settings.device}")
    print(f"{'Compute Precision':<30} | {settings.compute_type}")
    print(f"{'Alignment Method':<30} | {settings.alignment_method}")
    print(f"{'Cloud Engine (Groq)':<30} | {'Enabled' if enable_cloud else 'Disabled (Local)'}")
    print("-" * 80)
    print(f"{'Total Evaluated Tracks':<30} | {len(results)} / {len(pairs)}")
    print(f"{'Total Audio Duration':<30} | {total_audio_duration:.2f} s ({total_audio_duration / 60.0:.1f} min)")
    print(f"{'Total Processing Time':<30} | {total_processing_time:.2f} s")
    print(f"{'Average RTFx (Speed)':<30} | {overall_rtfx:.2f}x real-time")
    print(f"{'Average WER':<30} | {overall_wer:.2f}% (Accuracy: {100.0 - overall_wer:.2f}%)")
    print("=" * 80)

    # Save results to CSV in backend/benchmark/results/
    results_dir = Path(__file__).resolve().parent / "results"
    results_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"benchmark_{settings.model_size}_{separate}_{timestamp}.csv"
    csv_path = results_dir / csv_filename

    fieldnames = [
        "filename",
        "audio_dur_sec",
        "elapsed_sec",
        "rtfx",
        "ref_words",
        "hyp_words",
        "wer_pct",
        "alignment_status",
        "model_size",
        "vocal_separation",
        "vad_filter",
        "device",
    ]

    try:
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in results:
                writer.writerow({
                    "filename": r["filename"],
                    "audio_dur_sec": r["audio_dur"],
                    "elapsed_sec": round(r["elapsed"], 2),
                    "rtfx": r["rtfx"],
                    "ref_words": r["ref_words"],
                    "hyp_words": r["hyp_words"],
                    "wer_pct": round(r["wer"], 2),
                    "alignment_status": r["status"],
                    "model_size": settings.model_size,
                    "vocal_separation": separate,
                    "vad_filter": vad_bool,
                    "device": settings.device,
                })
        print(f"\n[+] Detailed benchmark results saved to CSV:\n    {csv_path}\n")
    except Exception as e:
        print(f"\n[!] Warning: Failed to save benchmark CSV: {e}\n")


def main():
    parser = argparse.ArgumentParser(
        description="LyricSense Audio Accuracy & Benchmark Runner",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--dir", "-d",
        type=str,
        default="./tests/fixtures",
        help="Directory containing pairs of audio files and matching .txt lyric files.",
    )
    parser.add_argument(
        "--audio-dir",
        type=str,
        default=None,
        help="Directory containing audio files (optional override for --dir).",
    )
    parser.add_argument(
        "--lyrics-dir",
        type=str,
        default=None,
        help="Directory containing matching reference .txt lyric files.",
    )
    parser.add_argument(
        "--separate",
        choices=["on", "off", "auto"],
        default="auto",
        help="Demucs vocal separation mode.",
    )
    parser.add_argument(
        "--vad",
        choices=["on", "off"],
        default="off",
        help="Voice Activity Detection filter toggle.",
    )
    parser.add_argument(
        "--model", "-m",
        type=str,
        default=None,
        help="faster-whisper model size (tiny, base, small, medium, large-v3).",
    )
    parser.add_argument(
        "--cloud",
        action="store_true",
        help="Enable cloud (Groq) transcription when available.",
    )

    args = parser.parse_args()
    audio_path = args.audio_dir or args.dir
    run_benchmark(
        audio_dir=audio_path,
        lyrics_dir=args.lyrics_dir,
        separate=args.separate,
        vad=args.vad,
        model_size=args.model,
        enable_cloud=args.cloud,
    )


if __name__ == "__main__":
    main()
