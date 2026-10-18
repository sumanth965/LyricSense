import {
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { Theme } from '../types'
import { formatTime } from '../hooks/useAudioPlayer'

interface AudioPlayerProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onSeekBy: (seconds: number) => void
  onVolumeChange: (vol: number) => void
  onToggleMute: () => void
  disabled?: boolean
  theme: Theme
}

export default function AudioPlayer({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  onTogglePlay,
  onSeek,
  onSeekBy,
  onVolumeChange,
  onToggleMute,
  disabled = false,
  theme,
}: AudioPlayerProps) {
  const isDark = theme === 'dark'
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className="w-full rounded-2xl border p-5 sm:p-6 backdrop-blur-md shadow-md transition-all select-none"
      style={{
        backgroundColor: isDark ? 'rgba(45, 23, 12, 0.82)' : 'rgba(253, 252, 232, 0.92)',
        borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.22)',
      }}
    >
      {/* 1. Interactive Seek Timeline & Timestamp Display */}
      <div className="space-y-2 mb-6">
        <div className="relative group flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            disabled={disabled}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            aria-label="Seek audio playback position"
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#C7A07A] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              background: `linear-gradient(to right, #C7A07A ${progressPercent}%, ${
                isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)'
              } ${progressPercent}%)`,
            }}
          />
        </div>

        {/* Time Indicators */}
        <div
          className="flex items-center justify-between text-xs font-mono"
          style={{ color: isDark ? '#E2CEB1' : '#734128' }}
        >
          <span className="font-semibold text-lion">{formatTime(currentTime)}</span>
          <span className="opacity-75">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 2. Primary Playback & Volume Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Center: Play, Pause, Rewind 10s, Forward 10s */}
        <div className="flex items-center gap-4 sm:gap-5 order-2 sm:order-1 mx-auto sm:mx-0">
          {/* Rewind 10 seconds */}
          <button
            type="button"
            onClick={() => onSeekBy(-10)}
            disabled={disabled}
            title="Seek backward 10 seconds"
            aria-label="Seek backward 10 seconds"
            className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-lion"
            style={{
              backgroundColor: isDark ? 'rgba(57, 30, 16, 0.65)' : 'rgba(226, 206, 177, 0.45)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Main Play / Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={disabled}
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            className="w-13 h-13 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{
              backgroundColor: '#734128',
              color: '#FDFCE8',
              boxShadow: isPlaying ? '0 0 20px rgba(199, 160, 122, 0.6)' : 'none',
            }}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          {/* Forward 10 seconds */}
          <button
            type="button"
            onClick={() => onSeekBy(10)}
            disabled={disabled}
            title="Seek forward 10 seconds"
            aria-label="Seek forward 10 seconds"
            className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-lion"
            style={{
              backgroundColor: isDark ? 'rgba(57, 30, 16, 0.65)' : 'rgba(226, 206, 177, 0.45)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
            }}
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Volume & Mute Controls */}
        <div className="flex items-center gap-2.5 order-1 sm:order-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onToggleMute}
            disabled={disabled}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lion hover:text-ivory transition-colors disabled:opacity-40 cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={isMuted ? 0 : volume}
            disabled={disabled}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            aria-label="Volume slider"
            className="w-24 sm:w-28 h-1.5 rounded-full appearance-none cursor-pointer accent-[#C7A07A] disabled:opacity-40"
            style={{
              background: `linear-gradient(to right, #C7A07A ${
                (isMuted ? 0 : volume) * 100
              }%, ${
                isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)'
              } ${(isMuted ? 0 : volume) * 100}%)`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
