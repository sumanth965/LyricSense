import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Headphones,
  Languages,
  Mic,
  Music2,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Trophy,
  Volume2,
  X,
} from 'lucide-react'
import { scoreSingalongRecording } from '../lib/api'
import type {
  LeaderboardEntry,
  ScoreResponse,
  SegmentItem,
  Theme,
} from '../types'

interface SingAlongModalProps {
  isOpen: boolean
  onClose: () => void
  analysisId: string
  trackName?: string
  audioDuration: number
  segments: SegmentItem[]
  transcript?: string
  transliterated?: boolean
  language?: string | null
  currentTime: number
  isPlaying?: boolean
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  theme: Theme
}

type ModalStage = 'preflight' | 'countdown' | 'recording' | 'scoring' | 'results'

export default function SingAlongModal({
  isOpen,
  onClose,
  analysisId,
  trackName = 'Current Track',
  audioDuration,
  segments,
  transcript,
  transliterated,
  language,
  currentTime,
  onPlay,
  onPause,
  onSeek,
  theme,
}: SingAlongModalProps) {
  const isDark = theme === 'dark'

  // Modal Stage
  const [stage, setStage] = useState<ModalStage>('preflight')
  const [countdownValue, setCountdownValue] = useState<number>(3)

  // Mic state & live meter
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  const [micVolume, setMicVolume] = useState<number>(0)
  const [micError, setMicError] = useState<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [recordingElapsed, setRecordingElapsed] = useState<number>(0)
  const recordIntervalRef = useRef<number | null>(null)

  // Section Selector: range start / end in seconds
  const [scoreRangeType, setScoreRangeType] = useState<'full' | 'section'>('full')
  const [selectedStartLine, setSelectedStartLine] = useState<number>(0)
  const [selectedEndLine, setSelectedEndLine] = useState<number>(
    Math.max(0, segments.length - 1),
  )

  const rangeStart = useMemo(() => {
    if (scoreRangeType === 'full' || segments.length === 0) return 0
    return Math.max(0, segments[selectedStartLine]?.start ?? 0)
  }, [scoreRangeType, segments, selectedStartLine])

  const rangeEnd = useMemo(() => {
    if (scoreRangeType === 'full' || segments.length === 0) return audioDuration
    return Math.min(audioDuration, segments[selectedEndLine]?.end ?? audioDuration)
  }, [scoreRangeType, segments, selectedEndLine, audioDuration])

  // Scoring response & errors
  const [scoreResult, setScoreResult] = useState<ScoreResponse | null>(null)
  const [scoringError, setScoringError] = useState<string | null>(null)
  const [selectedResultLineIndex, setSelectedResultLineIndex] = useState<number | null>(
    null,
  )
  const [activeResultsTab, setActiveResultsTab] = useState<
    'lines' | 'pitch' | 'leaderboard'
  >('lines')

  // Leaderboard state
  const leaderboardStorageKey = useMemo(
    () => `lyricsense_leaderboard_${(trackName || 'session').replace(/\s+/g, '_').toLowerCase()}`,
    [trackName],
  )
  const [nickname, setNickname] = useState<string>('')
  const [hasSavedLeaderboard, setHasSavedLeaderboard] = useState<boolean>(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  // Load leaderboard from localStorage
  const loadLeaderboard = useCallback(() => {
    try {
      const raw = localStorage.getItem(leaderboardStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as LeaderboardEntry[]
        setLeaderboard(parsed.sort((a, b) => b.score - a.score).slice(0, 10))
      } else {
        setLeaderboard([])
      }
    } catch {
      setLeaderboard([])
    }
  }, [leaderboardStorageKey])

  useEffect(() => {
    loadLeaderboard()
  }, [loadLeaderboard])

  const micStreamRef = useRef<MediaStream | null>(null)

  // Request Microphone and start live volume meter
  const startMicMeter = useCallback(async () => {
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      })
      micStreamRef.current = stream
      setMicStream(stream)

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      audioContextRef.current = ctx

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateMeter = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const avg = sum / dataArray.length
        // Smooth scaling 0 - 100
        const normalized = Math.min(100, Math.round((avg / 128) * 100))
        setMicVolume(normalized)
        animFrameRef.current = requestAnimationFrame(updateMeter)
      }
      updateMeter()
    } catch (err: unknown) {
      console.warn('Microphone permission error:', err)
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser settings to sing along.'
          : 'Could not access your microphone. Please check your audio input settings.'
      setMicError(msg)
    }
  }, [])

  // Cleanup mic & audio context
  const stopMicMeter = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
    setMicStream(null)
    setMicVolume(0)
  }, [])

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStage('preflight')
      setScoreResult(null)
      setScoringError(null)
      setHasSavedLeaderboard(false)
      startMicMeter()
    } else {
      stopMicMeter()
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current)
        recordIntervalRef.current = null
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
    return () => {
      stopMicMeter()
    }
  }, [isOpen]) // Only trigger on modal open/close

  // Stop recording and trigger scoring
  const handleStopRecording = useCallback(() => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current)
      recordIntervalRef.current = null
    }
    onPause()

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setStage('scoring')
  }, [onPause])

  // Countdown timer triggering recording
  useEffect(() => {
    if (stage !== 'countdown') return

    setCountdownValue(3)
    const timer = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Start recording
          setStage('recording')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [stage])

  // Recording lifecycle
  useEffect(() => {
    if (stage !== 'recording' || !micStream) return

    audioChunksRef.current = []
    setRecordingElapsed(0)

    // Seek song audio to rangeStart and play
    onSeek(rangeStart)
    onPlay()

    let recorder: MediaRecorder
    try {
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
      const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || ''
      recorder = new MediaRecorder(micStream, supportedMime ? { mimeType: supportedMime } : undefined)
    } catch {
      recorder = new MediaRecorder(micStream)
    }
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        audioChunksRef.current.push(e.data)
      }
    }

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      })
      try {
        setStage('scoring')
        const result = await scoreSingalongRecording(analysisId, audioBlob, {
          rangeStart,
          rangeEnd,
          keyShift: 'auto',
          latencyMs: 'auto',
        })
        setScoreResult(result)
        setStage('results')
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Scoring server encountered an unexpected error.'
        setScoringError(errorMsg)
        setStage('results')
      }
    }

    recorder.start(250) // collect slice every 250ms

    // Track elapsed time & auto-stop at rangeEnd
    const startTime = Date.now()
    recordIntervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      setRecordingElapsed(elapsed)

      // If user reaches rangeEnd, auto-finish
      if (rangeStart + elapsed >= rangeEnd) {
        handleStopRecording()
      }
    }, 200)

    return () => {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current)
        recordIntervalRef.current = null
      }
    }
  }, [stage, micStream, rangeStart, rangeEnd, analysisId, onPlay, onSeek, handleStopRecording])

  // Save score to leaderboard
  const handleSaveToLeaderboard = () => {
    if (!nickname.trim() || !scoreResult || hasSavedLeaderboard) return

    const newEntry: LeaderboardEntry = {
      nickname: nickname.trim(),
      score: scoreResult.overall_score,
      grade: scoreResult.grade,
      timestamp: Date.now(),
      songName: trackName,
      keyShift: scoreResult.key_shift_semitones,
    }

    const updated = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    try {
      localStorage.setItem(leaderboardStorageKey, JSON.stringify(updated))
      setLeaderboard(updated)
      setHasSavedLeaderboard(true)
    } catch (e) {
      console.warn('Failed to save to localStorage:', e)
    }
  }

  // Flat words list for exact word-level timestamp interval search
  const flatWords = useMemo(() => {
    if (!segments || segments.length === 0) return []
    const list: Array<{
      id: string
      word: string
      start: number
      end: number
      segmentIndex: number
      wordIndex: number
    }> = []

    segments.forEach((seg, sIdx) => {
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
              id: `saword-${sIdx}-${wIdx}`,
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

    list.sort((a, b) => a.start - b.start || a.end - b.end)
    return list
  }, [segments])

  // Active word and active segment index synchronization
  const [activeWordId, setActiveWordId] = useState<string | null>(null)
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0)
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null)
  const activeLineRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!segments || segments.length === 0) {
      if (activeWordId !== null) setActiveWordId(null)
      if (activeSegmentIndex !== -1) setActiveSegmentIndex(-1)
      return
    }

    // 1. Search for word match if word timestamps exist
    let matchedWord: { id: string; segmentIndex: number; wordIndex: number } | null = null
    if (flatWords.length > 0) {
      for (let i = 0; i < flatWords.length; i++) {
        const item = flatWords[i]
        if (currentTime >= item.start && currentTime <= item.end) {
          matchedWord = item
          break
        }
      }
    }

    const nextWordId = matchedWord ? matchedWord.id : null

    // 2. Determine active segment index
    let nextSegIdx = -1
    if (matchedWord) {
      nextSegIdx = matchedWord.segmentIndex
    } else {
      nextSegIdx = segments.findIndex(
        (seg) => currentTime >= seg.start && currentTime <= seg.end,
      )
      if (nextSegIdx === -1) {
        if (currentTime < segments[0].start) {
          nextSegIdx = 0
        } else {
          // Find closest segment before currentTime
          for (let i = segments.length - 1; i >= 0; i--) {
            if (currentTime >= segments[i].start) {
              nextSegIdx = i
              break
            }
          }
          if (nextSegIdx === -1) nextSegIdx = 0
        }
      }
    }

    if (nextWordId !== activeWordId) {
      setActiveWordId(nextWordId)
    }
    if (nextSegIdx !== activeSegmentIndex && nextSegIdx >= 0) {
      setActiveSegmentIndex(nextSegIdx)
    }
  }, [currentTime, flatWords, segments, activeWordId, activeSegmentIndex])

  // Auto-scroll lyrics container ONLY when active segment changes
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    }
  }, [activeSegmentIndex, stage])

  // Grade color
  const gradeColor = useMemo(() => {
    if (!scoreResult) return '#C7A07A'
    if (scoreResult.overall_score >= 85) return '#10B981' // emerald
    if (scoreResult.overall_score >= 70) return '#C7A07A' // lion
    if (scoreResult.overall_score >= 50) return '#F59E0B' // amber
    return '#EF4444' // red
  }, [scoreResult])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sing Along Live Scoring"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-3xl rounded-[28px] border p-5 sm:p-7 shadow-2xl relative transition-all my-auto max-h-[92vh] overflow-y-auto"
        style={{
          backgroundColor: isDark ? 'rgba(38, 18, 9, 0.98)' : 'rgba(253, 252, 232, 0.99)',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.4)' : 'rgba(115, 65, 40, 0.3)',
          color: isDark ? '#FDFCE8' : '#391E10',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            if (stage === 'recording') {
              handleStopRecording()
            }
            onClose()
          }}
          className="absolute top-5 right-5 p-2 rounded-full border transition-colors hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
            backgroundColor: isDark ? 'rgba(57, 30, 16, 0.5)' : '#EFE7D8',
            color: isDark ? '#E2CEB1' : '#734128',
          }}
          aria-label="Close Sing Along"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ---------------- STAGE 1: PRE-FLIGHT MODAL ---------------- */}
        {stage === 'preflight' && (
          <div className="flex flex-col text-center">
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-lion/20 text-left">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs shrink-0"
                  style={{
                    backgroundColor: isDark ? 'rgba(115, 65, 40, 0.5)' : '#EAE0CE',
                    borderColor: '#C7A07A',
                  }}
                >
                  <Mic className="w-5 h-5 text-lion" />
                </div>
                <div>
                  <h2 className="font-editorial text-xl sm:text-2xl font-bold tracking-tight">
                    Sing-Along Studio
                  </h2>
                  <p
                    className="text-xs truncate max-w-[280px] sm:max-w-md"
                    style={{ color: isDark ? '#E2CEB1' : '#734128' }}
                  >
                    {trackName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {language && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono border uppercase tracking-wider"
                    style={{
                      borderColor: isDark ? 'rgba(199, 160, 122, 0.4)' : 'rgba(115, 65, 40, 0.3)',
                      backgroundColor: isDark ? 'rgba(57, 30, 16, 0.5)' : '#F5EFE3',
                      color: isDark ? '#E2CEB1' : '#734128',
                    }}
                    title={`Detected singing language: ${language.toUpperCase()}`}
                  >
                    {language}
                  </span>
                )}

                {transliterated && (
                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono border flex items-center gap-1.5"
                    style={{
                      borderColor: isDark ? 'rgba(199, 160, 122, 0.4)' : 'rgba(115, 65, 40, 0.3)',
                      backgroundColor: isDark ? 'rgba(199, 160, 122, 0.15)' : 'rgba(199, 160, 122, 0.25)',
                      color: isDark ? '#E2CEB1' : '#734128',
                    }}
                    title="Lyrics transliterated into Roman English alphabet"
                  >
                    <Languages className="w-3.5 h-3.5 text-lion" />
                    <span>Romanized</span>
                  </span>
                )}
              </div>
            </div>

            {/* Compact Mic Status & Headphones Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3 text-left">
              {/* Headphones Reminder Banner */}
              <div
                className="p-2.5 rounded-xl border flex items-center gap-2.5 text-xs"
                style={{
                  backgroundColor: isDark ? 'rgba(115, 65, 40, 0.25)' : 'rgba(234, 224, 206, 0.5)',
                  borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
                }}
              >
                <Headphones className="w-4 h-4 text-lion shrink-0" />
                <span className="opacity-90 leading-tight">
                  <strong className="block font-semibold">Headphones recommended</strong>
                  Prevents speaker bleed into your microphone.
                </span>
              </div>

              {/* Live Mic Meter */}
              <div
                className="p-2.5 rounded-xl border flex flex-col justify-center text-xs"
                style={{
                  backgroundColor: isDark ? 'rgba(57, 30, 16, 0.4)' : '#F5EFE3',
                  borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-lion" />
                    Microphone
                  </span>
                  <span className="font-mono text-lion">
                    {micError ? 'Not detected' : micVolume > 5 ? 'Singing detected' : 'Listening...'}
                  </span>
                </div>

                {micError ? (
                  <div className="flex items-center gap-1 text-[11px] text-rose-500 font-sans">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{micError}</span>
                  </div>
                ) : (
                  <div className="w-full h-2 bg-black/15 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{
                        width: `${Math.max(4, micVolume)}%`,
                        backgroundColor: micVolume > 60 ? '#10B981' : micVolume > 20 ? '#C7A07A' : '#734128',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Dedicated Teleprompter Lyrics Section */}
            <div className="w-full text-left mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold tracking-wide uppercase font-mono opacity-80 flex items-center gap-1.5">
                  <Music2 className="w-3.5 h-3.5 text-lion" />
                  Song Lyrics Preview & Teleprompter
                </span>
                <span className="text-[11px] font-mono text-lion">
                  {segments.length > 0
                    ? `${segments.length} lines • ${transcript ? transcript.split(/\s+/).filter(Boolean).length : flatWords.length} words`
                    : 'No lyrics'}
                </span>
              </div>

              <div
                ref={lyricsContainerRef}
                className="w-full rounded-2xl border p-4 overflow-y-auto max-h-[36vh] min-h-[160px] space-y-3.5 transition-all text-center"
                style={{
                  backgroundColor: isDark ? 'rgba(28, 14, 7, 0.75)' : '#FAF6ED',
                  borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
                }}
              >
                {segments.length === 0 ? (
                  <div className="py-8 text-center text-xs opacity-75 font-mono">
                    No extracted lyrics available. Analyze a song first.
                  </div>
                ) : (
                  segments.map((seg, sIdx) => {
                    const isLineActive = sIdx === activeSegmentIndex
                    const isUpcoming = sIdx > activeSegmentIndex

                    return (
                      <div
                        key={sIdx}
                        ref={isLineActive ? activeLineRef : null}
                        className={`p-2.5 rounded-xl transition-all duration-200 ${
                          isLineActive
                            ? 'scale-[1.01] shadow-xs'
                            : isUpcoming
                              ? 'opacity-85'
                              : 'opacity-40'
                        }`}
                        style={{
                          backgroundColor: isLineActive
                            ? isDark
                              ? 'rgba(115, 65, 40, 0.45)'
                              : 'rgba(199, 160, 122, 0.3)'
                            : 'transparent',
                          border: isLineActive
                            ? `1px solid ${isDark ? 'rgba(199, 160, 122, 0.5)' : '#C7A07A'}`
                            : '1px solid transparent',
                        }}
                      >
                        <p
                          className={`font-editorial transition-colors leading-relaxed ${
                            isLineActive
                              ? 'text-xl sm:text-2xl font-bold'
                              : 'text-base sm:text-lg font-medium'
                          }`}
                        >
                          {seg.words && seg.words.length > 0 ? (
                            seg.words.map((w, wIdx) => {
                              const wordId = `saword-${sIdx}-${wIdx}`
                              const isWordActive = activeWordId === wordId

                              return (
                                <span
                                  key={wIdx}
                                  className={`inline-block mx-0.5 px-1 py-0.5 rounded transition-all duration-100 ${
                                    isWordActive
                                      ? 'bg-lion text-bistre font-black scale-105 shadow-xs'
                                      : isLineActive
                                        ? isDark
                                          ? 'text-[#FDFCE8]'
                                          : 'text-[#391E10]'
                                        : isDark
                                          ? 'text-[#E2CEB1]'
                                          : 'text-[#734128]'
                                  }`}
                                >
                                  {w.word}
                                </span>
                              )
                            })
                          ) : (
                            <span
                              className={
                                isLineActive
                                  ? 'text-lion font-bold'
                                  : isDark
                                    ? 'text-[#E2CEB1]'
                                    : 'text-[#734128]'
                              }
                            >
                              {seg.text}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <span className="text-[10px] font-mono opacity-60">
                            {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                          </span>
                          {isLineActive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider bg-lion text-bistre font-bold">
                              Current Line
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Section Selection */}
            {segments.length > 1 && (
              <div className="w-full text-left mb-3.5 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold block opacity-90">
                    Sing-Along Take Range
                  </span>
                  <span className="font-mono text-[11px] text-lion">
                    {scoreRangeType === 'full'
                      ? `Full track (${Math.round(audioDuration)}s)`
                      : `Selected: ${rangeStart.toFixed(1)}s - ${rangeEnd.toFixed(1)}s`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setScoreRangeType('full')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      scoreRangeType === 'full'
                        ? 'bg-lion text-bistre border-lion font-bold shadow-xs'
                        : 'border-lion/30 hover:bg-lion/10'
                    }`}
                  >
                    Entire Song ({Math.round(audioDuration)}s)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreRangeType('section')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      scoreRangeType === 'section'
                        ? 'bg-lion text-bistre border-lion font-bold shadow-xs'
                        : 'border-lion/30 hover:bg-lion/10'
                    }`}
                  >
                    Score a Section (Demo)
                  </button>
                </div>

                {scoreRangeType === 'section' && (
                  <div
                    className="p-2.5 rounded-xl border grid grid-cols-2 gap-2.5"
                    style={{
                      borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
                      backgroundColor: isDark ? 'rgba(57, 30, 16, 0.3)' : '#F5EFE3',
                    }}
                  >
                    <div>
                      <span className="block text-[11px] opacity-75 mb-1">From Line:</span>
                      <select
                        value={selectedStartLine}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setSelectedStartLine(v)
                          if (v > selectedEndLine) setSelectedEndLine(v)
                        }}
                        className="w-full text-xs p-1.5 rounded-lg border bg-transparent"
                        style={{ borderColor: '#C7A07A' }}
                      >
                        {segments.map((seg, idx) => (
                          <option key={idx} value={idx} className="text-black">
                            #{idx + 1}: {seg.text.slice(0, 24)}...
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="block text-[11px] opacity-75 mb-1">To Line:</span>
                      <select
                        value={selectedEndLine}
                        onChange={(e) => setSelectedEndLine(Number(e.target.value))}
                        className="w-full text-xs p-1.5 rounded-lg border bg-transparent"
                        style={{ borderColor: '#C7A07A' }}
                      >
                        {segments.map((seg, idx) => (
                          <option
                            key={idx}
                            value={idx}
                            disabled={idx < selectedStartLine}
                            className="text-black"
                          >
                            #{idx + 1}: {seg.text.slice(0, 24)}...
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ready to Sing Button */}
            <button
              type="button"
              disabled={Boolean(micError) || segments.length === 0}
              onClick={() => {
                setStage('countdown')
              }}
              className="w-full py-3.5 px-6 rounded-full text-sm font-bold shadow-md transition-all hover:scale-101 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor: '#734128',
                color: '#FDFCE8',
              }}
            >
              <Mic className="w-4 h-4 text-lion" />
              <span>Ready — Start 3-2-1 Countdown & Sing</span>
            </button>
          </div>
        )}

        {/* ---------------- STAGE 2: COUNTDOWN ---------------- */}
        {stage === 'countdown' && (
          <div className="flex flex-col items-center justify-center py-12 text-center select-none">
            <span className="text-xs uppercase tracking-widest font-mono text-lion mb-3">
              Get ready to sing
            </span>
            <div className="w-24 h-24 rounded-full border-4 border-lion/30 flex items-center justify-center animate-bounce mb-3 bg-lion/15">
              <span className="font-editorial text-5xl font-bold text-lion">
                {countdownValue}
              </span>
            </div>
            <p
              className="text-sm font-editorial max-w-sm"
              style={{ color: isDark ? '#E2CEB1' : '#734128' }}
            >
              Backing track starts immediately. Follow the synchronized lyrics!
            </p>
          </div>
        )}

        {/* ---------------- STAGE 3: RECORDING IN PROGRESS ---------------- */}
        {stage === 'recording' && (
          <div className="flex flex-col items-center text-center">
            {/* Top Indicator */}
            <div className="w-full flex items-center justify-between pb-2.5 mb-3 border-b border-lion/20">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-red-500 tracking-wider uppercase">
                  Recording Your Take
                </span>
              </div>
              <div className="text-xs font-mono font-semibold text-lion">
                {Math.floor(recordingElapsed / 60)
                  .toString()
                  .padStart(2, '0')}
                :
                {Math.floor(recordingElapsed % 60)
                  .toString()
                  .padStart(2, '0')}
              </div>
            </div>

            {/* Dedicated Teleprompter Multi-Line Lyric Scroll View */}
            <div
              ref={lyricsContainerRef}
              className="w-full rounded-2xl border p-4 sm:p-5 mb-4 text-center overflow-y-auto max-h-[40vh] min-h-[180px] space-y-3.5 transition-all shadow-inner"
              style={{
                backgroundColor: isDark ? 'rgba(30, 15, 8, 0.85)' : '#FAF6ED',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.4)' : 'rgba(115, 65, 40, 0.3)',
              }}
            >
              {segments.length === 0 ? (
                <div className="py-10 text-xs font-mono opacity-70">
                  No lyrics available.
                </div>
              ) : (
                segments.map((seg, sIdx) => {
                  const isLineActive = sIdx === activeSegmentIndex
                  const isUpcoming = sIdx > activeSegmentIndex

                  return (
                    <div
                      key={sIdx}
                      ref={isLineActive ? activeLineRef : null}
                      className={`p-3 rounded-xl transition-all duration-150 ${
                        isLineActive
                          ? 'scale-[1.02] shadow-md'
                          : isUpcoming
                            ? 'opacity-70'
                            : 'opacity-35'
                      }`}
                      style={{
                        backgroundColor: isLineActive
                          ? isDark
                            ? 'rgba(115, 65, 40, 0.55)'
                            : 'rgba(199, 160, 122, 0.35)'
                          : 'transparent',
                        border: isLineActive
                          ? `1.5px solid ${isDark ? 'rgba(199, 160, 122, 0.6)' : '#C7A07A'}`
                          : '1.5px solid transparent',
                      }}
                    >
                      <p
                        className={`font-editorial transition-colors leading-relaxed ${
                          isLineActive
                            ? 'text-2xl sm:text-3xl font-bold'
                            : 'text-base sm:text-lg font-medium'
                        }`}
                      >
                        {seg.words && seg.words.length > 0 ? (
                          seg.words.map((w, wIdx) => {
                            const wordId = `saword-${sIdx}-${wIdx}`
                            const isWordActive = activeWordId === wordId

                            return (
                              <span
                                key={wIdx}
                                className={`inline-block mx-0.5 px-1 py-0.5 rounded transition-all duration-100 ${
                                  isWordActive
                                    ? 'bg-lion text-bistre font-black scale-110 shadow-xs'
                                    : isLineActive
                                      ? isDark
                                        ? 'text-[#FDFCE8]'
                                        : 'text-[#391E10]'
                                      : isDark
                                        ? 'text-[#E2CEB1]'
                                        : 'text-[#734128]'
                                }`}
                              >
                                {w.word}
                              </span>
                            )
                          })
                        ) : (
                          <span
                            className={
                              isLineActive
                                ? 'text-lion font-bold'
                                : isDark
                                  ? 'text-[#E2CEB1]'
                                  : 'text-[#734128]'
                            }
                          >
                            {seg.text}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-[10px] font-mono opacity-60">
                          {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                        </span>
                        {isLineActive && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider bg-lion text-bistre font-bold animate-pulse">
                            Sing Now
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Stop & Score Button */}
            <button
              type="button"
              onClick={handleStopRecording}
              className="w-full py-3.5 px-6 rounded-full text-sm font-bold shadow-lg transition-all hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Finish Take & Score Performance</span>
            </button>
          </div>
        )}

        {/* ---------------- STAGE 4: SCORING LOADER ---------------- */}
        {stage === 'scoring' && (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none">
            <div className="w-16 h-16 rounded-full border-4 border-lion/30 border-t-lion animate-spin mb-5" />
            <h3 className="font-editorial text-2xl font-bold mb-2">
              Scoring Your Take...
            </h3>
            <p
              className="text-xs sm:text-sm font-mono max-w-sm"
              style={{ color: isDark ? '#E2CEB1' : '#734128' }}
            >
              Comparing pitch contours, octave transposition, and WhisperX word timing against reference vocals.
            </p>
          </div>
        )}

        {/* ---------------- STAGE 5: RESULTS VIEW ---------------- */}
        {stage === 'results' && (
          <div className="flex flex-col">
            {scoringError ? (
              <div className="p-6 text-center">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-1">Scoring Could Not Complete</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-6">{scoringError}</p>
                <button
                  type="button"
                  onClick={() => setStage('preflight')}
                  className="px-6 py-2.5 rounded-full bg-kobicha text-ivory text-xs font-semibold cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : scoreResult ? (
              <>
                {/* Score Header Hero */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 mb-4 border-b border-lion/20">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex flex-col items-center justify-center border shadow-md shrink-0"
                      style={{
                        backgroundColor: isDark ? 'rgba(115, 65, 40, 0.4)' : '#EAE0CE',
                        borderColor: gradeColor,
                      }}
                    >
                      <span className="font-editorial text-3xl sm:text-4xl font-black leading-none" style={{ color: gradeColor }}>
                        {Math.round(scoreResult.overall_score)}
                      </span>
                      <span className="text-[10px] font-mono tracking-wider uppercase opacity-75 mt-1">
                        / 100
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider text-bistre"
                          style={{ backgroundColor: gradeColor }}
                        >
                          {scoreResult.grade}
                        </span>
                        <span className="text-xs font-mono opacity-60">
                          Take Complete
                        </span>
                      </div>
                      <h3 className="font-editorial text-xl sm:text-2xl font-bold">
                        {trackName}
                      </h3>
                      <p className="text-xs opacity-75 font-mono">
                        Latency: {scoreResult.estimated_offset_ms > 0 ? `+${scoreResult.estimated_offset_ms}` : scoreResult.estimated_offset_ms}ms compensated
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setStage('preflight')}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border text-xs font-semibold transition hover:scale-102 cursor-pointer"
                      style={{
                        backgroundColor: '#734128',
                        color: '#FDFCE8',
                        borderColor: '#C7A07A',
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-lion" />
                      <span>Try Again</span>
                    </button>
                  </div>
                </div>

                {/* Key Shift & Warnings Banner */}
                {Math.abs(scoreResult.key_shift_semitones) > 0.5 && (
                  <div
                    className="p-3 rounded-xl border text-xs mb-3 flex items-center gap-2.5"
                    style={{
                      backgroundColor: isDark ? 'rgba(115, 65, 40, 0.3)' : 'rgba(234, 224, 206, 0.5)',
                      borderColor: '#C7A07A',
                    }}
                  >
                    <Sparkles className="w-4 h-4 text-lion shrink-0" />
                    <span>
                      We adjusted for your vocal range by{' '}
                      <strong>
                        {scoreResult.key_shift_semitones > 0 ? `+${scoreResult.key_shift_semitones}` : scoreResult.key_shift_semitones} semitones
                      </strong>
                      . You don't lose points for singing higher or lower than the original artist!
                    </span>
                  </div>
                )}

                {scoreResult.warnings && scoreResult.warnings.length > 0 && (
                  <div className="space-y-1 mb-4">
                    {scoreResult.warnings.map((w, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 flex items-center gap-2"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Results Tabs: Breakdown | Pitch Chart | Leaderboard */}
                <div className="flex border-b border-lion/20 mb-4 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveResultsTab('lines')}
                    className={`py-2 px-4 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                      activeResultsTab === 'lines'
                        ? 'border-lion text-lion font-bold'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Line Accuracy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveResultsTab('pitch')}
                    className={`py-2 px-4 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                      activeResultsTab === 'pitch'
                        ? 'border-lion text-lion font-bold'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Music2 className="w-3.5 h-3.5" />
                    <span>Pitch Contour Chart</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveResultsTab('leaderboard')}
                    className={`py-2 px-4 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                      activeResultsTab === 'leaderboard'
                        ? 'border-lion text-lion font-bold'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Expo Leaderboard</span>
                  </button>
                </div>

                {/* TAB 1: Line-by-Line Breakdown */}
                {activeResultsTab === 'lines' && (
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {scoreResult.lines.map((line, idx) => {
                      const isSelected = selectedResultLineIndex === idx
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedResultLineIndex(idx)
                            onSeek(line.start)
                            onPlay()
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-lion bg-lion/15 shadow-xs'
                              : isDark
                                ? 'border-lion/20 hover:border-lion/40 bg-black/10'
                                : 'border-kobicha/15 hover:border-kobicha/30 bg-black/5'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-editorial font-semibold line-clamp-1">
                              #{line.index + 1}: {line.text}
                            </span>
                            {line.skipped ? (
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/20 opacity-60">
                                Instrumental
                              </span>
                            ) : (
                              <span
                                className="font-mono font-bold text-xs"
                                style={{
                                  color: line.score >= 80 ? '#10B981' : line.score >= 60 ? '#C7A07A' : '#EF4444',
                                }}
                              >
                                {Math.round(line.score)}%
                              </span>
                            )}
                          </div>

                          {!line.skipped && (
                            <>
                              {/* Accuracy Progress Bar */}
                              <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden mb-2">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${line.score}%`,
                                    backgroundColor: line.score >= 80 ? '#10B981' : line.score >= 60 ? '#C7A07A' : '#EF4444',
                                  }}
                                />
                              </div>

                              {/* Breakdown Pills: Pitch, Timing, Presence */}
                              <div className="flex items-center gap-2 text-[10px] font-mono opacity-80">
                                <span>Pitch: {Math.round(line.pitch)}%</span>
                                <span>•</span>
                                <span>Timing: {Math.round(line.timing)}%</span>
                                <span>•</span>
                                <span>Presence: {Math.round(line.presence)}%</span>
                                <span className="ml-auto text-lion font-sans flex items-center gap-0.5 hover:underline">
                                  <Play className="w-2.5 h-2.5 fill-lion" />
                                  <span>Hear reference</span>
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* TAB 2: SVG Pitch Contour Chart */}
                {activeResultsTab === 'pitch' && (
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between text-xs font-mono mb-2 opacity-80">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-1.5 rounded-full bg-[#C7A07A]" />
                          Reference Vocals
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-1.5 rounded-full bg-emerald-400" />
                          Your Sung Pitch
                        </span>
                      </div>
                      <span className="text-[11px]">Y: MIDI Pitch • X: Time</span>
                    </div>

                    <div
                      className="w-full h-52 rounded-xl border p-2 relative overflow-hidden"
                      style={{
                        backgroundColor: isDark ? 'rgba(25, 12, 6, 0.9)' : '#F2ECE0',
                        borderColor: '#C7A07A',
                      }}
                    >
                      {/* Interactive SVG Contour Curve */}
                      <svg
                        viewBox="0 0 600 200"
                        className="w-full h-full"
                        preserveAspectRatio="none"
                      >
                        {/* Reference Contour Path */}
                        {(() => {
                          const refPoints = scoreResult.reference_contour || []
                          const userPoints = scoreResult.user_contour || []
                          const n = refPoints.length
                          if (n < 2) return null

                          // Find valid midi min & max
                          const validMidis = [...refPoints, ...userPoints].filter(
                            (v): v is number => typeof v === 'number' && !isNaN(v),
                          )
                          const minMidi = validMidis.length ? Math.min(...validMidis) - 2 : 45
                          const maxMidi = validMidis.length ? Math.max(...validMidis) + 2 : 80
                          const midiRange = Math.max(1, maxMidi - minMidi)

                          const getX = (i: number) => (i / (n - 1)) * 580 + 10
                          const getY = (midi: number) => 190 - ((midi - minMidi) / midiRange) * 180

                          const refCircles = refPoints.map((v, i) =>
                            v !== null ? (
                              <circle
                                key={`r-${i}`}
                                cx={getX(i)}
                                cy={getY(v)}
                                r="2"
                                fill="#C7A07A"
                                opacity="0.85"
                              />
                            ) : null,
                          )

                          const userCircles = userPoints.map((v, i) =>
                            v !== null ? (
                              <circle
                                key={`u-${i}`}
                                cx={getX(i)}
                                cy={getY(v)}
                                r="2.5"
                                fill="#10B981"
                              />
                            ) : null,
                          )

                          return (
                            <>
                              <g>{refCircles}</g>
                              <g>{userCircles}</g>
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                  </div>
                )}

                {/* TAB 3: Expo Session Leaderboard */}
                {activeResultsTab === 'leaderboard' && (
                  <div className="flex flex-col">
                    {/* Add Score Form */}
                    {!hasSavedLeaderboard && (
                      <div className="flex items-center gap-2 mb-4">
                        <input
                          type="text"
                          value={nickname}
                          maxLength={16}
                          onChange={(e) => setNickname(e.target.value)}
                          placeholder="Enter your nickname / artist name"
                          className="flex-1 px-3 py-2 rounded-xl border text-xs bg-transparent focus:outline-none"
                          style={{ borderColor: '#C7A07A' }}
                        />
                        <button
                          type="button"
                          onClick={handleSaveToLeaderboard}
                          disabled={!nickname.trim()}
                          className="px-4 py-2 rounded-xl bg-lion text-bistre font-bold text-xs shadow-sm hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
                        >
                          Save My Score
                        </button>
                      </div>
                    )}

                    {hasSavedLeaderboard && (
                      <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Your score has been saved to the session leaderboard!</span>
                      </div>
                    )}

                    {/* Top 10 Table */}
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                      {leaderboard.length === 0 ? (
                        <p className="text-xs font-mono opacity-60 text-center py-6">
                          No takes saved yet. Be the first on the leaderboard!
                        </p>
                      ) : (
                        leaderboard.map((entry, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs border ${
                              idx === 0
                                ? 'border-amber-400/50 bg-amber-400/10 font-bold'
                                : idx === 1
                                  ? 'border-slate-300/40 bg-slate-400/10'
                                  : idx === 2
                                    ? 'border-amber-700/40 bg-amber-700/10'
                                    : 'border-lion/20 bg-black/5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 text-center font-mono opacity-75">
                                #{idx + 1}
                              </span>
                              <span>{entry.nickname}</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="text-[11px] opacity-70">
                                {entry.grade}
                              </span>
                              <span className="font-bold text-lion">
                                {Math.round(entry.score)} pts
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
