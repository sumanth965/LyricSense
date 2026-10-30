import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  FileText,
  Loader2,
  Music,
  ShieldCheck,
  Sliders,
  Sparkles,
  StopCircle,
  Zap,
} from 'lucide-react'
import type { AudioMetadata, BackendHealth, ProcessingStage, Theme } from '../types'

interface SmartSetupViewProps {
  metadata: AudioMetadata | null
  lyricsInput?: string
  isTranscribing: boolean
  stage: ProcessingStage
  error: string | null
  backendHealth: BackendHealth | null
  onAnalyze: (
    language?: string,
    enableVocalSeparation?: boolean,
    enableCloud?: boolean,
    separateVocals?: 'auto' | 'on' | 'off',
    lyrics?: string,
  ) => void
  onCancel: () => void
  onBackToAddSong: () => void
  theme: Theme
}

const LANGUAGE_OPTIONS = [
  { code: 'auto', label: 'Auto-Detect Language' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'en', label: 'English' },
]

export default function SmartSetupView({
  metadata,
  lyricsInput,
  isTranscribing,
  stage,
  error,
  backendHealth,
  onAnalyze,
  onCancel,
  onBackToAddSong,
  theme,
}: SmartSetupViewProps) {
  const isDark = theme === 'dark'
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto')
  const [enableVocalSeparation, setEnableVocalSeparation] = useState<boolean>(false)
  const [separateVocalsMode, setSeparateVocalsMode] = useState<'auto' | 'on' | 'off'>('off')
  const [engineChoice, setEngineChoice] = useState<'groq' | 'local'>('groq')
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)
  const [useCustomLyrics, setUseCustomLyrics] = useState<boolean>(
    Boolean(lyricsInput && lyricsInput.trim().length > 0)
  )
  const [customLyricsText, setCustomLyricsText] = useState<string>(lyricsInput || '')

  useEffect(() => {
    if (lyricsInput !== undefined) {
      setCustomLyricsText(lyricsInput)
      setUseCustomLyrics(Boolean(lyricsInput.trim().length > 0))
    }
  }, [lyricsInput])

  // Live timer counting up while analysis is in progress
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

  const vocalSepAvailable = backendHealth?.vocal_separation_available ?? false
  const groqAvailable = backendHealth?.groq_available ?? false

  const handleStartAnalysis = () => {
    const isCloud = engineChoice === 'groq'
    const finalLyrics =
      useCustomLyrics && customLyricsText.trim().length > 0
        ? customLyricsText.trim()
        : undefined

    onAnalyze(
      selectedLanguage,
      enableVocalSeparation,
      isCloud,
      separateVocalsMode,
      finalLyrics,
    )
  }

  // Get readable stage description
  const getStageDescription = () => {
    switch (stage) {
      case 'uploading':
        return 'Uploading audio to processing pipeline...'
      case 'preparing':
        return 'Validating audio streams and frequency signatures...'
      case 'separating_vocals':
        return 'Demucs AI: Isolating vocal track from instrumental backing...'
      case 'transcribing':
        return engineChoice === 'groq'
          ? 'Cloud Whisper: Transcribing vocal phonemes...'
          : 'Local faster-whisper: Neural decoding on device...'
      case 'aligning':
        return lyricsInput?.trim()
          ? 'WhisperX: Performing forced phoneme alignment with known lyrics...'
          : 'Computing word-level timestamps and transliteration...'
      case 'rendering':
        return 'Building synchronized lyric teleprompter timeline...'
      default:
        return 'Analyzing audio...'
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Header with Step Indicator */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-lion/20 text-lion text-xs font-semibold">
            3
          </span>
          <span
            className="text-xs font-medium tracking-wide uppercase"
            style={{ color: isDark ? '#E2CEB1' : '#734128' }}
          >
            Smart Setup
          </span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold">
          Personalize Before Analysis
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: isDark ? 'rgba(226,206,177,0.75)' : 'rgba(115,65,40,0.85)' }}
        >
          Fine-tune the neural alignment engine to match your song's language and style.
        </p>
      </div>

      {/* Track summary pill */}
      {metadata && (
        <div
          className="p-3.5 rounded-xl border flex items-center justify-between text-xs"
          style={{
            backgroundColor: isDark ? 'rgba(43, 22, 12, 0.6)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.18)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Music className="w-4 h-4 text-lion shrink-0" />
            <span className="font-medium truncate">{metadata.name}</span>
            <span className="text-dun/60 shrink-0">({metadata.formattedSize})</span>
          </div>
          <button
            onClick={onBackToAddSong}
            disabled={isTranscribing}
            className="text-lion hover:underline shrink-0 font-medium cursor-pointer"
          >
            Change
          </button>
        </div>
      )}

      {/* 2. Main Setup Card / Progress Card */}
      {!isTranscribing ? (
        <div
          className="p-6 rounded-3xl border space-y-5"
          style={{
            backgroundColor: isDark ? 'rgba(43, 22, 12, 0.75)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(226, 206, 177, 0.9)',
          }}
        >
          <h2 className="font-serif text-lg font-semibold border-b border-dun/15 pb-3">
            Setup & Analyze
          </h2>

          {/* Language Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: isDark ? '#E2CEB1' : '#734128' }}>
              Target Song Language
            </label>
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-lion/40 cursor-pointer"
                style={{
                  backgroundColor: isDark ? 'rgba(30, 15, 8, 0.8)' : '#FAF6EE',
                  borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
                  color: isDark ? '#FDFCE8' : '#391E10',
                }}
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code} className="bg-bistre text-ivory">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-dun" />
            </div>
            <p className="text-[11px] text-dun/70">
              Hindi, Kannada, and Japanese scripts will automatically include Romanized transliteration.
            </p>
          </div>

          {/* Vocal Separation Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-dun/5 border border-dun/15">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Vocal Separation (Demucs AI)</span>
                {!vocalSepAvailable && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-medium">
                    Optional Plugin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-dun/70 mt-0.5">
                Remove instruments and heavy backing beats for better lyric accuracy
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={enableVocalSeparation}
                onChange={(e) => {
                  setEnableVocalSeparation(e.target.checked)
                  setSeparateVocalsMode(e.target.checked ? 'on' : 'off')
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dun/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lion"></div>
            </label>
          </div>

          {/* Transcription Engine Options */}
          <div className="space-y-2">
            <label className="block text-xs font-medium" style={{ color: isDark ? '#E2CEB1' : '#734128' }}>
              Transcription Engine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Groq Cloud */}
              <button
                type="button"
                onClick={() => setEngineChoice('groq')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  engineChoice === 'groq'
                    ? 'border-lion bg-lion/10 shadow-sm'
                    : 'border-dun/20 hover:border-dun/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-lion">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Groq Cloud (Fast)</span>
                  </div>
                  {groqAvailable && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                      Ready
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-dun/70">
                  Sub-second cloud transcription with Whisper-large-v3.
                </p>
              </button>

              {/* Option 2: Local Whisper */}
              <button
                type="button"
                onClick={() => setEngineChoice('local')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  engineChoice === 'local'
                    ? 'border-lion bg-lion/10 shadow-sm'
                    : 'border-dun/20 hover:border-dun/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-lion">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Local Whisper (Private)</span>
                  </div>
                  <span className="text-[10px] font-bold text-lion bg-lion/20 px-1.5 py-0.5 rounded">
                    100% On-Device
                  </span>
                </div>
                <p className="text-[11px] text-dun/70">
                  Runs directly on your machine. Zero audio leaves your computer.
                </p>
              </button>
            </div>
          </div>

          {/* Privacy badge */}
          <div
            className="p-3 rounded-xl border flex items-center gap-2 text-xs"
            style={{
              backgroundColor: isDark ? 'rgba(30, 15, 8, 0.4)' : '#FDFCE8',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(115, 65, 40, 0.15)',
            }}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-[11px] text-dun/80">
              {engineChoice === 'local'
                ? 'Your audio stays 100% local on your machine.'
                : 'Audio is streamed securely to Groq API solely for transcription and discarded immediately.'}
            </p>
          </div>

          {/* Advanced Collapsible Settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="text-xs font-medium text-dun hover:text-lion flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Advanced Settings</span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-4 rounded-2xl bg-dun/5 border border-dun/15 space-y-3 text-xs"
              >
                <div>
                  <label className="block text-[11px] font-medium mb-1">
                    Vocal Separation Mode
                  </label>
                  <select
                    value={separateVocalsMode}
                    onChange={(e) =>
                      setSeparateVocalsMode(e.target.value as 'auto' | 'on' | 'off')
                    }
                    className="w-full p-2 rounded-lg border bg-bistre/80 text-ivory border-dun/20 text-xs"
                  >
                    <option value="off">Off (Standard - fastest)</option>
                    <option value="auto">Auto (Detect music presence)</option>
                    <option value="on">On (Always isolate vocals)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-dun/80 pt-1">
                  <div>
                    <span className="font-semibold">Local Model:</span>{' '}
                    {backendHealth?.model_size || 'base'} ({backendHealth?.device || 'cpu'})
                  </div>
                  <div>
                    <span className="font-semibold">WhisperX Engine:</span>{' '}
                    {backendHealth?.whisperx_available ? 'Available' : 'Native fallback'}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Lyrics Alignment Source Card */}
          <div
            className="p-4 rounded-2xl border transition-all"
            style={{
              backgroundColor: isDark ? 'rgba(30, 15, 8, 0.4)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(226, 206, 177, 0.9)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-lion" />
                <span className="text-xs font-semibold" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
                  Lyrics Source & Alignment
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  useCustomLyrics && customLyricsText.trim()
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {useCustomLyrics && customLyricsText.trim() ? 'Forced Alignment' : 'AI Speech Recognition'}
              </span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCustomLyrics}
                  onChange={(e) => setUseCustomLyrics(e.target.checked)}
                  className="rounded text-lion focus:ring-lion accent-lion cursor-pointer"
                />
                <span style={{ color: isDark ? '#E2CEB1' : '#734128' }} className="font-medium">
                  I have official lyrics for forced alignment
                </span>
              </label>

              {useCustomLyrics ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    value={customLyricsText}
                    onChange={(e) => setCustomLyricsText(e.target.value)}
                    placeholder="Paste full official song lyrics here (one line per line)..."
                    rows={4}
                    className="w-full p-2.5 rounded-xl border text-xs font-sans focus:outline-none focus:ring-1 focus:ring-lion resize-none"
                    style={{
                      backgroundColor: isDark ? 'rgba(15, 7, 3, 0.6)' : '#FAF6EE',
                      borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(226, 206, 177, 0.9)',
                      color: isDark ? '#FDFCE8' : '#391E10',
                    }}
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-dun/60">
                      {customLyricsText.split('\n').filter(Boolean).length} line(s) provided
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomLyricsText('')
                        setUseCustomLyrics(false)
                      }}
                      className="text-xs text-lion hover:underline cursor-pointer"
                    >
                      Clear & switch to AI transcription
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-dun/70 leading-relaxed">
                  AI neural Whisper will listen directly to your audio and transcribe spoken/sung words with genuine timestamps.
                </p>
              )}
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={!metadata}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all shadow-md hover:shadow-lg active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#734128',
              color: '#FDFCE8',
            }}
          >
            <Sparkles className="w-4 h-4 text-lion" />
            <span>Analyze & Sync Lyrics</span>
          </button>
        </div>
      ) : (
        /* 3. Dedicated Analysis Progress Interface */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-3xl border text-center space-y-6"
          style={{
            backgroundColor: isDark ? 'rgba(43, 22, 12, 0.9)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(226, 206, 177, 0.95)',
          }}
        >
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <Loader2 className="w-16 h-16 text-lion animate-spin opacity-80" />
            <Sparkles className="w-6 h-6 text-lion absolute" />
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-xl font-semibold">
              {stage === 'separating_vocals'
                ? 'Separating Vocal Stems'
                : stage === 'aligning'
                  ? 'Aligning Word Timestamps'
                  : 'Analyzing Audio & Lyrics'}
            </h3>
            <p className="text-xs sm:text-sm text-dun/80 max-w-md mx-auto">
              {getStageDescription()}
            </p>
          </div>

          {/* Progress Timer & Status Pill */}
          <div className="flex items-center justify-center gap-3 text-xs font-mono">
            <span className="px-3 py-1 rounded-full bg-lion/15 text-lion border border-lion/30">
              Elapsed: {elapsedSeconds}s
            </span>
            <span className="px-3 py-1 rounded-full bg-dun/15 text-dun border border-dun/25">
              Engine: {engineChoice === 'groq' ? 'Groq Cloud' : 'Local Whisper'}
            </span>
          </div>

          {/* Cancellation Button */}
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-xl text-xs font-medium border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 mx-auto cursor-pointer"
          >
            <StopCircle className="w-4 h-4" />
            <span>Cancel Processing</span>
          </button>
        </motion.div>
      )}

      {/* Error state if failed */}
      {error && !isTranscribing && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Analysis could not be completed</span>
            <span>{error}</span>
          </div>
          <button
            onClick={handleStartAnalysis}
            className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 font-medium text-xs cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
