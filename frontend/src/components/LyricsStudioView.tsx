import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Copy,
  Heart,
  Mic,
  Music2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Sliders,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { AudioMetadata, Theme, TranscriptionResponse } from '../types'
import { formatTime } from '../hooks/useAudioPlayer'

interface LyricsStudioViewProps {
  metadata: AudioMetadata | null
  transcription: TranscriptionResponse | null
  currentTime: number
  duration: number
  isPlaying: boolean
  volume: number
  isMuted: boolean
  playbackRate: number
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onSeekBy: (seconds: number) => void
  onSetVolume: (vol: number) => void
  onToggleMute: () => void
  onSetPlaybackRate: (rate: number) => void
  onUpdateWord?: (segmentIndex: number, wordIndex: number, newWord: string) => void
  onOpenModeSelector: () => void
  onStartSingAlong: () => void
  onStartPractice: () => void
  theme: Theme
}

interface FlatWordItem {
  id: string
  word: string
  start: number
  end: number
  segmentIndex: number
  wordIndex: number
}

export default function LyricsStudioView({
  metadata,
  transcription,
  currentTime,
  duration,
  isPlaying,
  volume,
  isMuted,
  playbackRate,
  onTogglePlay,
  onSeek,
  onSeekBy,
  onSetVolume,
  onToggleMute,
  onSetPlaybackRate,
  onUpdateWord: _onUpdateWord,
  onOpenModeSelector,
  onStartSingAlong,
  onStartPractice,
  theme,
}: LyricsStudioViewProps) {
  const isDark = theme === 'dark'
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeLineRef = useRef<HTMLDivElement | null>(null)

  const [activeTab, setActiveTab] = useState<'lyrics' | 'romanized' | 'original'>('lyrics')
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'stage'>('large')
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const [copied, setCopied] = useState<boolean>(false)
  const [isLiked, setIsLiked] = useState<boolean>(false)

  // Flatten words with valid timestamps
  const flatWords = useMemo<FlatWordItem[]>(() => {
    if (!transcription?.segments) return []
    const list: FlatWordItem[] = []
    transcription.segments.forEach((seg, sIdx) => {
      seg.words?.forEach((w, wIdx) => {
        if (
          w.start !== null &&
          w.end !== null &&
          isFinite(w.start) &&
          isFinite(w.end) &&
          w.end >= w.start &&
          w.start >= 0
        ) {
          list.push({
            id: `word-${sIdx}-${wIdx}`,
            word: w.word,
            start: w.start,
            end: w.end,
            segmentIndex: sIdx,
            wordIndex: wIdx,
          })
        }
      })
    })
    list.sort((a, b) => a.start - b.start || a.end - b.end)
    return list
  }, [transcription])

  // Find currently active word & segment
  const activeWord = useMemo(() => {
    if (flatWords.length === 0) return null
    for (let i = 0; i < flatWords.length; i++) {
      const item = flatWords[i]
      if (currentTime >= item.start && currentTime <= item.end) {
        return item
      }
    }
    return null
  }, [flatWords, currentTime])

  const activeSegmentIndex = useMemo(() => {
    if (activeWord) return activeWord.segmentIndex
    if (!transcription?.segments) return -1
    return transcription.segments.findIndex(
      (s) => currentTime >= s.start && currentTime <= s.end,
    )
  }, [activeWord, transcription, currentTime])

  // Smooth autoscroll to keep active line centered
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
  }, [activeSegmentIndex, autoScroll])

  const handleCopyLyrics = async () => {
    if (!transcription?.segments) return
    const fullText = transcription.segments.map((s) => s.text).join('\n')
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard error
    }
  }

  const speedOptions = [0.75, 0.9, 1.0, 1.25]

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* 1. Track Header matching Box 4 */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4"
        style={{
          backgroundColor: isDark ? 'rgba(43, 22, 12, 0.75)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(226, 206, 177, 0.9)',
        }}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-14 h-14 rounded-xl bg-lion/15 text-lion flex items-center justify-center shrink-0 shadow-inner">
            <Music2 className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-lion/15 text-lion">
                Lyrics Studio
              </span>
              {transcription?.language && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-dun/15 text-dun font-medium">
                  {transcription.detected_language_name || transcription.language}
                </span>
              )}
            </div>
            <h1 className="font-serif text-lg sm:text-xl font-bold truncate">
              {metadata?.name.replace(/\.[^/.]+$/, '') || 'Studio Audio Track'}
            </h1>
            <p className="text-xs text-dun/70 truncate">
              {metadata?.formattedSize} • {metadata?.format} • {formatTime(duration)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsLiked((prev) => !prev)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isLiked ? 'text-red-500 border-red-500/40 bg-red-500/10' : 'text-dun/70 border-dun/20 hover:text-lion'
            }`}
            title="Favorite Track"
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={onOpenModeSelector}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-lion text-bistre shadow-sm hover:shadow transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Choose Mode</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Audio Player Bar */}
      <div
        className="p-4 sm:p-5 rounded-2xl border space-y-3"
        style={{
          backgroundColor: isDark ? 'rgba(38, 19, 9, 0.85)' : '#FAF6EE',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.28)' : 'rgba(115, 65, 40, 0.2)',
        }}
      >
        {/* Waveform / Scrub bar */}
        <div className="space-y-1">
          <div
            className={`flex justify-between text-xs font-mono font-medium ${
              isDark ? 'text-dun/80' : 'text-[#734128]'
            }`}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = (e.clientX - rect.left) / rect.width
              onSeek(pct * duration)
            }}
            className="w-full h-3 rounded-full bg-dun/20 cursor-pointer relative overflow-hidden group"
          >
            <div
              className="h-full bg-lion rounded-full transition-all duration-75 relative"
              style={{ width: `${Math.min(100, duration > 0 ? (currentTime / duration) * 100 : 0)}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-ivory shadow-md scale-0 group-hover:scale-100 transition-transform" />
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Left: Speed selector */}
          <div className="flex items-center gap-1">
            <span
              className={`text-[11px] font-medium mr-1 hidden sm:inline ${
                isDark ? 'text-dun/70' : 'text-[#734128]'
              }`}
            >
              Speed:
            </span>
            {speedOptions.map((rate) => (
              <button
                key={rate}
                onClick={() => onSetPlaybackRate(rate)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-lion text-bistre font-bold shadow-xs'
                    : isDark
                      ? 'text-dun/70 hover:bg-dun/15'
                      : 'text-[#734128] hover:bg-[#F6EEE3]'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Center: Playback buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSeekBy(-5)}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isDark ? 'hover:bg-dun/15 text-dun' : 'hover:bg-[#F6EEE3] text-[#734128]'
              }`}
              title="Seek back 5 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePlay}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-lion text-bistre shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => onSeekBy(5)}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isDark ? 'hover:bg-dun/15 text-dun' : 'hover:bg-[#F6EEE3] text-[#734128]'
              }`}
              title="Seek forward 5 seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Volume & Quick Sing Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-dun hover:text-lion' : 'text-[#734128] hover:text-[#2D170C]'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onSetVolume(parseFloat(e.target.value))}
              className="w-16 sm:w-20 accent-lion cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. Lyrics Toolbar matching Box 4 */}
      <div
        className="p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2"
        style={{
          backgroundColor: isDark ? 'rgba(43, 22, 12, 0.6)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(226, 206, 177, 0.9)',
        }}
      >
        {/* Left: Script / Tab selectors */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'lyrics'
                ? 'bg-lion text-bistre shadow-xs'
                : isDark
                  ? 'text-dun/80 hover:bg-dun/10'
                  : 'text-[#734128] hover:bg-[#F6EEE3]'
            }`}
          >
            Lyrics
          </button>
          {transcription?.transliterated && (
            <button
              onClick={() => setActiveTab('romanized')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'romanized'
                  ? 'bg-lion text-bistre shadow-xs'
                  : isDark
                    ? 'text-dun/80 hover:bg-dun/10'
                    : 'text-[#734128] hover:bg-[#F6EEE3]'
              }`}
            >
              Romanized
            </button>
          )}
          {transcription?.original_transcript && (
            <button
              onClick={() => setActiveTab('original')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'original'
                  ? 'bg-lion text-bistre shadow-xs'
                  : isDark
                    ? 'text-dun/80 hover:bg-dun/10'
                    : 'text-[#734128] hover:bg-[#F6EEE3]'
              }`}
            >
              Original Script
            </button>
          )}
        </div>

        {/* Center / Right controls: Font size, AutoScroll, Copy, Modes */}
        <div className="flex items-center gap-2">
          {/* Font size switcher */}
          <div
            className="flex items-center rounded-lg border p-0.5 text-xs"
            style={{
              borderColor: isDark ? 'rgba(226, 206, 177, 0.2)' : 'rgba(199, 160, 122, 0.4)',
            }}
          >
            {(['normal', 'large', 'stage'] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => setFontSize(sz)}
                className={`px-2 py-0.5 rounded capitalize text-[11px] font-semibold transition-colors cursor-pointer ${
                  fontSize === sz
                    ? 'bg-lion text-bistre'
                    : isDark
                      ? 'text-dun/70 hover:text-dun'
                      : 'text-[#734128] hover:text-[#2D170C]'
                }`}
              >
                {sz === 'normal' ? 'A' : sz === 'large' ? 'A+' : 'Stage'}
              </button>
            ))}
          </div>

          {/* Autoscroll button */}
          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs border font-medium transition-colors cursor-pointer ${
              autoScroll
                ? 'border-lion text-lion bg-lion/10 font-bold'
                : isDark
                  ? 'border-dun/20 text-dun/70 hover:text-dun'
                  : 'border-lion/40 text-[#734128] hover:text-[#2D170C]'
            }`}
            title="Auto-scroll to active lyrics"
          >
            Auto-scroll
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopyLyrics}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'border-dun/20 text-dun hover:text-lion hover:border-lion'
                : 'border-lion/40 text-[#734128] hover:text-[#2D170C] hover:border-lion'
            }`}
            title="Copy all lyrics"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Quick Sing Along CTA */}
          <button
            onClick={onStartSingAlong}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-700/80 hover:bg-red-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Sing Along</span>
          </button>

          {/* Practice Mode CTA */}
          <button
            onClick={onStartPractice}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-kobicha hover:bg-kobicha/80 text-ivory border border-lion/30 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Practice</span>
          </button>
        </div>
      </div>

      {/* 4. Synchronized Lyrics Teleprompter Scroll Container */}
      <div
        ref={containerRef}
        className="max-h-[460px] overflow-y-auto rounded-3xl border p-6 sm:p-8 space-y-6 scrollbar-thin transition-all"
        style={{
          backgroundColor: isDark ? 'rgba(38, 19, 9, 0.92)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.28)' : 'rgba(226, 206, 177, 0.95)',
          color: isDark ? '#FDFCE8' : '#2D170C',
        }}
      >
        {!transcription?.segments || transcription.segments.length === 0 ? (
          <div className="py-12 text-center space-y-2 text-dun/70">
            <Music2 className="w-8 h-8 mx-auto text-lion/40" />
            <p className="text-sm">No synchronized lyrics available for this track.</p>
          </div>
        ) : (
          transcription.segments.map((seg, sIdx) => {
            const isSegmentActive = activeSegmentIndex === sIdx
            const displayWords = seg.words || []

            return (
              <div
                key={`seg-${sIdx}`}
                ref={isSegmentActive ? activeLineRef : null}
                className={`p-4 rounded-2xl transition-all duration-200 ${
                  isSegmentActive
                    ? isDark
                      ? 'bg-lion/15 border border-lion/40 shadow-sm'
                      : 'bg-[#F6EEE3] border-2 border-lion/70 shadow-sm'
                    : isDark
                      ? 'hover:bg-dun/5 border border-transparent'
                      : 'hover:bg-[#FAF4EC] border border-transparent'
                }`}
              >
                {/* Line timing header */}
                <div
                  className={`flex items-center justify-between text-[11px] font-mono mb-2 ${
                    isDark ? 'text-dun/70' : 'text-[#734128]'
                  }`}
                >
                  <span
                    onClick={() => onSeek(seg.start)}
                    className={`cursor-pointer flex items-center gap-1 font-semibold ${
                      isDark ? 'text-lion hover:text-ivory' : 'text-[#734128] hover:text-[#2D170C]'
                    }`}
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                  </span>
                  {seg.original_text && activeTab === 'romanized' && (
                    <span
                      className={`font-serif italic truncate max-w-[200px] ${
                        isDark ? 'text-dun/70' : 'text-[#734128]/80'
                      }`}
                    >
                      {seg.original_text}
                    </span>
                  )}
                </div>

                {/* Line text with word-level highlight */}
                <p
                  className={`font-serif leading-relaxed ${
                    fontSize === 'normal'
                      ? 'text-base sm:text-lg'
                      : fontSize === 'large'
                        ? 'text-xl sm:text-2xl font-medium'
                        : 'text-2xl sm:text-3xl font-bold tracking-wide'
                  }`}
                >
                  {displayWords.length > 0
                    ? displayWords.map((w, wIdx) => {
                        const isWordActive =
                          currentTime >= (w.start ?? -1) && currentTime <= (w.end ?? -1)

                        return (
                          <span
                            key={`w-${sIdx}-${wIdx}`}
                            onClick={() => {
                              if (w.start !== null && isFinite(w.start)) {
                                onSeek(w.start)
                              }
                            }}
                            className={`inline-block mx-1 px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer ${
                              isWordActive
                                ? 'bg-lion text-bistre font-bold shadow-xs'
                                : isSegmentActive
                                  ? isDark
                                    ? 'text-ivory font-bold'
                                    : 'text-[#2D170C] font-bold'
                                  : isDark
                                    ? 'text-dun/75 hover:text-ivory'
                                    : 'text-[#5C3A21] hover:text-[#2D170C] font-medium'
                            }`}
                            title={`Click to jump to ${w.start?.toFixed(2)}s`}
                          >
                            {w.word}
                          </span>
                        )
                      })
                    : (
                      <span
                        className={
                          isSegmentActive
                            ? isDark
                              ? 'text-ivory font-bold'
                              : 'text-[#2D170C] font-bold'
                            : isDark
                              ? 'text-dun/75'
                              : 'text-[#5C3A21] font-medium'
                        }
                      >
                        {seg.text}
                      </span>
                    )}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
