# LyricSense — Local Backend Setup & Architecture

Privacy-focused, 100% local speech-to-text and word-level alignment backend for LyricSense.

- **Engine**: [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (powered by CTranslate2)
- **API Framework**: FastAPI + Uvicorn
- **Audio Processing**: PyAV & FFmpeg
- **Cost & Privacy**: Zero external cloud APIs, zero tracking, zero data persistence.

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

## 2. Quickstart (Windows & VS Code)

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

The API will be available at:
- Swagger Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

---

## 3. Quickstart (macOS & Linux)

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

---

## 4. Configuration Options (`.env`)

| Variable | Default | Description |
|---|---|---|
| `MODEL_SIZE` | `tiny` | Whisper model size (`tiny`, `base`, `small`, `medium`, `large-v3`). |
| `DEVICE` | `cpu` | Inference device (`cpu` or `cuda`). Falls back to `cpu` if CUDA is unavailable. |
| `COMPUTE_TYPE` | `int8` | Quantization type. Use `int8` for fast CPU inference; `float16` for NVIDIA GPUs. |
| `MAX_UPLOAD_SIZE_MB` | `100` | Maximum upload size in megabytes. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed CORS origins for the frontend. |
| `HOST` | `0.0.0.0` | Server host. |
| `PORT` | `8000` | Server port. |
| `MODEL_CACHE_DIR` | `None` | Optional custom folder to store downloaded Whisper model weights. |

---

## 5. Model Sizes & Resource Guide

Faster-whisper automatically downloads the selected model weights on first execution. After the initial download, model execution operates **100% offline** without any network connectivity:

| Model | Weights Size | Recommended RAM | Relative Speed (CPU) | Primary Use Case |
|---|---|---|---|---|
| `tiny` | ~75 MB | 1 GB | ~32x real-time | Fast local CPU testing & rapid iteration |
| `base` | ~145 MB | 1.5 GB | ~16x real-time | Great balance of speed & quality for clear singing |
| `small` | ~480 MB | 2.5 GB | ~6x real-time | Enhanced lyric recognition across accents |
| `medium` | ~1.5 GB | 5 GB | ~2x real-time | High-fidelity transcription for complex acoustics |
| `large-v3` | ~3.1 GB | 10 GB | ~1x real-time | Maximum accuracy, recommended with CUDA GPU |

To switch models, set `MODEL_SIZE=base` in `backend/.env`.

---

## 6. Running Tests

Run the unit and integration test suite:

```bash
cd backend
source .venv/bin/activate  # or .venv\Scripts\Activate.ps1 on Windows
PYTHONPATH=. pytest tests/ -v
```

The test suite covers:
- `/api/health` system and model reporting
- Invalid and unsupported audio uploads
- Empty files and corrupted streams
- Upload size limit enforcement (> 100 MB)
- Guaranteed cleanup of temporary files
- Valid response schema formatting
- Word timestamp validation & non-fabrication
- Real audio transcription and word alignment on live faster-whisper model

---

## 7. Connecting Frontend & Backend

1. In the frontend (`lyricsense/`), create a `.env` file:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```
2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
3. Load an audio track in the workspace and click **Analyze Audio**.
