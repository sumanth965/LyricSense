# LyricSense Benchmark Suite

This benchmark tool evaluates lyric transcription accuracy (Word Error Rate via [jiwer](https://github.com/jitsi/jiwer)) and pipeline processing speed (Real-Time Factor, RTFx) across reference audio datasets.

---

## Dataset Format

To benchmark your own song library or test audio, organize your files into an audio directory with matching `.txt` reference lyric files:

```text
my_dataset/
├── song1.mp3          # Audio file (.mp3, .wav, .m4a, .flac, .ogg)
├── song1.txt          # Reference ground-truth lyrics
├── song2.wav
├── song2.txt
└── ...
```

- Each audio file must have a `.txt` file with the exact same base name.
- The reference `.txt` should contain the correct lyrics (spelling and words) as sung.
- Note: Do NOT commit copyrighted audio tracks or lyrics to git. The `backend/benchmark/dataset*/` and `backend/dataset*/` paths are already included in `.gitignore`.

---

## Running the Benchmark

Activate your backend virtual environment:

```bash
cd backend
source .venv/bin/activate
```

### The 3 Core Comparison Commands

#### 1. Baseline: Vocal Separation OFF vs. ON (Impact of Demucs)
Measure how much isolating vocals with Demucs reduces lyric errors compared to feeding raw mixed music:

```bash
# Separation OFF (Raw mixed audio directly to Whisper)
python benchmark/run_benchmark.py --dir /path/to/my_dataset --model small --separate off

# Separation ON (Demucs vocal isolation before Whisper)
python benchmark/run_benchmark.py --dir /path/to/my_dataset --model small --separate on
```

#### 2. Model Size Comparison: `small` vs. `large-v3` (Speed vs. Accuracy Trade-Off)
Measure the accuracy improvement and processing time penalty between the lightweight `small` model and the full `large-v3` model:

```bash
# Small model (Fast, recommended for Mac / CPU)
python benchmark/run_benchmark.py --dir /path/to/my_dataset --model small --separate auto

# Large-v3 model (Maximum accuracy, resource-intensive on CPU)
python benchmark/run_benchmark.py --dir /path/to/my_dataset --model large-v3 --separate auto
```

#### 3. Automatic Detection vs. Forced Separation
Evaluate whether the acoustic pause-energy heuristic accurately identifies music without manual flags:

```bash
python benchmark/run_benchmark.py --dir /path/to/my_dataset --separate auto
```

---

## Output & Results

Every benchmark execution produces:
1. **Per-track metrics**: Track duration, elapsed processing time, Real-Time Factor (RTFx), reference and hypothesis word counts, track Word Error Rate (WER %), and alignment status.
2. **Final Summary Table**: Prints the exact configuration (model, separation mode, VAD, device) alongside average WER and average RTFx.
3. **CSV Export**: Automatically records detailed run data to:
   ```text
   backend/benchmark/results/benchmark_<model>_<separate>_<timestamp>.csv
   ```
   All CSV results in `backend/benchmark/results/` are ignored by git.
