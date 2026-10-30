import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Headphones,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Square,
  X,
} from 'lucide-react'
import { scoreSingalongRecording } from '../lib/api'
import type { ScoreResponse, SegmentItem, Theme } from '../types'
import { formatTime } from '../hooks/useAudioPlayer'

interface SingAlongStudioViewProps {
  analysisId: string
  trackName?: string
  audioDuration: number
  segments: SegmentItem[]
  currentTime: number
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  onFinishScore: (result: ScoreResponse) => void
  onClose: () => void
  theme: Theme
}

export default function SingAlongStudioView({
  analysisId,
  trackName: _trackName,
  audioDuration,
  segments,
  currentTime,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onFinishScore,
  onClose,
  theme: _theme,
}: SingAlongStudioViewProps) {
  // Internal stages: 'preflight' -> 'countdown' -> 'recording' -> 'scoring'
  const [stage, setStage] = useState<'preflight' | 'countdown' | 'recording' | 'scoring'>('preflight')
  const [countdownValue, setCountdownValue] = useState<number>(3)

  // Mic audio & meter
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  const [micVolume, setMicVolume] = useState<number>(0)
  const [micError, setMicError] = useState<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [scoringError, setScoringError] = useState<string | null>(null)

  // Request Microphone and meter
  const startMic = useCallback(async () => {
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      })
      setMicStream(stream)

      // Audio meter analyzer
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      audioContextRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const avg = sum / dataArray.length
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)))
        animFrameRef.current = requestAnimationFrame(updateVolume)
      }
      updateVolume()
    } catch (err) {
      console.warn('Microphone permission denied:', err)
      setMicError('Microphone permission required for sing-along scoring.')
    }
  }, [])

  // Auto-start mic on mount
  useEffect(() => {
    startMic()
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {})
      if (micStream) micStream.getTracks().forEach((t) => t.stop())
    }
  }, [startMic])

  // Countdown timer effect
  useEffect(() => {
    if (stage !== 'countdown') return
    const timer = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
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

    onSeek(0)
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
          rangeStart: 0,
          rangeEnd: audioDuration,
          keyShift: 'auto',
          latencyMs: 'auto',
        })
        onFinishScore(result)
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : 'Scoring server encountered an unexpected error.'
        setScoringError(errorMsg)
        setStage('preflight')
      }
    }

    recorder.start(250)

    return () => {
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch {}
      }
    }
  }, [stage, micStream, analysisId, audioDuration])

  const handleFinishAndScore = () => {
    onPause()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const handleRestart = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setCountdownValue(3)
    setStage('countdown')
  }

  // Active line calculation
  const activeSegmentIndex = useMemo(() => {
    return segments.findIndex((seg) => currentTime >= seg.start && currentTime <= seg.end)
  }, [segments, currentTime])

  const currentSegment = segments[activeSegmentIndex]
  const nextSegment = segments[activeSegmentIndex + 1]
  const followingSegment = segments[activeSegmentIndex + 2]

  return (
    <div className="dark fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none">
      <div
        className="relative w-full max-w-4xl rounded-3xl border overflow-hidden flex flex-col justify-between shadow-2xl transition-all"
        style={{
          height: 'min(640px, 92vh)',
          background: 'radial-gradient(ellipse at 50% 20%, #361A0C 0%, #1F0E06 70%, #120703 100%)',
          borderColor: 'rgba(199, 160, 122, 0.35)',
          color: '#FDFCE8',
        }}
      >
        {/* 1. Top Bar matching Box 6 */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-lion/20 bg-black/30 backdrop-blur-sm">
          {/* Left: Recording pill */}
          <div className="flex items-center gap-2">
            {stage === 'recording' ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold shadow-md animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
                Recording...
              </span>
            ) : stage === 'countdown' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lion text-bistre text-xs font-bold">
                Get Ready!
              </span>
            ) : stage === 'scoring' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                Scoring Performance...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-dun text-xs font-medium">
                Ready to Sing
              </span>
            )}
          </div>

          {/* Right: Timer & Close */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono text-dun/90 tracking-wider">
              {formatTime(currentTime)} / {formatTime(audioDuration)}
            </span>
            <button
              onClick={() => {
                onPause()
                onClose()
              }}
              className="p-1.5 rounded-xl text-dun hover:text-lion hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Center Stage: Lyrics & Soundwave */}
        <div className="flex-1 px-6 sm:px-12 flex flex-col justify-center items-center text-center space-y-6 overflow-hidden">
          {stage === 'preflight' ? (
            <div className="max-w-md space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-lion/15 text-lion mx-auto flex items-center justify-center">
                <Mic className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold">Sing-Along Studio</h3>
                <p className="text-xs text-dun/80 mt-1">
                  Sing into your microphone while the track plays. Our neural audio engine will evaluate
                  your pitch contour, syllable timing, and lyric coverage.
                </p>
              </div>

              {micError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {micError}
                </div>
              )}

              {scoringError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
                  {scoringError}
                </div>
              )}

              {/* Mic volume check */}
              <div className="space-y-1.5 text-xs text-dun/70">
                <div className="flex justify-between text-[11px]">
                  <span>Microphone Check</span>
                  <span>{micVolume > 5 ? 'Signal Detected' : 'Speak to test'}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-75"
                    style={{ width: `${micVolume}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setCountdownValue(3)
                  setStage('countdown')
                }}
                disabled={!micStream}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-lion text-bistre shadow-lg hover:scale-102 active:scale-98 transition-transform disabled:opacity-40 cursor-pointer"
              >
                Start Recording & Sing Along
              </button>
            </div>
          ) : stage === 'countdown' ? (
            <div className="space-y-4">
              <motion.span
                key={countdownValue}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="font-serif text-8xl font-black text-lion block"
              >
                {countdownValue}
              </motion.span>
              <p className="text-sm font-semibold text-dun tracking-wide uppercase">
                Take a deep breath...
              </p>
            </div>
          ) : stage === 'scoring' ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full border-4 border-lion/30 border-t-lion animate-spin mx-auto" />
              <h3 className="font-serif text-2xl font-bold">Evaluating Your Vocals...</h3>
              <p className="text-xs text-dun/80 max-w-sm">
                Comparing your pitch frequency against the studio reference track.
              </p>
            </div>
          ) : (
            /* Live Recording Lyrics Presentation */
            <div className="w-full space-y-6">
              {/* Active Current Line matching Box 6 */}
              <div className="min-h-[100px] flex items-center justify-center">
                {currentSegment ? (
                  <p className="font-serif text-3xl sm:text-5xl font-extrabold leading-tight text-ivory tracking-wide">
                    {currentSegment.words && currentSegment.words.length > 0
                      ? currentSegment.words.map((w, wIdx) => {
                          const isWordActive =
                            currentTime >= (w.start ?? -1) && currentTime <= (w.end ?? -1)
                          return (
                            <span
                              key={`sing-w-${wIdx}`}
                              className={`inline-block mx-1.5 px-2 py-0.5 rounded-xl transition-all duration-150 ${
                                isWordActive
                                  ? 'bg-lion text-bistre scale-110 shadow-lg font-black'
                                  : 'text-ivory/90'
                              }`}
                            >
                              {w.word}
                            </span>
                          )
                        })
                      : currentSegment.text}
                  </p>
                ) : (
                  <p className="font-serif text-2xl text-dun/60 italic">
                    [Listening for vocals...]
                  </p>
                )}
              </div>

              {/* Upcoming preview lines */}
              <div className="space-y-1.5 text-dun/50 text-base sm:text-xl font-serif">
                {nextSegment && <p className="truncate opacity-75">{nextSegment.text}</p>}
                {followingSegment && <p className="truncate opacity-40">{followingSegment.text}</p>}
              </div>

              {/* Visual soundwave ribbon */}
              <div className="flex items-center justify-center gap-1 h-8 opacity-80 pt-2">
                {Array.from({ length: 32 }).map((_, i) => {
                  const h = Math.max(
                    4,
                    Math.sin((i / 32) * Math.PI * 3 + currentTime * 4) * 20 + (micVolume / 100) * 16,
                  )
                  return (
                    <div
                      key={`wave-bar-${i}`}
                      className="w-1.5 bg-lion/80 rounded-full transition-all duration-75"
                      style={{ height: `${h}px` }}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Bottom Controls Bar matching Box 6 */}
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t border-lion/20 bg-black/40 backdrop-blur-sm">
          {/* Left: Mic Level */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 text-xs font-semibold text-dun">
              <Mic className="w-3.5 h-3.5 text-lion" />
              <span>Mic Level</span>
            </div>
            <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden flex items-center">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-75"
                style={{ width: `${micVolume}%` }}
              />
            </div>
          </div>

          {/* Center: Restart, Finish & Score, Pause */}
          {stage === 'recording' && (
            <div className="flex items-center gap-4">
              <button
                onClick={handleRestart}
                className="p-3 rounded-full hover:bg-white/10 text-dun transition-colors cursor-pointer"
                title="Restart take"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={handleFinishAndScore}
                className="px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Finish & Score</span>
              </button>

              <button
                onClick={() => {
                  if (isPlaying) onPause()
                  else onPlay()
                }}
                className="p-3 rounded-full hover:bg-white/10 text-dun transition-colors cursor-pointer"
                title={isPlaying ? 'Pause' : 'Resume'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
            </div>
          )}

          {/* Right: Headphones recommended badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-dun/70">
            <Headphones className="w-3.5 h-3.5 text-lion" />
            <span>Headphones Recommended</span>
          </div>
        </div>
      </div>
    </div>
  )
}
