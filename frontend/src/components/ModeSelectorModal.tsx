import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Mic,
  Music2,
  Repeat,
  X,
} from 'lucide-react'
import type { PracticeMode, Theme } from '../types'

interface ModeSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectMode: (mode: PracticeMode) => void
  theme: Theme
}

const MODES = [
  {
    id: 'sing-along' as PracticeMode,
    title: 'Sing Along',
    subtitle: 'Get real-time scoring',
    description:
      'Record your vocals via microphone with live acoustic scoring, pitch deviation analysis, and line-by-line feedback.',
    icon: Mic,
    accent: '#DC2626', // Red
    badge: 'Popular',
  },
  {
    id: 'practice' as PracticeMode,
    title: 'Practice Mode',
    subtitle: 'Slow down, loop and improve',
    description:
      'Drill challenging lines, repeat difficult phrases on an infinite loop, and adjust playback speed down to 0.75x.',
    icon: Repeat,
    accent: '#C7A07A', // Lion gold
    badge: 'Precision',
  },
  {
    id: 'read' as PracticeMode,
    title: 'Read Mode',
    subtitle: 'Teleprompter for stage or speech',
    description:
      'Distraction-free high-contrast full-screen teleprompter with auto-scroll and stage-ready typography.',
    icon: BookOpen,
    accent: '#2563EB', // Blue
    badge: 'Stage',
  },
  {
    id: 'karaoke' as PracticeMode,
    title: 'Karaoke Mode',
    subtitle: 'Instrumental + lyrics only',
    description:
      'Immersive full-screen singing experience with large lyrics and instrumental backing focus.',
    icon: Music2,
    accent: '#059669', // Emerald
    badge: 'Singing',
  },
]

export default function ModeSelectorModal({
  isOpen,
  onClose,
  onSelectMode,
  theme,
}: ModeSelectorModalProps) {
  const isDark = theme === 'dark'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg rounded-3xl border p-6 sm:p-7 shadow-2xl space-y-6"
            style={{
              backgroundColor: isDark ? '#2D170C' : '#FAF6EE',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
              color: isDark ? '#FDFCE8' : '#391E10',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-lion">
                  Choose Your Mode
                </span>
                <h2 className="font-serif text-2xl font-bold mt-0.5">What do you want to do?</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-dun hover:text-lion hover:bg-dun/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Mode Cards */}
            <div className="space-y-3">
              {MODES.map((mode) => {
                const Icon = mode.icon
                return (
                  <motion.div
                    key={mode.id}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      onSelectMode(mode.id)
                      onClose()
                    }}
                    className="p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 group"
                    style={{
                      backgroundColor: isDark ? 'rgba(43, 22, 12, 0.8)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(226, 206, 177, 0.9)',
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform"
                      style={{
                        backgroundColor: `${mode.accent}20`,
                        color: mode.accent,
                      }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-serif font-bold text-sm sm:text-base group-hover:text-lion transition-colors">
                          {mode.title}
                        </h3>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${mode.accent}15`,
                            color: mode.accent,
                          }}
                        >
                          {mode.badge}
                        </span>
                      </div>
                      <p
                        className="text-xs font-semibold mb-1"
                        style={{ color: isDark ? '#C7A07A' : '#734128' }}
                      >
                        {mode.subtitle}
                      </p>
                      <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: isDark ? 'rgba(226,206,177,0.75)' : '#5C3218' }}
                      >
                        {mode.description}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
