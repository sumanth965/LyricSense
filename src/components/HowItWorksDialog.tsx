import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AudioWaveform,
  CheckCircle2,
  Mic,
  Music,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react'

interface HowItWorksDialogProps {
  isOpen: boolean
  onClose: () => void
  onGetStarted: () => void
  theme: 'dark' | 'light'
}

const STEPS = [
  {
    step: '01',
    title: 'Select or Drop Audio Track',
    description:
      'Upload any standard music file (MP3, WAV, FLAC, M4A). Processing will run entirely on your device via local speech models.',
    icon: Music,
    badge: 'Input',
  },
  {
    step: '02',
    title: 'Neural Speech Recognition',
    description:
      'Local faster-whisper acoustic model extracts vocal lines and transcribes lyrics without sending your audio to external cloud servers.',
    icon: AudioWaveform,
    badge: 'AI Engine',
  },
  {
    step: '03',
    title: 'Word-Level Timestamp Alignment',
    description:
      'Recognized words are synchronized with exact millisecond timestamps, mapping every syllable directly to playback position.',
    icon: Sparkles,
    badge: 'Synchronization',
  },
  {
    step: '04',
    title: 'Teleprompter & Singing Prompter',
    description:
      'Lyrics highlight dynamically in real time during playback, with stage-ready reading adjustments and upcoming microphone tracking.',
    icon: Mic,
    badge: 'Live Prompter',
  },
]

export default function HowItWorksDialog({
  isOpen,
  onClose,
  onGetStarted,
  theme,
}: HowItWorksDialogProps) {
  const isDark = theme === 'dark'

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-it-works-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 sm:p-8 shadow-2xl z-10"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.95)' : 'rgba(253, 252, 232, 0.98)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
              color: isDark ? '#FDFCE8' : '#391E10',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-lion/20">
              <div>
                <span className="text-xs uppercase font-mono tracking-wider text-lion flex items-center gap-1.5 mb-1">
                  <Sliders className="w-3.5 h-3.5" />
                  LyricSense Architecture
                </span>
                <h2
                  id="how-it-works-title"
                  className="text-2xl sm:text-3xl font-editorial font-semibold"
                >
                  How LyricSense Works
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="w-9 h-9 rounded-full flex items-center justify-center border transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: isDark ? 'rgba(57, 30, 16, 0.6)' : 'rgba(226, 206, 177, 0.4)',
                  borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.2)',
                  color: isDark ? '#FDFCE8' : '#391E10',
                }}
              >
                <X className="w-5 h-5 text-lion" />
              </button>
            </div>

            {/* Workflow steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
              {STEPS.map((step) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.step}
                    className="p-4 rounded-2xl border flex flex-col justify-between transition-colors"
                    style={{
                      backgroundColor: isDark ? 'rgba(57, 30, 16, 0.5)' : 'rgba(226, 206, 177, 0.25)',
                      borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(115, 65, 40, 0.15)',
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="w-7 h-7 rounded-lg bg-kobicha/30 border border-lion/30 flex items-center justify-center text-lion font-mono text-xs font-semibold">
                          {step.step}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-lion/15 text-lion border border-lion/25">
                          {step.badge}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-lion shrink-0" />
                        <h3 className="text-sm font-semibold tracking-tight">{step.title}</h3>
                      </div>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: isDark ? '#E2CEB1' : '#734128' }}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Note banner */}
            <div
              className="p-4 rounded-xl border flex items-center gap-3 text-xs mb-6"
              style={{
                backgroundColor: isDark ? 'rgba(115, 65, 40, 0.25)' : 'rgba(226, 206, 177, 0.5)',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.2)',
              }}
            >
              <CheckCircle2 className="w-5 h-5 text-lion shrink-0" />
              <p className="leading-snug">
                <strong>Local AI privacy:</strong> Audio files never leave your system. All neural processing runs on your local machine using faster-whisper.
              </p>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-lion/20">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                style={{ color: isDark ? '#E2CEB1' : '#734128' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onGetStarted()
                }}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{
                  backgroundColor: '#734128',
                  color: '#FDFCE8',
                }}
              >
                Open Workspace
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
