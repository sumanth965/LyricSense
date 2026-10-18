# LyricSense — AI-Powered Lyrics Teleprompter

LyricSense is an AI-powered lyrics teleprompter single-page web application. It enables users to upload music or audio, automatically generate synchronized lyrics/transcripts using local AI, align recognized words with audio timestamps, and highlight words in real time during playback.

> **Status:** Step 1 (Project Initialization and Environment Setup) complete.

---

## Technology Stack

- **Frontend Framework:** React 19
- **Build Tool:** Vite 8
- **Language:** TypeScript 6
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons:** Lucide React (`lucide-react`)
- **Animation:** Motion for React (`framer-motion`)
- **Package Manager:** npm
- **Audio Engine (Future):** HTML5 Audio API
- **AI Backend (Future):** Python + FastAPI with faster-whisper

---

## Design System & Color Tokens

LyricSense uses an Apple-inspired warm, organic 5-color palette:

| Color Token | Hex Code | Intended Role |
|---|---|---|
| **Bistre** | `#391E10` | Primary dark surfaces, navigation, typography |
| **Kobicha** | `#734128` | Primary interactive buttons, selected controls |
| **Lion** | `#C7A07A` | Highlights, audio progress, accent details |
| **Dun** | `#E2CEB1` | Secondary surfaces and subtle panels |
| **Ivory** | `#FDFCE8` | Main background and light contrast text |

Tokens are defined in `src/index.css` via Tailwind CSS v4 `@theme` and CSS custom variables (`--color-bistre`, `--color-kobicha`, `--color-lion`, `--color-dun`, `--color-ivory`).

---

## Project Structure

```text
lyricsense/
├── public/              # Static assets (favicons, SVG icons)
├── src/
│   ├── assets/          # Static media and brand assets
│   ├── components/      # Reusable UI primitives
│   ├── features/        # Feature-based domain modules
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and clients
│   ├── styles/          # Additional style modules
│   ├── types/           # Shared TypeScript interfaces
│   ├── App.tsx          # Initial application welcome view
│   ├── index.css        # Tailwind CSS v4 & design tokens
│   └── main.tsx         # React application entrypoint
├── .gitignore
├── index.html           # Document shell & metadata
├── package.json         # Dependencies & scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite & Tailwind CSS v4 configuration
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm

### Installation

```bash
# 1. Navigate to the project directory
cd lyricsense

# 2. Install dependencies
npm install
```

### Development Server

```bash
npm run dev
```

Visit the local URL shown in your terminal (typically `http://localhost:5173`).

### Production Build

```bash
# Typecheck and build optimized bundle
npm run build

# Preview production build locally
npm run preview
```
