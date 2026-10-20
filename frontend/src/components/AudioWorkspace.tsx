import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Theme } from '../types'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useLyricsTranscription } from '../hooks/useLyricsTranscription'
import Navbar from './Navbar'
import EdgeWaveDecorations from './EdgeWaveDecorations'
import AudioUploader from './AudioUploader'
import TrackInfo from './TrackInfo'
import AudioPlayer from './AudioPlayer'
import LyricsDisplay from './LyricsDisplay'

interface AudioWorkspaceProps {
  onBackToHome: () => void
  theme: Theme
  onToggleTheme: () => void
  onOpenHowItWorks?: () => void
}

export default function AudioWorkspace({
  onBackToHome,
  theme,
  onToggleTheme,
  onOpenHowItWorks = () => {},
}: AudioWorkspaceProps) {
  const isDark = theme === 'dark'
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const {
    metadata,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    error: audioError,
    loadAudio,
    unloadAudio,
    togglePlay,
    seek,
    seekBy,
    setVolume,
    toggleMute,
    clearError,
  } = useAudioPlayer()

  const {
    stage: transcriptionStage,
    result: transcriptionResult,
    error: transcriptionError,
    isTranscribing,
    backendHealth,
    transcribe,
    cancel: cancelTranscription,
    clear: clearTranscription,
  } = useLyricsTranscription()

  const handleFileSelected = (file: File) => {
    clearTranscription()
    loadAudio(file)
  }

  const handleReplaceFile = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveTrack = () => {
    clearTranscription()
    unloadAudio()
  }

  return (
    <div
      className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden transition-colors duration-300"
      style={{
        background: isDark
          ? 'radial-gradient(ellipse at 50% 12%, #422313 0%, #391E10 60%, #261309 100%)'
          : 'radial-gradient(ellipse at 50% 12%, #FFFDF7 0%, #FAF6EE 50%, #F4ECE0 100%)',
        color: isDark ? '#FDFCE8' : '#391E10',
      }}
    >
      {/* Subtle flowing waveform decorations around page edges */}
      <EdgeWaveDecorations theme={theme} />

      {/* Hidden input for replacing audio file in loaded state */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFileSelected(e.target.files[0])
            e.target.value = ''
          }
        }}
        className="hidden"
        aria-label="Replace audio file"
      />

      {/* 1. Top Navigation: LyricSense branding, navigation links, theme toggle, Back to Home */}
      <Navbar
        theme={theme}
        onToggleTheme={onToggleTheme}
        onBackToHome={() => {
          handleRemoveTrack()
          onBackToHome()
        }}
        onOpenHowItWorks={onOpenHowItWorks}
        isWorkspace={true}
      />

      {/* 2. Main Container Card matching reference */}
      <main className="relative z-10 w-full max-w-[1040px] mx-auto px-4 sm:px-6 my-4 sm:my-8 flex-1 flex flex-col justify-center">
        <div
          className="w-full rounded-[28px] sm:rounded-[36px] border p-4 sm:p-6 lg:p-7 shadow-[0_16px_50px_rgba(115,65,40,0.07)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-xs transition-colors duration-300"
          style={{
            backgroundColor: isDark ? 'rgba(43, 22, 12, 0.88)' : '#F7F2E6',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.32)' : 'rgba(226, 206, 177, 0.95)',
          }}
        >
          {/* Top Section: Large, rounded, text-free microphone artwork */}
          <div className="w-full overflow-hidden rounded-[18px] sm:rounded-[26px] shadow-2xs border border-lion/20">
            <img
              src="/image.png"
              alt="LyricSense studio microphone on golden pedestal surrounded by musical wave ribbons and musical notes"
              className="w-full h-auto aspect-[16/9] sm:aspect-[2.15/1] max-h-[460px] object-cover block select-none pointer-events-none"
              loading="eager"
            />
          </div>

          {/* Underneath the Image: Upload Card or Audio Playback Controls & Lyrics */}
          <div className="w-full mt-6 sm:mt-7">
            <AnimatePresence mode="wait">
              {!metadata ? (
                /* State A: Initial Reference View — Centered Audio Upload Card */
                <motion.div
                  key="uploader"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <AudioUploader
                    onFileSelected={handleFileSelected}
                    error={audioError}
                    onClearError={clearError}
                    theme={theme}
                  />
                </motion.div>
              ) : (
                /* State B: Active Track Playback & Synchronized Lyrics Panel */
                <motion.div
                  key="playback"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-5 max-w-3xl mx-auto"
                >
                  {/* Selected Track Metadata */}
                  <TrackInfo
                    metadata={metadata}
                    onReplace={handleReplaceFile}
                    onRemove={handleRemoveTrack}
                    theme={theme}
                  />

                  {/* Real HTML5 Audio Player */}
                  <AudioPlayer
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    isMuted={isMuted}
                    onTogglePlay={togglePlay}
                    onSeek={seek}
                    onSeekBy={seekBy}
                    onVolumeChange={setVolume}
                    onToggleMute={toggleMute}
                    theme={theme}
                  />

                  {/* Synchronized Word-by-Word Lyrics Panel */}
                  <LyricsDisplay
                    transcription={transcriptionResult}
                    stage={transcriptionStage}
                    error={transcriptionError}
                    isTranscribing={isTranscribing}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    audioDuration={duration}
                    trackName={metadata?.name}
                    onAnalyze={(lang?: string) => {
                      if (metadata?.file) {
                        transcribe(metadata.file, lang)
                      }
                    }}
                    onCancel={cancelTranscription}
                    onRetry={(lang?: string) => {
                      if (metadata?.file) {
                        transcribe(metadata.file, lang)
                      }
                    }}
                    onSeek={seek}
                    theme={theme}
                    backendAvailable={backendHealth !== null}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Subtle bottom spacing */}
      <div className="h-4 sm:h-6" aria-hidden="true" />
    </div>
  )
}
