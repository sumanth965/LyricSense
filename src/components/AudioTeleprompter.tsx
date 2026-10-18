import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AudioWaveform,
  Check,
  FileText,
  Moon,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Type,
  UploadCloud,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  createSynthesizedDemoWavUrl,
  DEMO_LYRICS,
  type SyncedLine,
} from '../lib/demoAudio'
import type { Theme } from '../types'

interface AudioTeleprompterProps {
  theme: Theme
  onToggleTheme: () => void
}

export default function AudioTeleprompter({
  theme,
  onToggleTheme,
}: AudioTeleprompterProps) {
  const isDark = theme === 'dark'

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const teleprompterContainerRef = useRef<HTMLDivElement | null>(null)

  const [audioUrl, setAudioUrl] = useState<string>('')
  const [trackName, setTrackName] = useState<string>('Golden Echoes (LyricSense Demo)')
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(28)
  const [volume, setVolume] = useState<number>(0.85)
  const [isMuted, setIsMuted] = useState<boolean>(false)

  // Lyrics state
  const [lyrics, setLyrics] = useState<SyncedLine[]>(DEMO_LYRICS)
  const [activeLineId, setActiveLineId] = useState<number>(1)
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0)

  // Teleprompter ergonomic settings
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'huge'>('large')
  const [mirrorMode, setMirrorMode] = useState<boolean>(false)
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const [showLyricsEditor, setShowLyricsEditor] = useState<boolean>(false)
  const [customLyricsText, setCustomLyricsText] = useState<string>('')
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false)

  // Initialize synthesized demo audio on mount
  useEffect(() => {
    const demoUrl = createSynthesizedDemoWavUrl()
    setAudioUrl(demoUrl)
    return () => {
      URL.revokeObjectURL(demoUrl)
    }
  }, [])

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Real-time playback update: word-level & line-level sync
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return
    const time = audioRef.current.currentTime
    setCurrentTime(time)

    // Find current active line
    const currentLineIndex = lyrics.findIndex(
      (line) => time >= line.start && time <= line.end,
    )

    if (currentLineIndex !== -1) {
      const line = lyrics[currentLineIndex]
      setActiveLineId(line.id)

      // Find current active word
      const wordIndex = line.words.findIndex(
        (w) => time >= w.start && time <= w.end,
      )
      if (wordIndex !== -1) {
        setActiveWordIndex(wordIndex)
      } else {
        // If between words in line, pick the closest passed word
        const lastPassed = line.words.reduce(
          (acc, w, idx) => (time >= w.start ? idx : acc),
          0,
        )
        setActiveWordIndex(lastPassed)
      }
    } else {
      // If between lines, find upcoming line
      const nextLine = lyrics.find((line) => line.start > time)
      if (nextLine) {
        setActiveLineId(nextLine.id)
        setActiveWordIndex(-1)
      }
    }
  }, [lyrics])

  // Smooth autoscroll to keep active line centered in teleprompter
  useEffect(() => {
    if (!autoScroll || !teleprompterContainerRef.current) return
    const activeEl = document.getElementById(`lyrics-line-${activeLineId}`)
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [activeLineId, autoScroll])

  // Play / Pause toggle
  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.log('Audio playback waiting for interaction:', err))
    }
  }

  // Seek audio to specific time
  const handleSeek = (time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  // Handle uploaded audio file
  const handleAudioUpload = (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|m4a|aac|ogg)$/i)) {
      alert('Please upload a valid audio file (.mp3, .wav, .flac, .m4a)')
      return
    }
    const newUrl = URL.createObjectURL(file)
    setAudioUrl(newUrl)
    setTrackName(file.name.replace(/\.[^/.]+$/, ''))
    setIsPlaying(false)
    setCurrentTime(0)
  }

  // Load demo song again
  const handleLoadDemo = () => {
    const demoUrl = createSynthesizedDemoWavUrl()
    setAudioUrl(demoUrl)
    setTrackName('Golden Echoes (LyricSense Demo)')
    setLyrics(DEMO_LYRICS)
    setIsPlaying(false)
    setCurrentTime(0)
  }

  // Apply custom raw lyrics
  const handleApplyCustomLyrics = () => {
    if (!customLyricsText.trim()) return
    const lines = customLyricsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    const step = duration > 0 ? duration / (lines.length + 1) : 4
    const newSynced: SyncedLine[] = lines.map((text, idx) => {
      const lineStart = (idx + 0.5) * step
      const lineEnd = lineStart + step * 0.85
      const words = text.split(/\s+/).map((w, wIdx, arr) => {
        const wStep = (lineEnd - lineStart) / arr.length
        return {
          word: w,
          start: lineStart + wIdx * wStep,
          end: lineStart + (wIdx + 1) * wStep,
        }
      })
      return {
        id: idx + 1,
        start: lineStart,
        end: lineEnd,
        text,
        words,
      }
    })

    setLyrics(newSynced)
    setShowLyricsEditor(false)
  }

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDraggingFile(true)
      }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDraggingFile(false)
        if (e.dataTransfer.files?.[0]) {
          handleAudioUpload(e.dataTransfer.files[0])
        }
      }}
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden ${
        mirrorMode ? 'scale-x-[-1]' : ''
      }`}
    >
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (audioRef.current && isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration)
          }
        }}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleAudioUpload(e.target.files[0])
          }
        }}
      />

      {/* Drag and Drop Full-Screen Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-lion text-ivory">
          <UploadCloud className="w-16 h-16 text-lion animate-bounce mb-4" />
          <p className="font-editorial text-2xl font-semibold">Drop Audio File to Load</p>
          <p className="text-xs text-lion mt-1">Supports MP3, WAV, FLAC, M4A</p>
        </div>
      )}

      {/* 1. Sleek Minimalist Top Header Bar */}
      <header className="relative z-30 px-4 sm:px-8 pt-4 pb-3 flex items-center justify-between">
        {/* Left: Minimalist Brand Badge */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center border backdrop-blur-md shadow-xs"
            style={{
              backgroundColor: isDark ? 'rgba(57, 30, 16, 0.75)' : 'rgba(253, 252, 232, 0.85)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
            }}
          >
            <AudioWaveform className="w-4 h-4 text-lion" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="font-editorial text-xl sm:text-2xl font-semibold tracking-tight"
              style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
            >
              Lyric<span className="text-lion">Sense</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-lion/15 text-lion border border-lion/30">
              <Sparkles className="w-2.5 h-2.5" /> Teleprompter
            </span>
          </div>
        </div>

        {/* Right: Teleprompter & Audio Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Upload Audio File */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload audio file (MP3, WAV, M4A)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all duration-200 hover:scale-102 active:scale-98 cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDark ? 'rgba(115, 65, 40, 0.75)' : 'rgba(226, 206, 177, 0.65)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.4)' : 'rgba(115, 65, 40, 0.3)',
              color: isDark ? '#FDFCE8' : '#391E10',
            }}
          >
            <UploadCloud className="w-3.5 h-3.5 text-lion" />
            <span className="hidden sm:inline">Upload Audio</span>
          </button>

          {/* Reset to Demo Track */}
          <button
            type="button"
            onClick={handleLoadDemo}
            title="Load demo song"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border backdrop-blur-md transition-colors cursor-pointer"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.65)' : 'rgba(253, 252, 232, 0.75)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
              color: isDark ? '#E2CEB1' : '#734128',
            }}
          >
            <Music2 className="w-3 h-3 text-lion" />
            <span>Demo Song</span>
          </button>

          {/* Custom Lyrics Paste Modal Toggle */}
          <button
            type="button"
            onClick={() => setShowLyricsEditor(!showLyricsEditor)}
            title="Paste custom lyrics"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-medium border backdrop-blur-md transition-colors cursor-pointer"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.65)' : 'rgba(253, 252, 232, 0.75)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
              color: isDark ? '#E2CEB1' : '#734128',
            }}
          >
            <FileText className="w-3.5 h-3.5 text-lion" />
            <span className="hidden lg:inline">Edit Lyrics</span>
          </button>

          {/* Font Size Toggle */}
          <button
            type="button"
            onClick={() => {
              setFontSize((prev) =>
                prev === 'normal' ? 'large' : prev === 'large' ? 'huge' : 'normal',
              )
            }}
            title="Adjust teleprompter text size"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border backdrop-blur-md transition-transform hover:scale-105 active:scale-95 cursor-pointer text-lion"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.65)' : 'rgba(253, 252, 232, 0.75)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
            }}
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Mirror Mode Toggle */}
          <button
            type="button"
            onClick={() => setMirrorMode(!mirrorMode)}
            title="Toggle stage mirror mode"
            className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 rounded-xl items-center justify-center border backdrop-blur-md transition-transform hover:scale-105 active:scale-95 cursor-pointer text-xs font-mono font-bold"
            style={{
              backgroundColor: mirrorMode
                ? '#734128'
                : isDark ? 'rgba(45, 23, 12, 0.65)' : 'rgba(253, 252, 232, 0.75)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
              color: mirrorMode ? '#FDFCE8' : '#C7A07A',
            }}
          >
            M
          </button>

          {/* Circular Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border backdrop-blur-md transition-transform hover:scale-105 active:scale-95 cursor-pointer text-lion"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.65)' : 'rgba(253, 252, 232, 0.75)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
            }}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. Main Center Stage: Live Synced Lyrics Teleprompter */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 max-w-4xl mx-auto w-full overflow-hidden">
        {/* Custom Lyrics Editor Dialog */}
        {showLyricsEditor && (
          <div
            className="absolute z-40 inset-x-4 top-4 max-w-lg mx-auto rounded-2xl border p-5 backdrop-blur-xl shadow-2xl transition-all"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.95)' : 'rgba(253, 252, 232, 0.98)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.4)' : 'rgba(115, 65, 40, 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-editorial text-lg font-semibold" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
                Paste Song Lyrics
              </h3>
              <button
                type="button"
                onClick={() => setShowLyricsEditor(false)}
                className="text-xs text-lion hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <textarea
              rows={6}
              value={customLyricsText}
              onChange={(e) => setCustomLyricsText(e.target.value)}
              placeholder="Paste lines of lyrics here..."
              className="w-full p-3 rounded-xl border text-xs sm:text-sm font-sans focus:outline-none resize-none"
              style={{
                backgroundColor: isDark ? 'rgba(57, 30, 16, 0.8)' : 'rgba(226, 206, 177, 0.3)',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
                color: isDark ? '#FDFCE8' : '#391E10',
              }}
            />
            <button
              type="button"
              onClick={handleApplyCustomLyrics}
              className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold transition-transform active:scale-98 cursor-pointer"
              style={{
                backgroundColor: '#734128',
                color: '#FDFCE8',
              }}
            >
              Sync Lyrics to Track
            </button>
          </div>
        )}

        {/* Teleprompter Scrolling Container */}
        <div
          ref={teleprompterContainerRef}
          className="w-full h-[320px] sm:h-[420px] lg:h-[480px] overflow-y-auto no-scrollbar scroll-smooth flex flex-col items-center py-20 px-2 space-y-8 sm:space-y-12 select-none"
          style={{
            maskImage:
              'linear-gradient(180deg, transparent 0%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 78%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(180deg, transparent 0%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 78%, transparent 100%)',
          }}
        >
          {lyrics.map((line) => {
            const isActiveLine = line.id === activeLineId

            // Font scale classes
            const fontScale =
              fontSize === 'huge'
                ? 'text-3xl sm:text-5xl lg:text-6xl'
                : fontSize === 'large'
                  ? 'text-2xl sm:text-4xl lg:text-5xl'
                  : 'text-xl sm:text-3xl lg:text-4xl'

            return (
              <div
                key={line.id}
                id={`lyrics-line-${line.id}`}
                onClick={() => handleSeek(line.start)}
                title={`Click to jump to ${formatTime(line.start)}`}
                className={`w-full text-center font-editorial font-semibold tracking-tight transition-all duration-300 cursor-pointer ${fontScale} ${
                  isActiveLine
                    ? 'scale-105 opacity-100'
                    : 'opacity-35 hover:opacity-60 scale-95'
                }`}
                style={{
                  color: isActiveLine
                    ? isDark ? '#FDFCE8' : '#391E10'
                    : isDark ? '#E2CEB1' : '#734128',
                }}
              >
                {isActiveLine ? (
                  // Active Line: Render word-by-word with the current word illuminated
                  <span className="inline-flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3.5 gap-y-1.5">
                    {line.words.map((w, wIdx) => {
                      const isWordActive = wIdx === activeWordIndex
                      return (
                        <span
                          key={wIdx}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSeek(w.start)
                          }}
                          className={`relative inline-block transition-all duration-200 px-2 py-0.5 rounded-lg ${
                            isWordActive
                              ? 'shadow-md border scale-110'
                              : 'hover:opacity-80'
                          }`}
                          style={{
                            backgroundColor: isWordActive
                              ? '#734128'
                              : 'transparent',
                            color: isWordActive
                              ? '#FDFCE8'
                              : isDark ? '#FDFCE8' : '#391E10',
                            borderColor: isWordActive ? '#C7A07A' : 'transparent',
                            textShadow: isWordActive
                              ? '0 0 16px rgba(199, 160, 122, 0.8)'
                              : 'none',
                          }}
                        >
                          {w.word}
                        </span>
                      )
                    })}
                  </span>
                ) : (
                  // Non-active Line
                  <span>{line.text}</span>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {/* 3. Sleek Floating Audio Player Bar */}
      <footer className="relative z-30 px-4 sm:px-8 pb-5 pt-2">
        <div
          className="max-w-4xl mx-auto rounded-2xl border px-4 sm:px-6 py-3.5 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6 transition-all"
          style={{
            backgroundColor: isDark ? 'rgba(45, 23, 12, 0.88)' : 'rgba(253, 252, 232, 0.94)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
          }}
        >
          {/* Track Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Play / Pause Main Trigger */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-md"
              style={{
                backgroundColor: '#734128',
                color: '#FDFCE8',
                boxShadow: isPlaying ? '0 0 18px rgba(199, 160, 122, 0.55)' : 'none',
              }}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p
                className="text-xs sm:text-sm font-semibold truncate"
                style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
              >
                {trackName}
              </p>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-lion font-mono">
                <span>{formatTime(currentTime)}</span>
                <span className="opacity-40">/</span>
                <span>{formatTime(duration)}</span>
                <span className="opacity-40">•</span>
                <span className="truncate">Active Sync</span>
              </div>
            </div>
          </div>

          {/* Interactive Timeline Scrubber & Waveform */}
          <div className="flex-1 w-full flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              aria-label="Seek track position"
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#C7A07A]"
              style={{
                background: `linear-gradient(to right, #C7A07A ${(currentTime / (duration || 1)) * 100}%, rgba(199, 160, 122, 0.25) ${(currentTime / (duration || 1)) * 100}%)`,
              }}
            />
          </div>

          {/* Player Utility Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Replay */}
            <button
              type="button"
              onClick={() => handleSeek(0)}
              title="Restart from beginning"
              className="p-1.5 rounded-lg text-lion hover:text-ivory transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Auto-scroll toggle */}
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors cursor-pointer"
              style={{
                backgroundColor: autoScroll
                  ? 'rgba(199, 160, 122, 0.2)'
                  : 'transparent',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.2)',
                color: isDark ? '#FDFCE8' : '#391E10',
              }}
            >
              {autoScroll && <Check className="w-3 h-3 text-lion" />}
              <span>Auto-Scroll</span>
            </button>

            {/* Volume Mute */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute' : 'Mute'}
              className="p-1.5 rounded-lg text-lion hover:text-ivory transition-colors cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-kobicha" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* Volume slider */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value))
                setIsMuted(false)
              }}
              aria-label="Volume slider"
              className="w-16 h-1 rounded-full appearance-none cursor-pointer accent-[#C7A07A] hidden sm:block"
              style={{
                backgroundColor: 'rgba(199, 160, 122, 0.3)',
              }}
            />
          </div>
        </div>
      </footer>
    </div>
  )
}
