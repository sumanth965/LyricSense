import { motion } from 'framer-motion'
import {
  ArrowLeft,
  AudioWaveform,
  CheckCircle2,
  FolderOpen,
  Music2,
  Sparkles,
  UploadCloud,
} from 'lucide-react'

interface WorkspacePlaceholderProps {
  onBack: () => void
  theme: 'dark' | 'light'
}

export default function WorkspacePlaceholder({ onBack, theme }: WorkspacePlaceholderProps) {
  const isDark = theme === 'dark'

  return (
    <div
      className="min-h-screen flex flex-col justify-between p-4 sm:p-8"
      style={{
        backgroundColor: isDark ? '#391E10' : '#FDFCE8',
        color: isDark ? '#FDFCE8' : '#391E10',
      }}
    >
      {/* Top Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between pb-6 border-b border-lion/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-kobicha/40 border border-lion/30 flex items-center justify-center text-lion">
            <AudioWaveform className="w-5 h-5 text-lion" />
          </div>
          <div>
            <span className="font-editorial text-xl font-semibold tracking-tight">
              LyricSense
            </span>
            <span className="block text-[11px] font-mono uppercase text-lion tracking-wider">
              Workspace Environment
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-transform hover:scale-102 active:scale-98 cursor-pointer"
          style={{
            backgroundColor: isDark ? 'rgba(57, 30, 16, 0.6)' : 'rgba(226, 206, 177, 0.4)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
            color: isDark ? '#FDFCE8' : '#391E10',
          }}
        >
          <ArrowLeft className="w-4 h-4 text-lion" />
          Back to Home
        </button>
      </header>

      {/* Main Workspace Notice Card */}
      <main className="w-full max-w-3xl mx-auto my-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border p-8 sm:p-12 shadow-xl backdrop-blur-md relative overflow-hidden"
          style={{
            backgroundColor: isDark ? 'rgba(45, 23, 12, 0.85)' : 'rgba(253, 252, 232, 0.95)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
          }}
        >
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase text-lion bg-lion/15 border border-lion/30 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-lion" />
            Step 2 Workspace Route
          </div>

          <h1 className="text-3xl sm:text-4xl font-editorial font-semibold tracking-tight mb-4">
            Your music starts here.
          </h1>

          <p
            className="text-sm sm:text-base leading-relaxed mb-8 max-w-xl"
            style={{ color: isDark ? '#E2CEB1' : '#734128' }}
          >
            The foundation and cinematic homepage are ready. In the upcoming implementation step,
            this workspace will feature drag-and-drop audio uploading, local faster-whisper transcription,
            and the live word-level synchronized teleprompter engine.
          </p>

          {/* Placeholder Upload Dropzone Box (Clearly labeled as upcoming) */}
          <div
            className="rounded-2xl border-2 border-dashed p-8 sm:p-10 flex flex-col items-center justify-center text-center transition-colors mb-8"
            style={{
              borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.3)',
              backgroundColor: isDark ? 'rgba(57, 30, 16, 0.4)' : 'rgba(226, 206, 177, 0.2)',
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-kobicha/30 border border-lion/30 flex items-center justify-center text-lion mb-4">
              <UploadCloud className="w-7 h-7 text-lion" />
            </div>
            <h2 className="text-base font-semibold mb-1">
              Audio Ingestion Pipeline
            </h2>
            <p
              className="text-xs sm:text-sm max-w-md leading-relaxed mb-4"
              style={{ color: isDark ? '#E2CEB1' : '#734128' }}
            >
              Supported in next phase: MP3, WAV, FLAC, M4A with client-side HTML5 Audio API decoding
              and local FastAPI AI service connection.
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-lion/15 text-lion border border-lion/30">
              <FolderOpen className="w-3.5 h-3.5" />
              File Uploader Scheduled for Step 3
            </span>
          </div>

          {/* Status checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-lion/20 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-lion shrink-0" />
              <span>Step 1: Environment & tokens established</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-lion shrink-0" />
              <span>Step 2: Homepage & music carousel active</span>
            </div>
            <div className="flex items-center gap-2 opacity-65">
              <span className="w-4 h-4 rounded-full border border-lion/40 flex items-center justify-center text-[10px] text-lion">
                3
              </span>
              <span>Step 3: Audio upload & HTML5 audio player</span>
            </div>
            <div className="flex items-center gap-2 opacity-65">
              <span className="w-4 h-4 rounded-full border border-lion/40 flex items-center justify-center text-[10px] text-lion">
                4
              </span>
              <span>Step 4: AI transcription & word synchronization</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto flex items-center justify-between pt-6 border-t border-lion/20 text-xs text-lion/75">
        <div className="flex items-center gap-2">
          <Music2 className="w-3.5 h-3.5" />
          <span>LyricSense AI Teleprompter</span>
        </div>
        <span>Private & Local First</span>
      </footer>
    </div>
  )
}
