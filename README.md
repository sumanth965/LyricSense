# LyricSense — AI-Powered Lyrics Teleprompter & Word Alignment

<p align="center">
  <strong>A privacy-focused AI-powered audio teleprompter and synchronized lyrics application.</strong><br>
  Word-level timestamp alignment, real-time karaoke tracking, interactive seek-to-word playback, running locally by default with optional cloud acceleration.
</p>

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Recommended Settings](#recommended-settings)
4. [Brand & Design System](#brand--design-system)
5. [Architecture & Project Layout](#architecture--project-layout)
6. [Prerequisites](#prerequisites)
7. [Step-by-Step Setup Guide](#step-by-step-setup-guide)
   - [Backend Setup (FastAPI + faster-whisper)](#backend-setup-fastapi--faster-whisper)
   - [Frontend Setup (React + Vite + TypeScript)](#frontend-setup-react--vite--typescript)
   - [Root Monorepo Commands](#root-monorepo-commands)
8. [Environment Variables Reference](#environment-variables-reference)
9. [Whisper Model Sizes & Hardware Guide](#whisper-model-sizes--hardware-guide)
10. [Accuracy Benchmark Suite](#accuracy-benchmark-suite)
11. [API Specification](#api-specification)
12. [Testing & Quality Assurance](#testing--quality-assurance)
13. [Troubleshooting & FAQs](#troubleshooting--faqs)
14. [License](#license)

---

## Overview

**LyricSense** combines modern audio playback with speech and vocal recognition to generate synchronized lyrics for songs, podcasts, and speech recordings.

Accuracy depends on the model, the audio, and the language. Run the benchmark on your own songs (see [Accuracy Benchmark Suite](#accuracy-benchmark-suite)).

LyricSense is built around an advanced multi-stage processing pipeline:
1. **Vocal Separation (Demucs)**: Automatically detects music vs. speech using an acoustic pause-energy heuristic and isolates vocal tracks via `htdemucs --two-stems=vocals`.
2. **Transcription Engine**: Transcribes audio locally using [`faster-whisper`](https://github.com/SYSTRAN/faster-whisper) (`small` default for Mac/CPU, `large-v3` for GPU or speed-insensitive workflows), or optionally via Groq Cloud API (`whisper-large-v3`) when `GROQ_API_KEY` is configured.
3. **Phonetic Forced Alignment (WhisperX)**: Aligns words against vocal audio using wav2vec2 models with language-specific model caching. Note that phonetic alignment models are not available for every language; when unavailable or if alignment fails, the pipeline seamlessly falls back to native Whisper word timestamps (`alignment_status: "native"` or `"partial"`).
4. **Per-Word Confidence & Editing**: Flags words with confidence below `0.4` (`low_confidence: true`) with subtle dotted underlines and interactive inline editing.
5. **Known-Lyrics Sync**: Allows users to paste ground-truth lyrics to skip acoustic recognition and run pure forced alignment. *Caveat*: Known-lyrics mode aligns the supplied text as-is, so mismatched lyrics, missing words, or repeated choruses that differ from the recording can still misalign.

---

## Key Features

### 🎙️ Audio Playback & Interactive Teleprompter
- **Drag-and-Drop Uploader**: Supports `MP3`, `WAV`, `OGG`, `AAC`, `M4A`, `FLAC`, and `WEBM` audio files up to 500 MB.
- **Waveform Timeline & Seek Controls**: Smooth audio scrubbing, playback speed adjustments (`0.75x`, `1.0x`, `1.25x`, `1.5x`), loop playback, and volume controls.
- **Word-Level Teleprompter**: Highlights active words and lines in real-time as music or speech plays, powered by binary interval search for low-overhead rendering.
- **Interactive Click-to-Seek**: Click on any transcribed word or lyric line to jump the audio player directly to that exact timestamp.
- **Display Customization**: Toggle between font sizes (`Normal`, `Large`, `Huge / Stage`), smooth auto-scroll to keep active lyrics centered, and **Mirror Mode** for hardware teleprompter glass reflection.
- **Manual Lyrics Fallback**: Built-in editor to paste or customize lyrics if automatic transcription is not needed.
- **Built-in Synthesized Audio Demo**: Test full teleprompter playback instantly on fresh clones without uploading a single file.

### 🧠 Speech Recognition & Alignment
- **Local-First with Optional Cloud Acceleration**: Default local inference runs 100% on your machine using `faster-whisper` (CTranslate2) with `int8` CPU quantization or `float16` CUDA GPU acceleration.
- **Privacy & Groq Cloud Mode**: Cloud mode is strictly optional. If enabled (`enable_cloud=true` with `GROQ_API_KEY`), preprocessed audio in FLAC format is sent over HTTPS to Groq's Cloud API for transcription; Demucs vocal separation and WhisperX forced alignment always run locally on your machine. No audio ever leaves your computer unless Groq is explicitly configured.
- **Per-Word Timestamps**: Produces start and end timestamps for every recognized word and sentence segment.
- **Automatic Language Detection**: Identifies speech and singing language automatically across dozens of supported languages.
- **English Alphabet Transliteration**: Automatically converts lyrics from non-Latin scripts (Hindi, Kannada, Japanese, Korean, Tamil, Telugu, Russian, Arabic, etc.) into the Roman/English alphabet, preserving accurate word-level timestamps and original pronunciations without translating.
- **Multi-Stage Progress Tracking**: Live frontend pipeline feedback (`Preparing` ➔ `Transcribing` ➔ `Aligning` ➔ `Rendering` ➔ `Completed`).
- **Resilient Fallback Handling**: Gracefully handles non-speech interludes, acoustic echoes, and instrumental intros without crashing or fabricating timestamps.

---

## Recommended Settings

| Hardware Profile | Recommended `MODEL_SIZE` | `DEVICE` | `COMPUTE_TYPE` | Expected Speed & Trade-Offs |
|---|---|---|---|---|
| **Mac / CPU (No GPU)** | `small` | `cpu` | `int8` | **Recommended default**: Fast turnaround (~4–6x real-time), modest RAM (~2.5 GB), solid lyric accuracy across most genres. |
| **Dedicated NVIDIA GPU (CUDA)** | `large-v3` | `cuda` | `float16` | **Maximum accuracy**: Studio-fidelity lyric recognition running ultra-fast (~10–15x real-time on modern GPUs). |
| **Mac / CPU (Speed Insensitive)** | `large-v3` | `cpu` | `int8` | Highest transcription accuracy on CPU, but noticeably slow (~0.8–1.2x real-time; a 3-minute song takes ~3 minutes to process). |

### 🎨 Visual Polish & Micro-Interactions
- Custom warm ivory and bronze color palette inspired by studio acoustics.
- Responsive design tailored for desktops, stage monitors, and tablets.
- Ambient wave animations, SVG particle canvas, and interactive modal dialogs.
- Instant Light / Dark theme switching with persistent user preferences.

---

## Brand & Design System

LyricSense uses a curated 5-token palette evoking warm studio acoustics and vintage audio equipment:

| Token | Hex Value | Role in UI |
|---|---|---|
| **Bistre** | `#391E10` | Darkest earthy brown; primary text, dark backgrounds, high-contrast surfaces |
| **Kobicha** | `#734128` | Warm brown; secondary text, interactive controls, hover states |
| **Lion** | `#C7A07A` | Golden bronze; primary buttons, active word highlights, borders, progress bars |
| **Dun** | `#E2CEB1` | Warm sand; subtle borders, dividers, disabled states, badges |
| **Ivory** | `#FDFCE8` | Warm cream; primary light background, card surfaces, modal sheets |

---

## Architecture & Project Layout

The repository is organized into distinct, self-contained **frontend** and **backend** directories:

```text
lyricsense/
├── frontend/                          # React + Vite + TypeScript Frontend
│   ├── public/                        # Static assets, hero artwork & icons
│   │   └── microphone-artwork.png     # Studio microphone hero image
│   ├── src/
│   │   ├── components/                # Modular UI components
│   │   │   ├── AudioPlayer.tsx        # Audio playback & waveform controls
│   │   │   ├── AudioTeleprompter.tsx  # Stage teleprompter & karaoke view
│   │   │   ├── AudioUploader.tsx      # Drag-and-drop file upload zone
│   │   │   ├── AudioWorkspace.tsx     # Unified audio processing workspace
│   │   │   ├── LyricsDisplay.tsx      # Synchronized lyric stream & word highlights
│   │   │   ├── Navbar.tsx             # Navigation header & theme switcher
│   │   │   ├── HeroSection.tsx        # Landing hero banner
│   │   │   ├── MusicCarousel.tsx      # Interactive showcase carousel
│   │   │   └── EdgeWaveDecorations.tsx# Ambient flowing audio waves
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useAudioPlayer.ts      # HTML5 Audio controller & seek synchronization
│   │   │   └── useLyricsTranscription.ts # API client & state machine for transcription
│   │   ├── lib/                       # Utilities and helpers
│   │   │   ├── api.ts                 # Type-safe Fetch client for backend API
│   │   │   └── demoAudio.ts           # Web Audio API synthesized demo generator
│   │   ├── types/                     # TypeScript data interfaces
│   │   ├── index.css                  # Tailwind CSS v4 & custom design tokens
│   │   ├── App.tsx                    # Root application component & view router
│   │   └── main.tsx                   # React DOM entrypoint
│   ├── .env.example                   # Frontend environment configuration template
│   ├── index.html                     # HTML5 shell entry
│   ├── package.json                   # Frontend dependencies & npm scripts
│   ├── tsconfig.json                  # TypeScript compiler settings
│   └── vite.config.ts                 # Vite bundler configuration
│
├── backend/                           # Python 3.11 + FastAPI Backend Service
│   ├── app/
│   │   ├── main.py                    # FastAPI application, CORS & endpoint routes
│   │   ├── config.py                  # Pydantic Settings & environment validation
│   │   ├── schemas.py                 # Pydantic request/response validation schemas
│   │   ├── transcription.py           # faster-whisper singleton model loader & service
│   │   └── alignment.py               # Timestamp validation & alignment algorithms
│   ├── tests/                         # Pytest test suite (10 comprehensive tests)
│   │   ├── test_api.py                # Health, limits, upload validation, temp file tests
│   │   ├── test_real_audio.py         # Live faster-whisper real audio inference test
│   │   └── fixtures/                  # Synthetic audio test fixtures
│   ├── requirements.txt               # Pinned Python package dependencies
│   ├── .env.example                   # Backend environment configuration template
│   ├── .env                           # Local environment configuration
│   └── README.md                      # Backend-specific architecture documentation
│
├── package.json                       # Monorepo orchestration scripts
├── .gitignore                         # Git exclusion rules (node_modules, .venv, media)
└── README.md                          # Main project documentation
```

---

## Prerequisites

Before running LyricSense, ensure your development system has:

1. **Node.js**: v18.0.0 or later (v20+ LTS recommended) and `npm`.
2. **Python**: Python 3.10, 3.11 (recommended), or 3.12.
3. **FFmpeg**: Required by PyAV / faster-whisper to decode compressed audio formats (`MP3`, `M4A`, `AAC`, `OGG`, `FLAC`).

### Installing FFmpeg:
- **macOS** (via Homebrew):
  ```bash
  brew install ffmpeg
  ```
- **Windows** (via WinGet or Chocolatey):
  ```powershell
  winget install Gyan.FFmpeg
  ```
  *(Or download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) and add its `bin` directory to your Windows System `PATH`)*.
- **Linux** (Debian/Ubuntu):
  ```bash
  sudo apt update && sudo apt install ffmpeg
  ```

Verify FFmpeg installation:
```bash
ffmpeg -version
```

---

## Step-by-Step Setup Guide

### Backend Setup (FastAPI + faster-whisper)

#### 1. Navigate to the backend directory
```bash
cd backend
```

#### 2. Create and activate a Python virtual environment

- **macOS & Linux**:
  ```bash
  python3.11 -m venv .venv
  source .venv/bin/activate
  ```

- **Windows PowerShell**:
  ```powershell
  py -3.11 -m venv .venv
  .venv\Scripts\Activate.ps1
  ```
  *(If script execution is blocked on Windows, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process` first)*.

#### 3. Install dependencies
```bash
pip install -r requirements.txt
```

#### 4. Configure environment variables
Copy the `.env.example` file:
```bash
cp .env.example .env
```
*(The default configuration uses the `tiny` model running on `cpu` with `int8` quantization, ideal for fast local testing)*.

#### 5. Start the backend development server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend is now live:
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Frontend Setup (React + Vite + TypeScript)

#### 1. Open a new terminal and navigate to `frontend`
```bash
cd frontend
```

#### 2. Install Node dependencies
```bash
npm install
```

#### 3. Set environment variables (Optional)
```bash
cp .env.example .env
```
Default content:
```env
VITE_API_BASE_URL=http://localhost:8000
```

#### 4. Start the Vite development server
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

---

### Root Monorepo Commands

For convenience, you can run all project tasks directly from the repository root:

| Command | Action |
|---|---|
| `npm run dev` | Starts the Vite development server (`npm run dev --prefix frontend`) |
| `npm run build` | Builds the frontend production bundle (`tsc -b && vite build`) |
| `npm run preview` | Previews the production build locally |
| `npm run test:backend` | Runs the full 10-test Python backend test suite |

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `MODEL_SIZE` | `large-v3` | Default Whisper model (`large-v3` with int8 on CPU or float16 on CUDA). Supports `tiny`, `base`, `small`, `medium`. |
| `DEVICE` | `cpu` | Inference hardware: `cpu` or `cuda`. Falls back to `cpu` automatically if GPU unavailable. |
| `COMPUTE_TYPE` | `int8` | Precision: `int8` for fast CPU; `float16` for NVIDIA CUDA. |
| `VAD_FILTER` | `false` | Voice Activity Detection filter. Kept `false` by default to avoid clipping sustained singing notes. |
| `SEPARATE_VOCALS_DEFAULT` | `auto` | Default Demucs vocal separation strategy: `auto` (acoustic pause energy heuristic), `on`, or `off`. |
| `LOW_CONFIDENCE_THRESHOLD` | `0.4` | Confidence probability cutoff below which words are marked `low_confidence: true`. |
| `ALIGNMENT_METHOD` | `whisperx` | Forced alignment engine: `whisperx` (phoneme alignment with native fallback). |
| `GROQ_API_KEY` | `""` | Optional Groq Cloud API key for ultra-fast cloud transcription fallback/acceleration. |
| `MAX_UPLOAD_SIZE_MB` | `500` | Maximum audio upload file size allowed in megabytes. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-delimited list of permitted CORS frontend origins. |
| `HOST` | `0.0.0.0` | Bind host address. |
| `PORT` | `8000` | Bind port number. |
| `MODEL_CACHE_DIR` | `None` | Optional custom path for storing downloaded model weights. |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Base URL of the FastAPI backend service. |

---

## Whisper Model Sizes & Hardware Guide

When `faster-whisper` runs for the first time with a chosen model, it downloads the model weights from HuggingFace to your local cache (`~/.cache/huggingface/hub`). Subsequent runs operate **100% offline**:

| Model | Download Size | RAM Needed | Speed (CPU) | Best For |
|---|---|---|---|---|
| **`tiny`** | ~75 MB | 1 GB | ~32x real-time | Rapid development, unit tests, lightweight CI |
| **`base`** | ~145 MB | 1.5 GB | ~16x real-time | Fast local speech verification |
| **`small`** | ~480 MB | 2.5 GB | ~6x real-time | Good balance of speed and singing lyric accuracy |
| **`medium`** | ~1.5 GB | 5 GB | ~2x real-time | Multi-instrumental and accented speech |
| **`large-v3`** | ~3.1 GB | 10 GB | ~1x real-time | **Default**: Studio-grade transcription and lyrics fidelity |

---

## API Specification

### 1. Health & Status
- **Method**: `GET`
- **Route**: `/api/health`
- **Response**:
```json
{
  "status": "healthy",
  "model_size": "large-v3",
  "device": "cpu",
  "compute_type": "int8",
  "model_loaded": true,
  "ffmpeg_available": true,
  "alignment_available": true,
  "demucs_available": true,
  "groq_available": false
}
```

### 2. Audio Transcription & Word Alignment
- **Method**: `POST`
- **Route**: `/api/transcribe`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file`: Audio file (`.mp3`, `.wav`, `.ogg`, `.aac`, `.m4a`, `.flac`, `.webm`).
  - `language` *(optional)*: 2-letter ISO language code (e.g., `en`, `hi`, `kn`, `ja`). Leave blank for auto-detection.
  - `separate_vocals` *(optional)*: Vocal separation mode: `"auto"`, `"on"`, or `"off"` (default: `"auto"`).
  - `lyrics` *(optional)*: Plain text lyrics for known-lyrics forced alignment mode (skips recognition and directly aligns words).
  - `enable_vocal_separation` *(optional, backward-compatible)*: Boolean flag.
  - `enable_cloud` *(optional)*: Enable Groq cloud acceleration if API key is present.
- **Success Response (200 OK)**:
```json
{
  "status": "completed",
  "filename": "song.mp3",
  "language": "en",
  "duration": 42.5,
  "transcript": "Hello world welcome to LyricSense",
  "segments": [
    {
      "start": 0.52,
      "end": 2.18,
      "text": "Hello world",
      "words": [
        {
          "word": "Hello",
          "start": 0.52,
          "end": 1.10,
          "probability": 0.98,
          "low_confidence": false
        },
        {
          "word": "world",
          "start": 1.15,
          "end": 2.18,
          "probability": 0.35,
          "low_confidence": true
        }
      ]
    }
  ],
  "alignment_status": "completed",
  "music_detected": true,
  "vocal_separation_used": true,
  "separation_status": "completed",
  "known_lyrics_used": false,
  "warnings": []
}
```

---

## Accuracy Benchmark Suite

Accuracy depends on the model, the audio, and the language. Run the benchmark on your own songs. See the [Benchmark Guide](backend/benchmark/README.md) for full instructions, dataset formatting, and comparison workflows.

A benchmark runner is provided in `backend/benchmark/run_benchmark.py` to evaluate transcription accuracy (Word Error Rate via [jiwer](https://github.com/jitsi/jiwer)) and speed (Real-Time Factor, RTFx) across reference audio datasets with `.txt` lyrics.

### Running Benchmarks

```bash
# Run benchmark on sample fixtures
python backend/benchmark/run_benchmark.py \
  --audio-dir backend/tests/fixtures \
  --lyrics-dir backend/benchmark/fixtures \
  --model tiny

# Compare options: toggle vocal separation, VAD filter, or Whisper model
python backend/benchmark/run_benchmark.py \
  --audio-dir /path/to/songs \
  --lyrics-dir /path/to/transcripts \
  --separate on \
  --vad off \
  --model large-v3

# View all CLI options
python backend/benchmark/run_benchmark.py --help
```

### Benchmark Metrics Output

The script outputs a formatted table comparing:
- **Audio File**: Name of the test track.
- **Reference Words**: Word count in reference ground-truth text.
- **Hypothesis Words**: Word count produced by the pipeline.
- **WER (Word Error Rate)**: Normalized word-level transcription error ($S + D + I) / N$.
- **Elapsed Time**: Total pipeline runtime including preprocessing, separation, and alignment.
- **RTFx (Real-Time Factor)**: Audio duration / processing time (>1.0 indicates faster than real-time playback).

---

## Testing & Quality Assurance

LyricSense is covered by both frontend build validations and a 10-test Python backend test suite:

### Backend Test Suite
```bash
npm run test:backend
# or from backend/: PYTHONPATH=. .venv/bin/pytest tests/ -v
```

The test suite validates:
1. `test_health_endpoint`: Verifies `/api/health` reports status, hardware device, model size, and FFmpeg presence.
2. `test_invalid_extension`: Ensures non-audio files (e.g. `.txt`, `.exe`) return `400 Bad Request`.
3. `test_empty_audio_upload`: Validates 0-byte audio uploads are rejected gracefully.
4. `test_corrupted_audio_file`: Verifies corrupted audio bytes return a friendly error message instead of an unhandled exception.
5. `test_oversized_upload`: Rejects uploads exceeding `MAX_UPLOAD_SIZE_MB` with `413 Payload Too Large`.
6. `test_valid_transcription_structure`: Validates JSON schema formatting, segments, and word fields.
7. `test_word_timestamp_validation`: Ensures generated word timestamps are chronologically valid ($start \le end$).
8. `test_missing_alignment_handling`: Graceful fallback behavior when audio segments have no word timestamps.
9. `test_temp_file_cleanup_on_failure`: Confirms temporary files on disk are cleaned up even if transcription encounters an error.
10. `test_real_audio_transcription_and_word_alignment`: End-to-end integration test transcribing actual speech through `faster-whisper`.

### Frontend Build Validation
```bash
npm run build
# or from frontend/: npm run build
```
Executes TypeScript type checking (`tsc -b`) and Vite production bundle compilation.

---

## Troubleshooting & FAQs

#### Q: "Network error connecting to local transcription service at http://localhost:8000"
- Verify the backend server is running in its terminal: `uvicorn app.main:app --reload --port 8000`.
- Verify the health check at [http://localhost:8000/api/health](http://localhost:8000/api/health).
- LyricSense includes permissive local regex CORS (`r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"`) so any local frontend port (5173, 5174, 5175, 3000) is automatically accepted.

#### Q: "FFmpeg not found" error during transcription
- Ensure FFmpeg is installed and added to your system `PATH`.
- In a terminal, run `ffmpeg -version`. If it is not recognized, follow the [FFmpeg Installation Guide](#prerequisites) and restart your terminal.

#### Q: The first audio transcription is taking longer than expected
- On the very first run, `faster-whisper` downloads the selected model weights (e.g., ~75 MB for `tiny`). Once downloaded, subsequent transcriptions run entirely offline and start immediately.

#### Q: Can I run this on a GPU?
- Yes. If you have an NVIDIA GPU with CUDA installed, edit `backend/.env`:
  ```env
  DEVICE=cuda
  COMPUTE_TYPE=float16
  ```

---

## License

This project is licensed under the MIT License.
