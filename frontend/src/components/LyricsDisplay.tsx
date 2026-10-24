import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Cpu,
  FileText,
  Globe,
  Loader2,
  Music2,
  RefreshCw,
  Sparkles,
  Timer,
  X,
  Zap,
} from 'lucide-react'
import type { ProcessingStage, Theme, TranscriptionResponse } from '../types'

interface LyricsDisplayProps {
  transcription: TranscriptionResponse | null
  stage: ProcessingStage
  error: string | null
  isTranscribing: boolean
  currentTime: number
  isPlaying: boolean
  onAnalyze: (
    language?: string,
    enableVocalSeparation?: boolean,
    enableCloud?: boolean,
    separateVocals?: 'auto' | 'on' | 'off',
    lyrics?: string,
  ) => void
  onCancel: () => void
  onRetry: (
    language?: string,
    enableVocalSeparation?: boolean,
    enableCloud?: boolean,
    separateVocals?: 'auto' | 'on' | 'off',
    lyrics?: string,
  ) => void
  onSeek?: (time: number) => void
  onUpdateWord?: (segmentIndex: number, wordIndex: number, newWord: string) => void
  theme: Theme
  backendAvailable?: boolean
  vocalSeparationAvailable?: boolean
  groqAvailable?: boolean
  audioDuration?: number
  trackName?: string
  initialLyrics?: string
}

interface FlatWordItem {
  id: string
  word: string
  start: number
  end: number
  segmentIndex: number
  wordIndex: number
}

const LANGUAGE_OPTIONS = [
  { code: 'auto', label: 'Auto-Detect Language' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'en', label: 'English' },
]

export default function LyricsDisplay({
  transcription,
  stage,
  error,
  isTranscribing,
  currentTime,
  onAnalyze,
  onCancel,
  onRetry,
  onSeek,
  onUpdateWord,
  theme,
  backendAvailable = true,
  vocalSeparationAvailable = false,
  groqAvailable = false,
  audioDuration,
  trackName,
  initialLyrics,
}: LyricsDisplayProps) {
  const isDark = theme === 'dark'
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeWordRef = useRef<HTMLSpanElement | null>(null)
  const activeSegmentRef = useRef<HTMLDivElement | null>(null)

  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto')
  const [enableCloud, setEnableCloud] = useState<boolean>(true)
  const [enableVocalSeparation, setEnableVocalSeparation] = useState<boolean>(false)
  const [separateVocalsMode, setSeparateVocalsMode] = useState<'auto' | 'on' | 'off'>('off')
  const [lyricsInput, setLyricsInput] = useState<string>(initialLyrics || '')
  const [showLyricsInput, setShowLyricsInput] = useState<boolean>(Boolean(initialLyrics))
  const [editingWord, setEditingWord] = useState<{ sIdx: number; wIdx: number; text: string } | null>(null)
  const [showWarnings, setShowWarnings] = useState<boolean>(false)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)

  // Live timer counting up while transcription is active
  useEffect(() => {
    if (!isTranscribing) {
      setElapsedSeconds(0)
      return
    }
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isTranscribing])

  const [activeWordId, setActiveWordId] = useState<string | null>(null)
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1)
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'stage'>('large')
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const [copied, setCopied] = useState<boolean>(false)

  // 1. Flatten words with valid timestamps and sort strictly by timeline
  const flatWords = useMemo<FlatWordItem[]>(() => {
    if (!transcription || !transcription.segments) return []
    const list: FlatWordItem[] = []

    transcription.segments.forEach((seg, sIdx) => {
      if (seg.words && seg.words.length > 0) {
        seg.words.forEach((w, wIdx) => {
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
      }
    })

    // Strict sort by start time, then end time
    list.sort((a, b) => a.start - b.start || a.end - b.end)
    return list
  }, [transcription])

  // 2. Exact word and segment synchronization using audio.currentTime as single source of truth
  // Highlights word strictly when currentTime falls within its [start, end] timestamps
  useEffect(() => {
    if (!transcription) {
      if (activeWordId !== null) setActiveWordId(null)
      if (activeSegmentIndex !== -1) setActiveSegmentIndex(-1)
      return
    }

    // A. Check for word-level match: highlight ONLY within exact word bounds
    let foundWord: FlatWordItem | null = null
    if (flatWords.length > 0) {
      for (let i = 0; i < flatWords.length; i++) {
        const item = flatWords[i]
        if (currentTime >= item.start && currentTime <= item.end) {
          foundWord = item
          break
        }
      }

      // Handle the end of the song without resetting the highlight unexpectedly
      if (!foundWord && flatWords.length > 0) {
        const lastWord = flatWords[flatWords.length - 1]
        const isSongNearEnd =
          audioDuration && audioDuration > 0
            ? currentTime >= audioDuration - 1.2 && currentTime >= lastWord.start
            : currentTime >= lastWord.end && currentTime <= lastWord.end + 2.0
        if (isSongNearEnd) {
          foundWord = lastWord
        }
      }
    }

    const nextWordId = foundWord ? foundWord.id : null

    // B. Determine active segment based on active word or segment timestamp bounds
    let nextSegIdx = -1
    if (foundWord) {
      nextSegIdx = foundWord.segmentIndex
    } else if (transcription.segments) {
      nextSegIdx = transcription.segments.findIndex(
        (seg) => currentTime >= seg.start && currentTime <= seg.end,
      )
      // Retain last segment if at end of song
      if (nextSegIdx === -1 && transcription.segments.length > 0) {
        const lastSeg = transcription.segments[transcription.segments.length - 1]
        if (
          audioDuration &&
          currentTime >= audioDuration - 1.2 &&
          currentTime >= lastSeg.start
        ) {
          nextSegIdx = transcription.segments.length - 1
        }
      }
    }

    if (nextWordId !== activeWordId) {
      setActiveWordId(nextWordId)
    }
    if (nextSegIdx !== activeSegmentIndex) {
      setActiveSegmentIndex(nextSegIdx)
    }
  }, [currentTime, flatWords, transcription, activeWordId, activeSegmentIndex, audioDuration])

  // 3. Smooth auto-scroll active word or active segment into view centered in the lyrics container
  useEffect(() => {
    if (!autoScroll) return

    if (activeWordRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    } else if (activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    }
  }, [activeWordId, activeSegmentIndex, autoScroll])

  // Copy full transcript text
  const handleCopyTranscript = () => {
    if (!transcription?.transcript) return
    navigator.clipboard.writeText(transcription.transcript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Typography sizing classes
  const fontClasses = {
    normal: 'text-base sm:text-lg leading-relaxed',
    large: 'text-lg sm:text-xl md:text-2xl leading-relaxed sm:leading-loose',
    stage: 'text-xl sm:text-2xl md:text-3xl leading-loose font-medium',
  }[fontSize]

  // Render State A: Before Analysis (Empty state with Analyze Audio action)
  if (!transcription && !isTranscribing && stage !== 'failed') {
    return (
      <div
        className="w-full rounded-2xl border p-6 sm:p-10 backdrop-blur-md shadow-sm transition-all text-center flex flex-col items-center justify-center select-none"
        style={{
          backgroundColor: isDark ? 'rgba(45, 23, 12, 0.72)' : 'rgba(253, 252, 232, 0.88)',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.28)' : 'rgba(115, 65, 40, 0.2)',
        }}
      >
        <div
          className="w-13 h-13 rounded-2xl flex items-center justify-center mb-4 border shadow-2xs"
          style={{
            backgroundColor: isDark ? 'rgba(115, 65, 40, 0.4)' : '#EFE7D8',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(226, 206, 177, 0.8)',
          }}
        >
          <FileText className="w-6 h-6 text-lion" />
        </div>

        <h3
          className="font-editorial text-2xl sm:text-3xl font-semibold tracking-tight mb-2"
          style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
        >
          Synchronized Lyrics
        </h3>

        <p
          className="text-xs sm:text-sm leading-relaxed mb-3 max-w-md"
          style={{ color: isDark ? '#E2CEB1' : '#734128' }}
        >
          Transcribe your audio recording locally and align each word to precise millisecond
          timestamps using faster-whisper.
        </p>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border border-lion/30 bg-lion/10 text-lion mb-5">
          <Sparkles className="w-3.5 h-3.5 text-lion" />
          <span>All song lyrics displayed in English/Roman alphabet</span>
        </div>

        {/* Audio Language Selection Selector */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
          <label
            htmlFor="lyrics-lang-select"
            className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
            style={{ color: isDark ? '#E2CEB1' : '#734128' }}
          >
            <Globe className="w-3.5 h-3.5 text-lion" />
            <span>Audio Language:</span>
          </label>
          <select
            id="lyrics-lang-select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="text-xs sm:text-sm font-medium rounded-xl px-3 py-1.5 border shadow-2xs focus:outline-none focus:ring-2 focus:ring-lion transition-colors cursor-pointer"
            style={{
              backgroundColor: isDark ? '#391E10' : '#FFFFFF',
              color: isDark ? '#FDFCE8' : '#391E10',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.4)' : 'rgba(199, 160, 122, 0.7)',
            }}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option
                key={opt.code}
                value={opt.code}
                style={{
                  backgroundColor: isDark ? '#391E10' : '#FFFFFF',
                  color: isDark ? '#FDFCE8' : '#391E10',
                }}
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Processing Engine & Vocal Separation Preferences */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          {/* Cloud Acceleration (Groq API) with Automatic Local Fallback */}
          <label
            className={`inline-flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 rounded-xl border transition-colors select-none ${
              groqAvailable
                ? 'cursor-pointer hover:border-lion/60'
                : 'opacity-60 cursor-not-allowed'
            }`}
            style={{
              backgroundColor: isDark ? 'rgba(57, 30, 16, 0.4)' : 'rgba(226, 206, 177, 0.3)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
              color: isDark ? '#E2CEB1' : '#734128',
            }}
            title={
              groqAvailable
                ? 'Accelerates transcription using Groq Cloud API with automatic local Whisper fallback. Uncheck for 100% offline local processing.'
                : 'Groq API is not configured. Local faster-whisper will be used.'
            }
          >
            <input
              type="checkbox"
              checked={enableCloud && groqAvailable}
              onChange={(e) => setEnableCloud(e.target.checked)}
              disabled={!groqAvailable}
              className="w-3.5 h-3.5 accent-[#C7A07A] rounded cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Cloud Acceleration (Groq)</span>
            </span>
            {!groqAvailable && (
              <span className="text-[10px] text-amber-500 font-mono font-normal">
                (offline only)
              </span>
            )}
          </label>

          {/* Demucs Vocal Separation Mode Selector */}
          <div
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border"
            style={{
              backgroundColor: isDark ? 'rgba(57, 30, 16, 0.4)' : 'rgba(226, 206, 177, 0.3)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
              color: isDark ? '#E2CEB1' : '#734128',
            }}
            title={
              vocalSeparationAvailable
                ? 'Runs Demucs htdemucs vocal isolation on music tracks before alignment'
                : 'Demucs vocal separation is ready'
            }
          >
            <Sparkles className="w-3.5 h-3.5 text-lion" />
            <label htmlFor="vocals-sep-select" className="text-xs font-semibold">
              Vocal Separation:
            </label>
            <select
              id="vocals-sep-select"
              value={separateVocalsMode}
              onChange={(e) => {
                const val = e.target.value as 'auto' | 'on' | 'off'
                setSeparateVocalsMode(val)
                setEnableVocalSeparation(val !== 'off')
              }}
              className="bg-transparent font-mono text-xs focus:outline-none cursor-pointer"
              style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
            >
              <option value="off" style={{ backgroundColor: isDark ? '#391E10' : '#FFFFFF' }}>
                Off (Fast / Default)
              </option>
              <option value="auto" style={{ backgroundColor: isDark ? '#391E10' : '#FFFFFF' }}>
                Auto (Music vs Speech)
              </option>
              <option value="on" style={{ backgroundColor: isDark ? '#391E10' : '#FFFFFF' }}>
                On (Force Demucs)
              </option>
            </select>
          </div>
        </div>

        {/* Optional Known Lyrics Toggle & Input */}
        <div className="w-full max-w-md mb-5">
          <button
            type="button"
            onClick={() => setShowLyricsInput(!showLyricsInput)}
            className="text-xs font-mono text-lion hover:underline inline-flex items-center gap-1.5 mb-2 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showLyricsInput ? 'Hide Reference Lyrics' : 'Paste Lyrics for Exact Sync (Known-lyrics mode)'}</span>
          </button>
          {showLyricsInput && (
            <textarea
              value={lyricsInput}
              onChange={(e) => setLyricsInput(e.target.value)}
              placeholder="Paste plain text lyrics here to skip recognition and force-align timestamps directly..."
              rows={4}
              className="w-full text-xs font-mono p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-lion transition-colors resize-y text-left"
              style={{
                backgroundColor: isDark ? 'rgba(30, 15, 8, 0.8)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(199, 160, 122, 0.6)',
                color: isDark ? '#FDFCE8' : '#391E10',
              }}
            />
          )}
        </div>

        {/* Primary Analyze Audio Action Button */}
        <button
          type="button"
          onClick={() =>
            onAnalyze(
              selectedLanguage,
              enableVocalSeparation,
              enableCloud,
              separateVocalsMode,
              lyricsInput.trim() || undefined,
            )
          }
          className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-102 active:scale-98 shadow-md cursor-pointer mb-4"
          style={{
            backgroundColor: '#734128',
            color: '#FDFCE8',
          }}
        >
          <Cpu className="w-4 h-4 text-lion" />
          <span>{lyricsInput.trim() ? 'Align Known Lyrics' : 'Analyze Audio'}</span>
        </button>

        {/* Local Processing & Privacy Badge */}
        <div
          className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono"
          style={{ color: isDark ? 'rgba(226, 206, 177, 0.8)' : 'rgba(115, 65, 40, 0.85)' }}
        >
          <span className="inline-flex items-center gap-1.5 text-lion">
            <Sparkles className="w-3.5 h-3.5" /> Demucs • faster-whisper large-v3 • WhisperX Forced Alignment
          </span>
          {!backendAvailable && (
            <span className="text-amber-500 font-sans ml-1">• Backend connecting...</span>
          )}
        </div>
      </div>
    )
  }

  // Render State B: Active Transcription / Alignment In Progress
  if (isTranscribing) {
    const stageTitles: Record<ProcessingStage, string> = {
      idle: 'Preparing audio...',
      uploading: 'Uploading audio to local transcription engine...',
      preparing: 'Preparing audio recording for processing...',
      separating_vocals: 'Separating vocals with Demucs (htdemucs)...',
      transcribing: 'Transcribing audio recording with faster-whisper...',
      aligning: 'Aligning word-level timestamps with WhisperX...',
      rendering: 'Building synchronized lyric teleprompter...',
      completed: 'Completed',
      completed_with_warnings: 'Completed with warnings',
      failed: 'Failed',
    }

    const stagesList = [
      { key: 'uploading', label: '1. Uploading' },
      { key: 'separating_vocals', label: '2. Separating Vocals' },
      { key: 'transcribing', label: '3. Transcribing' },
      { key: 'aligning', label: '4. Aligning Words' },
      { key: 'rendering', label: '5. Complete' },
    ]

    const getStageState = (sKey: string) => {
      const order = ['uploading', 'separating_vocals', 'transcribing', 'aligning', 'rendering', 'completed']
      const currentIndex = order.indexOf(stage === 'preparing' ? 'uploading' : stage)
      const targetIndex = order.indexOf(sKey)
      if (targetIndex < currentIndex) return 'done'
      if (targetIndex === currentIndex) return 'active'
      return 'pending'
    }

    return (
      <div
        className="w-full rounded-2xl border p-8 sm:p-12 backdrop-blur-md shadow-md text-center flex flex-col items-center justify-center select-none"
        style={{
          backgroundColor: isDark ? 'rgba(45, 23, 12, 0.85)' : 'rgba(253, 252, 232, 0.94)',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.28)',
        }}
      >
        <div className="relative w-16 h-16 flex items-center justify-center mb-5">
          <Loader2 className="w-12 h-12 text-lion animate-spin" />
          <Cpu className="w-5 h-5 text-kobicha absolute" />
        </div>

        <h3
          className="font-editorial text-2xl font-semibold tracking-tight mb-2"
          style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
        >
          Analyzing Audio
        </h3>

        <p
          className="text-xs sm:text-sm font-mono mb-5 max-w-md animate-pulse"
          style={{ color: isDark ? '#E2CEB1' : '#734128' }}
        >
          {stageTitles[stage] || 'Processing audio locally...'}
        </p>

        {/* Step Indicator Stepper */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-6 text-[11px] font-mono">
          {stagesList.map((st) => {
            const stState = getStageState(st.key)
            return (
              <span
                key={st.key}
                className={`px-2.5 py-1 rounded-full border transition-all ${
                  stState === 'active'
                    ? 'bg-lion text-bistre font-bold border-lion shadow-2xs scale-105'
                    : stState === 'done'
                      ? 'bg-lion/20 text-lion border-lion/40'
                      : isDark
                        ? 'text-dun/40 border-lion/10'
                        : 'text-kobicha/40 border-kobicha/15'
                }`}
              >
                {st.label}
              </span>
            )
          })}
        </div>

        {/* Indeterminate Lion Progress Bar */}
        <div className="w-full max-w-xs h-1.5 bg-lion/20 rounded-full overflow-hidden mb-5 relative">
          <div className="absolute inset-y-0 left-0 bg-lion rounded-full w-1/3 animate-[particle-drift_2s_ease-in-out_infinite]" />
        </div>

        {/* Live Elapsed Counter & Track Context */}
        <div className="flex flex-col items-center gap-1 mb-6 text-xs font-mono">
          <div className="flex items-center gap-2 text-lion font-semibold">
            <Timer className="w-3.5 h-3.5" />
            <span>
              Elapsed: {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
            </span>
            {audioDuration && audioDuration > 0 && (
              <span className="opacity-80 font-normal">
                • Track: {Math.floor(audioDuration / 60)}:{(Math.floor(audioDuration % 60)).toString().padStart(2, '0')}
              </span>
            )}
          </div>
          {trackName && (
            <span
              className="text-[11px] max-w-xs truncate"
              style={{ color: isDark ? '#E2CEB1' : '#734128' }}
              title={trackName}
            >
              {trackName}
            </span>
          )}
          <span className="text-[10px] text-lion/70 pt-0.5">
            100% Local CPU Whisper • ~1-2s per 30s of audio
          </span>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer"
          style={{
            borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
            color: isDark ? '#E2CEB1' : '#734128',
          }}
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel Analysis</span>
        </button>
      </div>
    )
  }

  // Render State C: Error State
  if (error || stage === 'failed') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="w-full rounded-2xl border p-6 sm:p-8 backdrop-blur-md shadow-sm text-center flex flex-col items-center justify-center"
        style={{
          backgroundColor: isDark ? 'rgba(115, 65, 40, 0.35)' : 'rgba(226, 206, 177, 0.45)',
          borderColor: '#C7A07A',
          color: isDark ? '#FDFCE8' : '#391E10',
        }}
      >
        <AlertCircle className="w-10 h-10 text-lion mb-3" />
        <h3 className="font-editorial text-xl font-bold tracking-tight mb-2">
          Transcription Notice
        </h3>
        <p className="text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
          {error ||
            'Unable to process audio locally. Please verify that the local Python backend is running.'}
        </p>
        <button
          type="button"
          onClick={() => onRetry(selectedLanguage, enableVocalSeparation, enableCloud)}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-sm transition-transform hover:scale-102 active:scale-98 cursor-pointer"
          style={{
            backgroundColor: '#734128',
            color: '#FDFCE8',
          }}
        >
          <RefreshCw className="w-4 h-4 text-lion" />
          <span>Retry Analysis</span>
        </button>
      </div>
    )
  }

  // Render State D: Transcription Completed — Synchronized Teleprompter View
  if (!transcription) return null

  const hasWordTimestamps = flatWords.length > 0

  return (
    <div
      className="w-full rounded-[24px] sm:rounded-[30px] border p-5 sm:p-7 backdrop-blur-md shadow-md transition-all select-none"
      style={{
        backgroundColor: isDark ? 'rgba(45, 23, 12, 0.88)' : '#FBF7EE',
        borderColor: isDark ? 'rgba(199, 160, 122, 0.32)' : 'rgba(216, 194, 167, 0.9)',
      }}
    >
      {/* 1. Header Toolbar: Title, Badges, Font Controls, Auto-Scroll, Copy */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-lion/20">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-lion/15 border border-lion/30 flex items-center justify-center text-lion">
            <CheckCircle2 className="w-4 h-4 text-lion" />
          </div>
          <h3
            className="font-editorial text-lg sm:text-xl font-semibold tracking-tight"
            style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
          >
            Synchronized Lyrics
          </h3>

          {/* Transliteration badge */}
          <span
            className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-lion/30 text-lion bg-lion/10 flex items-center gap-1"
            title="Lyrics are displayed using English/Roman alphabet transliteration"
          >
            <Sparkles className="w-3 h-3 text-lion" />
            <span>English Alphabet</span>
          </span>

          {/* Detected Language badge */}
          {transcription.detected_language_name && (
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-lion/20 opacity-80"
              style={{ color: isDark ? '#E2CEB1' : '#734128' }}
            >
              Language: {transcription.detected_language_name}
            </span>
          )}

          {/* Engine Provider Badge */}
          {transcription.engine_used === 'groq' && (
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-amber-500/40 text-amber-400 bg-amber-500/10 flex items-center gap-1"
              title="Transcribed via Groq Cloud API (whisper-large-v3)"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Groq Cloud</span>
            </span>
          )}

          {transcription.engine_used === 'local_whisper' && (
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-lion/30 text-lion bg-lion/10 flex items-center gap-1"
              title={
                transcription.fallback_used
                  ? `Fell back to local Whisper: ${transcription.fallback_reason}`
                  : 'Transcribed locally with faster-whisper'
              }
            >
              <Cpu className="w-3 h-3 text-lion" />
              <span>{transcription.fallback_used ? 'Local Fallback' : 'Local Whisper'}</span>
            </span>
          )}

          {/* Automatic Fallback Notice Badge */}
          {transcription.fallback_used && (
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-amber-500/40 text-amber-300 bg-amber-500/10 flex items-center gap-1"
              title={`Cloud transcription failed; automatic fallback was triggered: ${transcription.fallback_reason}`}
            >
              <RefreshCw className="w-3 h-3 text-amber-300" />
              <span>Fallback Triggered</span>
            </span>
          )}

          {/* Honest Word Alignment Status Badge */}
          {transcription.alignment_status === 'completed' && (
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 flex items-center gap-1"
              title={`Word-level alignment verified: ${transcription.aligned_words_count ?? flatWords.length} of ${transcription.total_words_count ?? flatWords.length} words`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>
                Aligned ({transcription.aligned_words_count ?? flatWords.length}/
                {transcription.total_words_count ?? flatWords.length} words)
              </span>
            </span>
          )}

          {transcription.alignment_status === 'partial' && (
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-amber-500/40 text-amber-400 bg-amber-500/10 flex items-center gap-1"
              title={`Partial word-level alignment: ${transcription.aligned_words_count ?? 0} of ${transcription.total_words_count ?? 0} words`}
            >
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>
                Partial Sync ({transcription.aligned_words_count ?? 0}/
                {transcription.total_words_count ?? 0} words)
              </span>
            </span>
          )}

          {(transcription.alignment_status === 'unavailable' ||
            transcription.alignment_status === 'failed' ||
            transcription.alignment_status === 'unsupported') && (
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-lion/30 text-lion/80 bg-lion/10 flex items-center gap-1"
              title="Word-level alignment unavailable. Lyrics synchronized at line/segment level."
            >
              <Timer className="w-3 h-3 text-lion" />
              <span>Segment Sync</span>
            </span>
          )}

          {transcription.alignment_status === 'native' && (
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-blue-500/40 text-blue-300 bg-blue-500/10 flex items-center gap-1"
              title="Whisper native word timestamps used (no phonetic WhisperX model available for this language)"
            >
              <Timer className="w-3 h-3 text-blue-300" />
              <span>Native Timestamps</span>
            </span>
          )}

          {/* Music / Speech Detection Badge */}
          {transcription.music_detected !== undefined && transcription.music_detected !== null && (
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-lion/30 text-lion bg-lion/10 flex items-center gap-1"
              title={
                transcription.music_detected
                  ? 'Acoustic pause analysis detected music energy'
                  : 'Acoustic pause analysis detected speech energy'
              }
            >
              <Music2 className="w-3 h-3 text-lion" />
              <span>{transcription.music_detected ? 'Music Detected' : 'Speech Detected'}</span>
            </span>
          )}

          {/* Known Lyrics Mode Badge */}
          {transcription.known_lyrics_used && (
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300 bg-emerald-500/10 flex items-center gap-1"
              title="Forced alignment performed directly against user-provided reference lyrics"
            >
              <FileText className="w-3 h-3 text-emerald-300" />
              <span>Known Lyrics Mode</span>
            </span>
          )}

          {/* Vocal Separation Status Badge */}
          {transcription.vocal_separation_used && (
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-purple-500/40 text-purple-300 bg-purple-500/10 flex items-center gap-1"
              title={`Vocal separation result: ${transcription.separation_status}`}
            >
              <Sparkles className="w-3 h-3 text-purple-300" />
              <span>Vocals Isolated ({transcription.separation_status})</span>
            </span>
          )}

          {/* Notices / Warnings Drawer Toggle */}
          {transcription.warnings && transcription.warnings.length > 0 && (
            <button
              type="button"
              onClick={() => setShowWarnings((prev) => !prev)}
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer flex items-center gap-1"
              title="Click to view alignment and audio analysis notices"
            >
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>
                {transcription.warnings.length} Notice
                {transcription.warnings.length > 1 ? 's' : ''}
              </span>
            </button>
          )}
        </div>

        {/* Right Controls: Font Size, Auto-scroll, Copy */}
        <div className="flex items-center gap-2">
          {/* Font Size Selector */}
          <div
            className="flex items-center rounded-xl border p-0.5 text-xs font-mono"
            style={{
              backgroundColor: isDark ? 'rgba(57, 30, 16, 0.6)' : 'rgba(226, 206, 177, 0.35)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
            }}
          >
            {(['normal', 'large', 'stage'] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                aria-label={`Set font size to ${size}`}
                className={`px-2 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                  fontSize === size
                    ? 'bg-lion text-bistre font-bold shadow-2xs'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Auto-scroll Toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll((prev) => !prev)}
            title={`Auto-scroll is ${autoScroll ? 'enabled' : 'disabled'}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono border transition-all cursor-pointer ${
              autoScroll
                ? 'bg-lion/20 border-lion text-lion'
                : 'opacity-50 border-lion/20'
            }`}
          >
            Scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>

          {/* Copy Transcript Button */}
          <button
            type="button"
            onClick={handleCopyTranscript}
            title="Copy recognized lyrics to clipboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-colors cursor-pointer hover:bg-lion/10"
            style={{
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
              color: isDark ? '#E2CEB1' : '#734128',
            }}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* 2. Collapsible Alignment & Audio Inspection Notices (Separate from lyric text) */}
      {showWarnings && transcription.warnings && transcription.warnings.length > 0 && (
        <div
          className="mb-4 p-3.5 rounded-2xl border text-xs font-mono space-y-1.5 transition-all text-left"
          style={{
            backgroundColor: isDark ? 'rgba(115, 65, 40, 0.25)' : 'rgba(226, 206, 177, 0.45)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.3)',
            color: isDark ? '#E2CEB1' : '#734128',
          }}
        >
          <div className="font-semibold text-lion flex items-center justify-between pb-1 border-b border-lion/20">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Inspection & Alignment Notices ({transcription.warnings.length})</span>
            </span>
            <button
              type="button"
              onClick={() => setShowWarnings(false)}
              className="text-[10px] opacity-75 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          {transcription.warnings.map((w, idx) => (
            <div key={idx} className="text-[11px] leading-relaxed opacity-90">
              • {w}
            </div>
          ))}
        </div>
      )}

      {/* 2. Spacious Detected Lyrics Display */}
      <div
        ref={containerRef}
        className="w-full max-h-[380px] sm:max-h-[460px] overflow-y-auto px-2 sm:px-4 py-4 space-y-4 sm:space-y-6 scroll-smooth text-left"
        style={{ scrollbarWidth: 'thin' }}
      >
        {transcription.segments.map((seg, sIdx) => {
          const isSegmentActive = sIdx === activeSegmentIndex

          return (
            <div
              key={`segment-${sIdx}`}
              ref={isSegmentActive && !hasWordTimestamps ? activeSegmentRef : undefined}
              className={`p-3.5 sm:p-4 rounded-2xl transition-all duration-200 ${
                isSegmentActive && !hasWordTimestamps
                  ? 'bg-lion/15 border border-lion/30 shadow-xs'
                  : 'hover:bg-lion/5'
              }`}
            >
              <p className={`font-editorial ${fontClasses} tracking-tight`}>
                {seg.words && seg.words.length > 0 ? (
                  // Render each word as an interactive token
                  seg.words.map((w, wIdx) => {
                    const wordId = `word-${sIdx}-${wIdx}`
                    const isWordActive = wordId === activeWordId
                    const hasTiming = w.start !== null && w.end !== null
                    const isLowConfidence = Boolean(w.low_confidence)
                    const isEditingThisWord =
                      editingWord?.sIdx === sIdx && editingWord?.wIdx === wIdx

                    if (isEditingThisWord) {
                      return (
                        <input
                          key={wordId}
                          type="text"
                          autoFocus
                          value={editingWord.text}
                          onChange={(e) =>
                            setEditingWord({ ...editingWord, text: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (onUpdateWord) {
                                onUpdateWord(sIdx, wIdx, editingWord.text)
                              }
                              setEditingWord(null)
                            } else if (e.key === 'Escape') {
                              setEditingWord(null)
                            }
                          }}
                          onBlur={() => {
                            if (onUpdateWord && editingWord.text !== w.word) {
                              onUpdateWord(sIdx, wIdx, editingWord.text)
                            }
                            setEditingWord(null)
                          }}
                          className="inline-block mx-1 my-0.5 px-2 py-0.5 rounded border border-lion bg-dun/30 text-lion font-bold text-center focus:outline-none focus:ring-1 focus:ring-lion shadow-2xs"
                          style={{
                            width: `${Math.max(w.word.length, editingWord.text.length, 2) + 2}ch`,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )
                    }

                    return (
                      <span
                        key={wordId}
                        ref={isWordActive ? activeWordRef : undefined}
                        onClick={(e) => {
                          if (isLowConfidence) {
                            e.stopPropagation()
                            setEditingWord({ sIdx, wIdx, text: w.word })
                          } else if (hasTiming && onSeek && w.start !== null) {
                            onSeek(w.start)
                          }
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          setEditingWord({ sIdx, wIdx, text: w.word })
                        }}
                        title={
                          isLowConfidence
                            ? `Low confidence word (${Math.round((w.probability ?? 0) * 100)}%). Click to correct text.`
                            : w.original_word && w.original_word !== w.word
                              ? `Original script: ${w.original_word} (Double-click to edit)`
                              : 'Double-click to edit text'
                        }
                        className={`inline-block mx-1 my-0.5 px-1.5 py-0.5 rounded-lg transition-all duration-150 ${
                          hasTiming ? 'cursor-pointer' : ''
                        } ${
                          isLowConfidence ? 'border-b border-dotted border-[#C7A07A]' : ''
                        } ${
                          isWordActive
                            ? 'bg-[#C7A07A] text-[#391E10] font-bold scale-[1.06] shadow-sm ring-2 ring-[#734128]/20'
                            : isSegmentActive
                              ? isDark
                                ? 'text-[#FDFCE8]'
                                : 'text-[#391E10]'
                              : isDark
                                ? 'text-[#E2CEB1]/75 hover:text-[#FDFCE8]'
                                : 'text-[#734128]/80 hover:text-[#391E10]'
                        }`}
                      >
                        {w.word}
                      </span>
                    )
                  })
                ) : (
                  // Plain segment text if word tokens are not present
                  <span
                    className={
                      isSegmentActive
                        ? isDark
                          ? 'text-[#FDFCE8] font-bold'
                          : 'text-[#391E10] font-bold'
                        : isDark
                          ? 'text-[#E2CEB1]/80'
                          : 'text-[#734128]/80'
                    }
                  >
                    {seg.text}
                  </span>
                )}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
