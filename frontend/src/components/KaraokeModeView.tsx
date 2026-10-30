import { useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Mic,
  Music2,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react'
import type { Theme, TranscriptionResponse } from '../types'
import { formatTime } from '../hooks/useAudioPlayer'

interface KaraokeModeViewProps {
  transcription: TranscriptionResponse | null
  currentTime: number
  duration: number
  isPlaying: boolean
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onExitKaraoke: () => void
  onSwitchToSingAlong: () => void
  theme: Theme
}

export default function KaraokeModeView({
  transcription,
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  onExitKaraoke,
  onSwitchToSingAlong,
  theme: _theme,
}: KaraokeModeViewProps) {
  const segments = transcription?.segments || []
  const activeLineRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const activeIndex = segments.findIndex(
    (seg) => currentTime >= seg.start && currentTime <= seg.end,
  )

  useEffect(() => {
    if (!activeLineRef.current || !containerRef.current) return
    const container = containerRef.current
    const element = activeLineRef.current
    const containerTop = container.getBoundingClientRect().top
    const elementTop = element.getBoundingClientRect().top
    const offset = elementTop - containerTop - container.clientHeight / 2 + element.clientHeight / 2

    container.scrollBy({
      top: offset,
      behavior: 'smooth',
    })
  }, [activeIndex])

  return (
    <div className="dark fixed inset-0 z-40 flex flex-col bg-[#200F07] text-[#FDFCE8] select-none">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-lion/20 bg-black/40 backdrop-blur-md">
        <button
          onClick={onExitKaraoke}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-dun/30 hover:border-lion text-xs font-semibold text-dun hover:text-lion transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Karaoke</span>
        </button>

        <div className="flex items-center gap-2">
          <Music2 className="w-4 h-4 text-emerald-400 animate-bounce" />
          <span className="font-serif font-bold text-sm">Karaoke Lounge</span>
        </div>

        <button
          onClick={onSwitchToSingAlong}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Start Sing-Along Scoring</span>
        </button>
      </header>

      {/* Main Lyrics Stage */}
      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 sm:px-16 py-20 space-y-10 text-center scrollbar-none"
      >
        {segments.map((seg, sIdx) => {
          const isActive = sIdx === activeIndex
          return (
            <div
              key={`karaoke-seg-${sIdx}`}
              ref={isActive ? activeLineRef : null}
              className={`p-6 rounded-3xl transition-all duration-300 ${
                isActive
                  ? 'bg-lion/25 border-2 border-lion shadow-2xl scale-105'
                  : 'opacity-35 hover:opacity-70'
              }`}
            >
              <p className="font-serif text-3xl sm:text-5xl font-extrabold leading-relaxed text-ivory">
                {seg.words && seg.words.length > 0
                  ? seg.words.map((w, wIdx) => {
                      const isWordActive =
                        currentTime >= (w.start ?? -1) && currentTime <= (w.end ?? -1)
                      return (
                        <span
                          key={`karaoke-w-${wIdx}`}
                          className={`inline-block mx-1.5 px-2 py-0.5 rounded-xl transition-all duration-150 ${
                            isWordActive
                              ? 'bg-lion text-bistre scale-110 shadow-lg font-black'
                              : 'text-ivory'
                          }`}
                        >
                          {w.word}
                        </span>
                      )
                    })
                  : seg.text}
              </p>
            </div>
          )
        })}
      </main>

      {/* Transport Footer */}
      <footer className="p-4 flex items-center justify-between border-t border-lion/20 bg-black/50 backdrop-blur-md px-6 sm:px-12">
        <span className="text-xs font-mono text-dun/70">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex items-center gap-4">
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 5))}
            className="p-3 rounded-full hover:bg-white/10 text-dun transition-colors cursor-pointer"
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
        </div>

        <span className="text-xs text-dun/50 hidden sm:inline">Sing with the melody</span>
      </footer>
    </div>
  )
}
