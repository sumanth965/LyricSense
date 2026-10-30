import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Server,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { BackendHealth, Theme } from '../types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  backendHealth: BackendHealth | null
  theme: Theme
  onToggleTheme: () => void
}

export default function SettingsModal({
  isOpen,
  onClose,
  backendHealth,
  theme,
  onToggleTheme,
}: SettingsModalProps) {
  const isDark = theme === 'dark'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative z-10 w-full max-w-lg rounded-3xl border p-6 sm:p-7 shadow-2xl space-y-6"
            style={{
              backgroundColor: isDark ? '#2D170C' : '#FAF6EE',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
              color: isDark ? '#FDFCE8' : '#391E10',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-dun/15 pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold">Studio Settings & Status</h2>
                <p className="text-xs text-dun/70 mt-0.5">Engine configurations and diagnostics</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-dun hover:text-lion hover:bg-dun/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Backend Diagnostics */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-lion flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                Backend Engine Health
              </h3>

              <div
                className="p-4 rounded-2xl border space-y-2 text-xs"
                style={{
                  backgroundColor: isDark ? 'rgba(226, 206, 177, 0.05)' : '#FAF6EE',
                  borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(115, 65, 40, 0.15)',
                }}
              >
                <div className="flex justify-between items-center">
                  <span style={{ color: isDark ? 'rgba(226,206,177,0.85)' : '#734128' }}>FastAPI Service:</span>
                  <span className="font-semibold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {backendHealth?.status || 'Connected'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span style={{ color: isDark ? 'rgba(226,206,177,0.85)' : '#734128' }}>Local Whisper Model:</span>
                  <span
                    className="font-mono font-semibold"
                    style={{ color: isDark ? '#E2CEB1' : '#2D170C' }}
                  >
                    {backendHealth?.model_size || 'base'} ({backendHealth?.device || 'cpu'})
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span style={{ color: isDark ? 'rgba(226,206,177,0.85)' : '#734128' }}>Cloud Groq Acceleration:</span>
                  <span className={`font-semibold ${backendHealth?.groq_available ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {backendHealth?.groq_available ? 'Ready (whisper-large-v3)' : 'Local Only'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span style={{ color: isDark ? 'rgba(226,206,177,0.85)' : '#734128' }}>WhisperX Forced Alignment:</span>
                  <span
                    className="font-semibold"
                    style={{ color: isDark ? '#E2CEB1' : '#2D170C' }}
                  >
                    {backendHealth?.whisperx_available ? 'Active' : 'Native Timestamps'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span style={{ color: isDark ? 'rgba(226,206,177,0.85)' : '#734128' }}>Demucs Vocal Separation:</span>
                  <span
                    className="font-semibold"
                    style={{ color: isDark ? '#E2CEB1' : '#2D170C' }}
                  >
                    {backendHealth?.vocal_separation_available ? 'Available' : 'Optional'}
                  </span>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-lion">
                Appearance
              </h3>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-dun/5 border border-dun/15 text-xs">
                <span>Theme Mode</span>
                <button
                  onClick={onToggleTheme}
                  className="px-3 py-1.5 rounded-xl border border-dun/30 hover:border-lion text-xs font-semibold text-dun hover:text-lion transition-colors cursor-pointer"
                >
                  Switch to {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
                </button>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                LyricSense does not save microphone recordings to disk or cloud servers. All takes
                are scored in-memory and deleted immediately after grading.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
