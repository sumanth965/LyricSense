import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, AudioWaveform, Moon, Sun } from 'lucide-react'
import type { Theme } from '../types'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import AudioUploader from './AudioUploader'
import TrackInfo from './TrackInfo'
import AudioPlayer from './AudioPlayer'
import LyricsPlaceholder from './LyricsPlaceholder'

interface AudioWorkspaceProps {
  onBackToHome: () => void
  theme: Theme
  onToggleTheme: () => void
}

export default function AudioWorkspace({
  onBackToHome,
  theme,
  onToggleTheme,
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
    error,
    loadAudio,
    unloadAudio,
    togglePlay,
    seek,
    seekBy,
    setVolume,
    toggleMute,
    clearError,
  } = useAudioPlayer()

  const handleFileSelected = (file: File) => {
    loadAudio(file)
  }

  const handleReplaceFile = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none transition-colors duration-300"
      style={{
        backgroundColor: isDark ? '#391E10' : '#FDFCE8',
        color: isDark ? '#FDFCE8' : '#391E10',
      }}
    >
      {/* Hidden input for replacing file */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            loadAudio(e.target.files[0])
            e.target.value = ''
          }
        }}
        className="hidden"
        aria-label="Replace audio file"
      />

      {/* 1. Header: Brand, Back to Home, Theme Toggle */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between pb-6 border-b border-lion/20">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs"
            style={{
              backgroundColor: isDark ? 'rgba(115, 65, 40, 0.4)' : 'rgba(226, 206, 177, 0.5)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
            }}
          >
            <AudioWaveform className="w-5 h-5 text-lion" />
          </div>
          <div>
            <span className="font-editorial text-xl sm:text-2xl font-semibold tracking-tight">
              Lyric<span className="text-lion">Sense</span>
            </span>
            <span className="block text-[11px] font-mono uppercase text-lion tracking-wider">
              Audio Workspace
            </span>
          </div>
        </div>

        {/* Right Actions: Back to Home + Theme Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer text-lion"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.65)' : 'rgba(226, 206, 177, 0.4)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
            }}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              unloadAudio()
              onBackToHome()
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-transform hover:scale-102 active:scale-98 cursor-pointer"
            style={{
              backgroundColor: isDark ? 'rgba(57, 30, 16, 0.6)' : 'rgba(226, 206, 177, 0.4)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
              color: isDark ? '#FDFCE8' : '#391E10',
            }}
          >
            <ArrowLeft className="w-4 h-4 text-lion" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Body */}
      <main className="w-full max-w-5xl mx-auto my-auto py-8 sm:py-10 flex flex-col justify-center">
        {!metadata ? (
          /* State A: No File Selected -> Show Prominent Audio Uploader */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <AudioUploader
              onFileSelected={handleFileSelected}
              error={error}
              onClearError={clearError}
              theme={theme}
            />
          </motion.div>
        ) : (
          /* State B: File Selected -> Track Info, Custom Audio Player & Lyrics Panel */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Selected File Details */}
            <TrackInfo
              metadata={metadata}
              onReplace={handleReplaceFile}
              onRemove={unloadAudio}
              theme={theme}
            />

            {/* Custom Audio Player with real HTML5 playback */}
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

            {/* Dedicated Lyrics Panel (Awaiting AI Analysis in Step 4) */}
            <LyricsPlaceholder theme={theme} />
          </motion.div>
        )}
      </main>

      {/* 3. Footer */}
      <footer className="w-full max-w-5xl mx-auto flex items-center justify-between pt-6 border-t border-lion/20 text-xs font-mono text-lion/75">
        <span>Step 3: Local Audio Upload & Playback Active</span>
        <span>HTML5 Audio API • Zero External Servers</span>
      </footer>
    </div>
  )
}
