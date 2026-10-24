# LyricSense — Backend Setup & Architecture

Privacy-focused speech-to-text and word-level alignment backend for LyricSense. Operates locally by default, with optional Groq cloud acceleration.

- **Transcription Engines**: [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (local CTranslate2) & optional Groq Cloud API (`whisper-large-v3`)
- **Vocal Separation**: [Demucs v4](https://github.com/adefossez/demucs) (`htdemucs` hybrid transformer)
- **Forced Alignment**: [WhisperX](https://github.com/m-bain/whisperX) wav2vec2 phoneme alignment with native timestamp fallback
- **API Framework**: FastAPI + Uvicorn
- **Audio Processing**: PyAV & FFmpeg
- **Cost & Privacy**: Zero external cloud APIs by default. When Groq cloud mode is enabled (`enable_cloud=true` with `GROQ_API_KEY`), preprocessed audio in FLAC format is sent over HTTPS to Groq's API for fast transcription; Demucs vocal separation and WhisperX forced alignment always execute locally on your machine.

---

## Accuracy & Alignment Truths

> **Accuracy depends on the model, the audio, and the language. Run the benchmark on your own songs.**  
> See the [Benchmark Documentation](benchmark/README.md) for full instructions and comparison commands.

- **WhisperX Language Coverage**: Phonemic forced alignment models are available for major languages (e.g. English, Spanish, German, French, Italian, Japanese, Chinese, etc.). For languages without a wav2vec2 model (such as Kannada, Telugu, etc.) or if phoneme alignment fails, the pipeline automatically falls back to native Whisper word timestamps (`alignment_status: "native"` or `"partial"`).
- **Known-Lyrics Sync**: Known-lyrics mode aligns the supplied reference text as-is against the audio track without performing acoustic recognition. If the supplied text has missing or extra words, repeats choruses differently than the recording, or contains mismatched lyrics, alignment can become offset or misaligned.

---

## Recommended Settings

| Hardware Profile | Recommended `MODEL_SIZE` | `DEVICE` | `COMPUTE_TYPE` | Speed Trade-Offs & Expectations |
|---|---|---|---|---|
| **Mac / CPU (No GPU)** | `small` | `cpu` | `int8` | **Recommended default**: Fast turnaround (~4–6x real-time), modest memory (~2.5 GB RAM), solid lyric accuracy across most genres. |
| **Dedicated NVIDIA GPU (CUDA)** | `large-v3` | `cuda` | `float16` | **Maximum accuracy**: Studio-fidelity lyric recognition running ultra-fast (~10–15x real-time on modern GPUs). |
| **Mac / CPU (Speed Insensitive)** | `large-v3` | `cpu` | `int8` | Highest transcription accuracy on CPU, but noticeably slow (~0.8–1.2x real-time; a 3-minute song takes ~3 minutes to process). |

---

## 1. Prerequisites

1. **Python**: Python 3.10, 3.11 (recommended), or 3.12.
2. **FFmpeg**: Required for decoding compressed audio formats (MP3, M4A, AAC, OGG, FLAC).
   - **Windows**: Install via `winget install Gyan.FFmpeg` or download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) and add the `bin` folder to your system `PATH`.
   - **macOS**: `brew install ffmpeg` or download a static build.
   - **Linux**: `sudo apt update && sudo apt install ffmpeg`

Verify FFmpeg in your terminal:
```bash
ffmpeg -version
```

---

## 2. Quickstart (macOS & Linux)

```bash
cd backend

# Create and activate virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy example environment configuration
cp .env.example .env

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- Swagger Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

---

## 3. Quickstart (Windows & VS Code)

Open VS Code in the project root and open a **PowerShell** terminal (`Ctrl + ~`):

```powershell
# 1. Navigate to the backend directory
cd backend

# 2. Create a virtual environment using Python 3.11
py -3.11 -m venv .venv

# 3. Activate the virtual environment
.venv\Scripts\Activate.ps1

# If script execution is restricted on Windows, allow current session:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 4. Install dependencies
pip install -r requirements.txt

# 5. Copy example environment file
cp .env.example .env

# 6. Start the FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 4. Configuration Options (`.env`)

| Variable | Default | Description |
|---|---|---|
| `MODEL_SIZE` | `small` | Whisper model size (`tiny`, `base`, `small`, `medium`, `large-v3`). `large-v3` is most accurate but slow on CPU. |
| `DEVICE` | `cpu` | Inference device (`cpu` or `cuda`). Falls back to `cpu` if CUDA is unavailable. |
| `COMPUTE_TYPE` | `int8` | Quantization type. Use `int8` for fast CPU inference; `float16` for NVIDIA GPUs. |
| `VAD_FILTER` | `false` | Voice Activity Detection filter. Kept `false` by default to avoid clipping sustained singing notes. |
| `SEPARATE_VOCALS_DEFAULT` | `auto` | Vocal separation strategy: `auto` (pause-energy heuristic), `on`, or `off`. |
| `LOW_CONFIDENCE_THRESHOLD` | `0.4` | Confidence threshold below which words are flagged `low_confidence: true`. |
| `ALIGNMENT_METHOD` | `whisperx` | Forced alignment engine: `whisperx` with native fallback. |
| `GROQ_API_KEY` | `""` | Optional Groq Cloud API key for cloud transcription. |
| `MAX_UPLOAD_SIZE_MB` | `500` | Maximum upload size in megabytes. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | Allowed CORS origins for the frontend. |
| `HOST` | `0.0.0.0` | Server host. |
| `PORT` | `8000` | Server port. |
| `MODEL_CACHE_DIR` | `None` | Optional custom folder to store downloaded Whisper model weights. |

---

## 5. Model Sizes & Resource Guide

Faster-whisper automatically downloads the selected model weights on first execution. After the initial download, model execution operates **100% offline**:

| Model | Weights Size | Recommended RAM | Relative Speed (CPU) | Primary Use Case |
|---|---|---|---|---|
| `tiny` | ~75 MB | 1 GB | ~32x real-time | Rapid development & lightweight CI |
| `base` | ~145 MB | 1.5 GB | ~16x real-time | Quick speech checks & local testing |
| `small` | ~480 MB | 2.5 GB | ~6x real-time | **Default for CPU/Mac**: Best balance of speed and lyric quality |
| `medium` | ~1.5 GB | 5 GB | ~2x real-time | High-fidelity transcription for complex acoustics |
| `large-v3` | ~3.1 GB | 10 GB | ~1x real-time | Maximum accuracy, recommended with CUDA GPU |

To switch models, set `MODEL_SIZE=small` in `backend/.env`.

---

## 6. Running Tests

Run the full unit and integration test suite:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. pytest tests/ -v
```

---

## 7. Accuracy Benchmark

Run the benchmark suite against audio and reference lyric files:

```bash
cd backend
source .venv/bin/activate

# Compare separation off vs on
python benchmark/run_benchmark.py --dir /path/to/dataset --model small --separate off
python benchmark/run_benchmark.py --dir /path/to/dataset --model small --separate on

# Compare small vs large-v3
python benchmark/run_benchmark.py --dir /path/to/dataset --model small --separate auto
python benchmark/run_benchmark.py --dir /path/to/dataset --model large-v3 --separate auto
```
