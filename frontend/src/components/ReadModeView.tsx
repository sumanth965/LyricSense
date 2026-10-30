import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react'
import type { Theme, TranscriptionResponse } from '../types'
import { formatTime } from '../hooks/useAudioPlayer'

interface ReadModeViewProps {
  transcription: TranscriptionResponse | null
  currentTime: number
  duration: number
  isPlaying: boolean
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onExitReadMode: () => void
  theme: Theme
}

export default function ReadModeView({
  transcription,
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  onExitReadMode,
  theme: _theme,
}: ReadModeViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeLineRef = useRef<HTMLDivElement | null>(null)
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(2) // 1: large, 2: extra-large, 3: massive stage

  const segments = transcription?.segments || []

  // Find active segment
  const activeIndex = segments.findIndex(
    (seg) => currentTime >= seg.start && currentTime <= seg.end,
  )

  // Autoscroll active line into center
  useEffect(() => {
    if (!autoScroll || !activeLineRef.current || !containerRef.current) return
    const container = containerRef.current
    const element = activeLineRef.current
    const containerTop = container.getBoundingClientRect().top
    const elementTop = element.getBoundingClientRect().top
    const offset = elementTop - containerTop - container.clientHeight / 2 + element.clientHeight / 2

    container.scrollBy({
      top: offset,
      behavior: 'smooth',
    })
  }, [activeIndex, autoScroll])

  return (
    <div className="dark fixed inset-0 z-40 flex flex-col bg-[#1A0C06] text-[#FDFCE8] select-none">
      {/* 1. Minimal Stage Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-lion/15 bg-black/40 backdrop-blur-md">
        <button
          onClick={onExitReadMode}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-dun/30 hover:border-lion text-xs font-semibold text-dun hover:text-lion transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Stage Teleprompter</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-dun/70">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setFontSizeLevel((prev) => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-xs font-bold"
              title="Decrease text size"
            >
              A-
            </button>
            <button
              onClick={() => setFontSizeLevel((prev) => Math.min(3, prev + 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-xs font-bold"
              title="Increase text size"
            >
              A+
            </button>
          </div>

          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              autoScroll ? 'border-lion text-lion bg-lion/15' : 'border-dun/20 text-dun/50'
            }`}
          >
            Auto-Scroll
          </button>
        </div>
      </header>

      {/* 2. Full-Screen Scrolling Teleprompter Body */}
      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 sm:px-16 py-24 space-y-12 text-center scrollbar-none"
      >
        {segments.map((seg, idx) => {
          const isActive = idx === activeIndex
          return (
            <div
              key={`stage-line-${idx}`}
              ref={isActive ? activeLineRef : null}
              onClick={() => onSeek(seg.start)}
              className={`p-6 rounded-3xl transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-lion/20 border border-lion/50 shadow-2xl scale-105'
                  : 'opacity-40 hover:opacity-80'
              }`}
            >
              <p
                className={`font-serif leading-relaxed ${
                  fontSizeLevel === 1
                    ? 'text-2xl sm:text-3xl'
                    : fontSizeLevel === 2
                      ? 'text-3xl sm:text-5xl font-bold'
                      : 'text-4xl sm:text-6xl font-extrabold'
                } ${isActive ? 'text-[#FDFCE8]' : 'text-[#E2CEB1]'}`}
              >
                {seg.text}
              </p>
              {seg.original_text && (
                <p className="text-sm font-serif italic text-lion/80 mt-2">
                  {seg.original_text}
                </p>
              )}
            </div>
          )
        })}
      </main>

      {/* 3. Floating Bottom Stage Transport */}
      <footer className="p-4 flex items-center justify-center gap-4 bg-black/50 backdrop-blur-md border-t border-lion/15">
        <button
          onClick={() => onSeek(Math.max(0, currentTime - 5))}
          className="p-3 rounded-full hover:bg-white/10 text-dun transition-colors cursor-pointer"
          title="Back 5s"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={onTogglePlay}
          className="w-14 h-14 rounded-full flex items-center justify-center bg-lion text-bistre shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-0.5" />
          )}
        </button>
      </footer>
    </div>
  )
}
