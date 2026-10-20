import { FileAudio, RefreshCw, Trash2 } from 'lucide-react'
import type { AudioMetadata, Theme } from '../types'
import { formatTime } from '../hooks/useAudioPlayer'

interface TrackInfoProps {
  metadata: AudioMetadata
  onReplace: () => void
  onRemove: () => void
  theme: Theme
}

export default function TrackInfo({
  metadata,
  onReplace,
  onRemove,
  theme,
}: TrackInfoProps) {
  const isDark = theme === 'dark'

  return (
    <div
      className="w-full rounded-2xl border p-4 sm:p-5 backdrop-blur-md shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
      style={{
        backgroundColor: isDark ? 'rgba(45, 23, 12, 0.75)' : 'rgba(253, 252, 232, 0.88)',
        borderColor: isDark ? 'rgba(199, 160, 122, 0.28)' : 'rgba(115, 65, 40, 0.22)',
      }}
    >
      {/* Track Icon & Identity */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 shadow-2xs"
          style={{
            backgroundColor: isDark ? 'rgba(115, 65, 40, 0.4)' : 'rgba(226, 206, 177, 0.5)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
          }}
        >
          <FileAudio className="w-6 h-6 text-lion" />
        </div>

        <div className="min-w-0 flex-1">
          {/* Truncated Filename with Full Name Tooltip */}
          <h3
            className="font-editorial text-base sm:text-lg font-semibold truncate tracking-tight"
            style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
            title={metadata.name}
          >
            {metadata.name}
          </h3>

          {/* Metadata chips */}
          <div
            className="flex flex-wrap items-center gap-2 text-xs font-mono mt-1"
            style={{ color: isDark ? '#E2CEB1' : '#734128' }}
          >
            <span className="px-2 py-0.5 rounded bg-lion/15 text-lion border border-lion/25 font-bold">
              {metadata.format}
            </span>
            <span>{metadata.formattedSize}</span>
            <span className="opacity-40">•</span>
            <span>{formatTime(metadata.duration)}</span>
            <span className="opacity-40">•</span>
            <span className="text-[11px] text-lion/80">Local Audio</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Replace & Remove */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-lion/15">
        {/* Replace Track */}
        <button
          type="button"
          onClick={onReplace}
          title="Replace with another audio file"
          aria-label="Replace current audio file"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border backdrop-blur-xs transition-transform hover:scale-102 active:scale-98 cursor-pointer"
          style={{
            backgroundColor: isDark ? 'rgba(57, 30, 16, 0.6)' : 'rgba(226, 206, 177, 0.45)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
            color: isDark ? '#FDFCE8' : '#391E10',
          }}
        >
          <RefreshCw className="w-3.5 h-3.5 text-lion" />
          <span>Replace</span>
        </button>

        {/* Remove Track */}
        <button
          type="button"
          onClick={onRemove}
          title="Remove audio file and unload"
          aria-label="Remove audio file"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border backdrop-blur-xs transition-transform hover:scale-102 active:scale-98 cursor-pointer text-red-400 hover:text-red-300"
          style={{
            backgroundColor: isDark ? 'rgba(57, 30, 16, 0.6)' : 'rgba(226, 206, 177, 0.45)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Remove</span>
        </button>
      </div>
    </div>
  )
}
