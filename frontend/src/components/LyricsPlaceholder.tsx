import { Cpu, FileText, Sparkles } from 'lucide-react'
import type { Theme } from '../types'

interface LyricsPlaceholderProps {
  theme: Theme
}

export default function LyricsPlaceholder({ theme }: LyricsPlaceholderProps) {
  const isDark = theme === 'dark'

  return (
    <div
      className="w-full rounded-2xl border p-6 sm:p-8 backdrop-blur-md shadow-sm transition-all text-center flex flex-col items-center justify-center select-none"
      style={{
        backgroundColor: isDark ? 'rgba(45, 23, 12, 0.72)' : 'rgba(253, 252, 232, 0.88)',
        borderColor: isDark ? 'rgba(199, 160, 122, 0.28)' : 'rgba(115, 65, 40, 0.2)',
      }}
    >
      {/* Icon Badge */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border"
        style={{
          backgroundColor: isDark ? 'rgba(115, 65, 40, 0.35)' : 'rgba(226, 206, 177, 0.45)',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.2)',
        }}
      >
        <FileText className="w-6 h-6 text-lion" />
      </div>

      {/* Heading */}
      <h3
        className="font-editorial text-xl sm:text-2xl font-semibold tracking-tight mb-2"
        style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
      >
        Synchronized Lyrics
      </h3>

      {/* Required Exact Copy */}
      <p
        className="text-sm sm:text-base leading-relaxed mb-6 max-w-md"
        style={{ color: isDark ? '#E2CEB1' : '#734128' }}
      >
        Your lyrics will appear here after audio analysis is implemented.
      </p>

      {/* Clearly Disabled Analyze Audio Button (Next Step Feature) */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold opacity-50 cursor-not-allowed border shadow-2xs"
          style={{
            backgroundColor: '#734128',
            color: '#FDFCE8',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
          }}
        >
          <Cpu className="w-4 h-4 text-lion" />
          <span>Analyze Audio</span>
        </button>

        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-tight"
          style={{ color: isDark ? 'rgba(226, 206, 177, 0.7)' : 'rgba(115, 65, 40, 0.75)' }}
        >
          <Sparkles className="w-3 h-3 text-lion" />
          AI Neural Transcription & Alignment scheduled for Step 4
        </span>
      </div>
    </div>
  )
}
