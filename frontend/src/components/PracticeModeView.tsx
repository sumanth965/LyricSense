import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Pause,
  Play,
  Repeat,
} from 'lucide-react'
import type { LoopRange, Theme, TranscriptionResponse } from '../types'
import { formatTime } from '../hooks/useAudioPlayer'

interface PracticeModeViewProps {
  transcription: TranscriptionResponse | null
  currentTime: number
  duration: number
  isPlaying: boolean
  playbackRate: number
  loopRange: LoopRange | null
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onSetPlaybackRate: (rate: number) => void
  onSetLoopRange: (start: number, end: number, enabled?: boolean) => void
  onClearLoopRange: () => void
  onExitPractice: () => void
  theme: Theme
}

export default function PracticeModeView({
  transcription,
  currentTime,
  duration: _duration,
  isPlaying,
  playbackRate,
  loopRange: _loopRange,
  onTogglePlay,
  onSeek,
  onSetPlaybackRate,
  onSetLoopRange,
  onClearLoopRange,
  onExitPractice,
  theme,
}: PracticeModeViewProps) {
  const isDark = theme === 'dark'
  const segments = transcription?.segments || []
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(0)
  const [isLoopingEnabled, setIsLoopingEnabled] = useState<boolean>(true)

  // When selected line changes, update loop range
  useEffect(() => {
    if (segments.length > 0 && selectedLineIndex >= 0 && selectedLineIndex < segments.length) {
      const seg = segments[selectedLineIndex]
      if (isLoopingEnabled) {
        onSetLoopRange(seg.start, seg.end, true)
      }
    }
  }, [selectedLineIndex, isLoopingEnabled, segments])

  const currentSegment = segments[selectedLineIndex]

  const handleNextLine = () => {
    if (selectedLineIndex < segments.length - 1) {
      setSelectedLineIndex((prev) => prev + 1)
    }
  }

  const handlePrevLine = () => {
    if (selectedLineIndex > 0) {
      setSelectedLineIndex((prev) => prev - 1)
    }
  }

  const toggleLoop = () => {
    setIsLoopingEnabled((prev) => {
      const next = !prev
      if (!next) {
        onClearLoopRange()
      } else if (currentSegment) {
        onSetLoopRange(currentSegment.start, currentSegment.end, true)
      }
      return next
    })
  }

  const speedOptions = [0.75, 0.9, 1.0, 1.25]

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* 1. Header with Return Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onExitPractice}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dun/30 hover:border-lion text-xs font-medium text-dun hover:text-lion transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Studio</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-lion animate-pulse" />
          <span className="font-serif font-semibold text-sm">Practice Mode</span>
        </div>
      </div>

      {/* 2. Practice Stage Box */}
      <div
        className="p-8 sm:p-12 rounded-3xl border text-center space-y-8 relative overflow-hidden shadow-xl"
        style={{
          backgroundColor: isDark ? '#261309' : '#FFFFFF',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(226, 206, 177, 0.95)',
        }}
      >
        {/* Line counter & timestamps */}
        <div
          className={`flex items-center justify-between text-xs font-mono font-medium ${
            isDark ? 'text-dun/70' : 'text-[#734128]'
          }`}
        >
          <span>
            Line {selectedLineIndex + 1} of {segments.length}
          </span>
          {currentSegment && (
            <span className="px-2.5 py-1 rounded-full bg-lion/15 text-lion font-semibold">
              Looping: {currentSegment.start.toFixed(1)}s - {currentSegment.end.toFixed(1)}s
            </span>
          )}
          <span>{formatTime(currentTime)}</span>
        </div>

        {/* Large Focused Current Line */}
        <div className="min-h-[140px] flex items-center justify-center py-4">
          {currentSegment ? (
            <p
              className={`font-serif text-2xl sm:text-4xl font-bold leading-relaxed tracking-wide ${
                isDark ? 'text-ivory' : 'text-[#2D170C]'
              }`}
            >
              {currentSegment.words && currentSegment.words.length > 0
                ? currentSegment.words.map((w, wIdx) => {
                    const isWordActive =
                      currentTime >= (w.start ?? -1) && currentTime <= (w.end ?? -1)
                    return (
                      <span
                        key={`pract-w-${wIdx}`}
                        className={`inline-block mx-1.5 px-2 py-0.5 rounded-xl transition-all duration-150 ${
                          isWordActive
                            ? 'bg-lion text-bistre scale-105 shadow-md font-extrabold'
                            : isDark
                              ? 'text-dun/80'
                              : 'text-[#5C3A21]'
                        }`}
                      >
                        {w.word}
                      </span>
                    )
                  })
                : currentSegment.text}
            </p>
          ) : (
            <p className={isDark ? 'text-dun/60' : 'text-[#734128]'}>
              Select a line from the timeline below to practice.
            </p>
          )}
        </div>

        {/* Practice Controls Bar: Prev, Play/Pause, Next, Loop toggle, Speed */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-dun/15">
          <button
            onClick={handlePrevLine}
            disabled={selectedLineIndex <= 0}
            className={`p-3 rounded-full border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              isDark
                ? 'border-dun/30 hover:border-lion text-dun hover:text-lion'
                : 'border-[#C7A07A]/50 hover:border-lion text-[#734128] hover:text-[#2D170C]'
            }`}
            title="Previous Line"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-14 h-14 rounded-full flex items-center justify-center bg-lion text-bistre shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play Loop'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNextLine}
            disabled={selectedLineIndex >= segments.length - 1}
            className={`p-3 rounded-full border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              isDark
                ? 'border-dun/30 hover:border-lion text-dun hover:text-lion'
                : 'border-[#C7A07A]/50 hover:border-lion text-[#734128] hover:text-[#2D170C]'
            }`}
            title="Next Line"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-dun/20 mx-2 hidden sm:block" />

          {/* Loop toggle */}
          <button
            onClick={toggleLoop}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isLoopingEnabled
                ? 'bg-lion text-bistre border-lion shadow-sm'
                : isDark
                  ? 'border-dun/30 text-dun/70 hover:text-dun'
                  : 'border-[#C7A07A]/50 text-[#734128] hover:text-[#2D170C]'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Repeat Loop {isLoopingEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Speed Controls */}
          <div
            className={`flex items-center gap-1 p-1 rounded-xl border ${
              isDark ? 'bg-dun/10 border-dun/20' : 'bg-[#FAF6EE] border-[#E2CEB1]'
            }`}
          >
            <Gauge
              className={`w-3.5 h-3.5 ml-1.5 mr-0.5 ${
                isDark ? 'text-dun/70' : 'text-[#734128]'
              }`}
            />
            {speedOptions.map((rate) => (
              <button
                key={rate}
                onClick={() => onSetPlaybackRate(rate)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-lion text-bistre font-bold'
                    : isDark
                      ? 'text-dun/70 hover:text-dun'
                      : 'text-[#734128] hover:text-[#2D170C]'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Line-by-line Drill Selector */}
      <div className="space-y-2">
        <h3
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'text-dun/80' : 'text-[#734128]'
          }`}
        >
          Select Line to Drill
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-1">
          {segments.map((seg, idx) => {
            const isSelected = selectedLineIndex === idx
            return (
              <button
                key={`line-drill-${idx}`}
                onClick={() => {
                  setSelectedLineIndex(idx)
                  onSeek(seg.start)
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'border-lion bg-lion/15 shadow-sm'
                      : 'border-lion bg-[#F6EEE3] shadow-sm'
                    : isDark
                      ? 'border-dun/15 hover:border-dun/30 bg-dun/5'
                      : 'border-[#E2CEB1] hover:border-lion bg-[#FAF6EE]'
                }`}
              >
                <div
                  className={`flex items-center justify-between text-[10px] mb-1 font-mono ${
                    isDark ? 'text-dun/60' : 'text-[#734128]'
                  }`}
                >
                  <span>Line #{idx + 1}</span>
                  <span>
                    {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                  </span>
                </div>
                <p
                  className={`text-xs font-semibold truncate ${
                    isDark ? 'text-ivory' : 'text-[#2D170C]'
                  }`}
                >
                  {seg.text}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
