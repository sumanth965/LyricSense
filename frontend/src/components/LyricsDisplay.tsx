import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Cpu,
  FileText,
  Globe,
  Loader2,
  RefreshCw,
  Sparkles,
  Timer,
  X,
} from 'lucide-react'
import type { ProcessingStage, Theme, TranscriptionResponse } from '../types'

interface LyricsDisplayProps {
  transcription: TranscriptionResponse | null
  stage: ProcessingStage
  error: string | null
  isTranscribing: boolean
  currentTime: number
  isPlaying: boolean
  onAnalyze: (language?: string) => void
  onCancel: () => void
  onRetry: (language?: string) => void
  onSeek?: (time: number) => void
  theme: Theme
  backendAvailable?: boolean
  audioDuration?: number
  trackName?: string
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
  theme,
  backendAvailable = true,
  audioDuration,
  trackName,
}: LyricsDisplayProps) {
  const isDark = theme === 'dark'
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeWordRef = useRef<HTMLSpanElement | null>(null)
  const activeSegmentRef = useRef<HTMLDivElement | null>(null)

  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto')
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
    }

    if (nextWordId !== activeWordId) {
      setActiveWordId(nextWordId)
    }
    if (nextSegIdx !== activeSegmentIndex) {
      setActiveSegmentIndex(nextSegIdx)
    }
  }, [currentTime, flatWords, transcription, activeWordId, activeSegmentIndex])

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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-5">
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

        {/* Primary Analyze Audio Action Button */}
        <button
          type="button"
          onClick={() => onAnalyze(selectedLanguage)}
          className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-102 active:scale-98 shadow-md cursor-pointer mb-4"
          style={{
            backgroundColor: '#734128',
            color: '#FDFCE8',
          }}
        >
          <Cpu className="w-4 h-4 text-lion" />
          <span>Analyze Audio</span>
        </button>

        {/* Local Processing & Privacy Badge */}
        <div
          className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono"
          style={{ color: isDark ? 'rgba(226, 206, 177, 0.8)' : 'rgba(115, 65, 40, 0.85)' }}
        >
          <span className="inline-flex items-center gap-1.5 text-lion">
            <Sparkles className="w-3.5 h-3.5" /> 100% Local Processing • Zero External APIs
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
      transcribing: 'Transcribing full audio recording with faster-whisper...',
      aligning: 'Aligning word-level timestamps...',
      rendering: 'Building synchronized lyric teleprompter...',
      completed: 'Completed',
      completed_with_warnings: 'Completed with warnings',
      failed: 'Failed',
    }

    const stagesList = [
      { key: 'uploading', label: '1. Uploading' },
      { key: 'transcribing', label: '2. Transcribing' },
      { key: 'aligning', label: '3. Aligning Words' },
      { key: 'rendering', label: '4. Complete' },
    ]

    const getStageState = (sKey: string) => {
      const order = ['uploading', 'transcribing', 'aligning', 'rendering', 'completed']
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
          onClick={() => onRetry(selectedLanguage)}
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
      {/* 1. Header Toolbar: Title, Font Controls, Auto-Scroll, Copy */}
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
          <span
            className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-lion/30 text-lion bg-lion/10 flex items-center gap-1"
            title="Lyrics are displayed using English/Roman alphabet transliteration"
          >
            <Sparkles className="w-3 h-3 text-lion" />
            <span>English Alphabet</span>
          </span>
          {transcription.detected_language_name && (
            <span
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-lion/20 opacity-80"
              style={{ color: isDark ? '#E2CEB1' : '#734128' }}
            >
              Language: {transcription.detected_language_name}
            </span>
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
                  fontSize === size ? 'bg-lion text-bistre font-bold shadow-2xs' : 'opacity-70 hover:opacity-100'
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

                    return (
                      <span
                        key={wordId}
                        ref={isWordActive ? activeWordRef : undefined}
                        onClick={() => {
                          if (hasTiming && onSeek && w.start !== null) {
                            onSeek(w.start)
                          }
                        }}
                        title={
                          w.original_word && w.original_word !== w.word
                            ? `Original script: ${w.original_word}`
                            : undefined
                        }
                        className={`inline-block mx-1 my-0.5 px-1.5 py-0.5 rounded-lg transition-all duration-150 ${
                          hasTiming ? 'cursor-pointer' : ''
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
