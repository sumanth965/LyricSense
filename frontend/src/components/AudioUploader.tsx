import { useRef, useState } from 'react'
import { AlertCircle, Check, FileText, Music2, UploadCloud } from 'lucide-react'
import type { Theme } from '../types'
import { LyricSenseLogoIcon } from './LyricSenseLogo'

interface AudioUploaderProps {
  onFileSelected: (file: File, lyrics?: string) => void
  error?: string | null
  onClearError?: () => void
  theme: Theme
}

export default function AudioUploader({
  onFileSelected,
  error,
  onClearError,
  theme,
}: AudioUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [showLyricsModal, setShowLyricsModal] = useState(false)
  const [pastedLyrics, setPastedLyrics] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isDark = theme === 'dark'

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    onClearError?.()

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      onFileSelected(files[0], pastedLyrics.trim() || undefined)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onClearError?.()
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0], pastedLyrics.trim() || undefined)
      e.target.value = ''
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="w-full select-none">
      {/* Hidden native input for audio files */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
        onChange={handleFileChange}
        className="hidden"
        id="audio-file-input"
        aria-label="Upload audio track"
      />

      {/* Centered, Smaller Audio Upload Card */}
      <div
        tabIndex={0}
        role="button"
        aria-label="Audio upload panel. Press Enter or Space to choose an audio file or drag and drop here."
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-[500px] sm:max-w-[520px] mx-auto rounded-[22px] sm:rounded-[26px] border border-dashed p-6 sm:p-7 flex flex-col items-center text-center transition-all duration-300 relative ${
          isDragOver
            ? 'scale-[1.015] border-kobicha dark:border-ivory shadow-[0_0_30px_rgba(199,160,122,0.4)]'
            : 'border-lion hover:border-[#B58C67] shadow-2xs'
        }`}
        style={{
          backgroundColor: isDragOver
            ? isDark
              ? 'rgba(115, 65, 40, 0.45)'
              : 'rgba(253, 252, 232, 0.95)'
            : isDark
              ? 'rgba(45, 23, 12, 0.72)'
              : 'rgba(253, 252, 232, 0.65)',
        }}
      >
        {/* 1. Upload-Cloud Icon with Soft Rounded Badge */}
        <div
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3.5 transition-transform duration-200 border shadow-2xs ${
            isDragOver ? 'scale-110' : ''
          }`}
          style={{
            backgroundColor: isDark ? 'rgba(115, 65, 40, 0.4)' : '#EFE7D8',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(226, 206, 177, 0.8)',
          }}
        >
          <UploadCloud
            className="w-7 h-7 transition-colors"
            style={{ color: isDark ? '#C7A07A' : '#734128' }}
          />
        </div>

        {/* 2. UPLOAD AUDIO Heading (All caps, elegant serif typography) */}
        <h2
          className="font-editorial text-2xl sm:text-[26px] font-bold tracking-wider uppercase mb-1"
          style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
        >
          UPLOAD AUDIO
        </h2>

        {/* 3. Subtitle */}
        <p
          className="text-xs sm:text-sm font-normal mb-4"
          style={{ color: isDark ? '#E2CEB1' : '#734128' }}
        >
          Choose a track to begin your session.
        </p>

        {/* 4. Action Buttons: Choose Audio File + Paste lyrics for exact sync */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 h-11 rounded-full text-xs sm:text-sm font-medium shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-lion whitespace-nowrap"
            style={{
              backgroundColor: '#734128',
              color: '#FDFCE8',
            }}
          >
            <Music2 className="w-4 h-4 text-lion shrink-0" />
            <span>Choose Audio File</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowLyricsModal(true)
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 h-11 rounded-full text-xs sm:text-sm font-medium border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: isDark
                ? pastedLyrics.trim()
                  ? 'rgba(115, 65, 40, 0.45)'
                  : 'rgba(57, 30, 16, 0.6)'
                : pastedLyrics.trim()
                  ? 'rgba(239, 231, 216, 0.95)'
                  : 'rgba(253, 252, 232, 0.9)',
              borderColor: pastedLyrics.trim()
                ? '#C7A07A'
                : isDark
                  ? 'rgba(199, 160, 122, 0.4)'
                  : 'rgba(115, 65, 40, 0.3)',
              color: isDark ? '#E2CEB1' : '#734128',
            }}
          >
            {pastedLyrics.trim() ? (
              <>
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Lyrics Attached</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-lion shrink-0" />
                <span>Paste Lyrics for Exact Sync</span>
              </>
            )}
          </button>
        </div>

        {/* 5. Divider: ── or ── */}
        <div className="flex items-center justify-center w-36 gap-2.5 my-3.5" aria-hidden="true">
          <span
            className="h-px flex-1"
            style={{
              backgroundColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(216, 194, 167, 0.85)',
            }}
          />
          <span
            className="text-[11px] sm:text-xs font-normal"
            style={{ color: isDark ? '#C7A07A' : '#8C6D58' }}
          >
            or
          </span>
          <span
            className="h-px flex-1"
            style={{
              backgroundColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(216, 194, 167, 0.85)',
            }}
          />
        </div>

        {/* 6. Drag and Drop Instructions */}
        <p
          className="text-xs sm:text-sm font-normal mb-4"
          style={{ color: isDark ? '#E2CEB1' : '#734128' }}
        >
          {isDragOver ? 'Release to load audio track' : 'Drag and drop your audio file here'}
        </p>

        {/* 7. Bottom Waveform Icon + Supported Formats & 100 MB Limit */}
        <div
          className="flex items-center justify-center gap-2.5 text-[11px] sm:text-xs leading-snug"
          style={{ color: isDark ? 'rgba(226, 206, 177, 0.9)' : 'rgba(115, 65, 40, 0.9)' }}
        >
          <div className="shrink-0 text-lion flex items-center justify-center">
            <LyricSenseLogoIcon className="w-5 h-5 text-lion" />
          </div>
          <div className="text-center sm:text-left">
            <div>Supports MP3, WAV, M4A, AAC, OGG, FLAC</div>
            <div
              className="mt-0.5"
              style={{ color: isDark ? 'rgba(199, 160, 122, 0.85)' : 'rgba(140, 109, 88, 0.9)' }}
            >
              Maximum file size: 500 MB
            </div>
          </div>
        </div>
      </div>

      {/* Accessible Error Notification Alert */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 max-w-[500px] sm:max-w-[520px] mx-auto p-4 rounded-2xl border flex items-start gap-3 backdrop-blur-md shadow-sm transition-all"
          style={{
            backgroundColor: isDark ? 'rgba(115, 65, 40, 0.4)' : 'rgba(226, 206, 177, 0.5)',
            borderColor: '#C7A07A',
            color: isDark ? '#FDFCE8' : '#391E10',
          }}
        >
          <AlertCircle className="w-5 h-5 text-lion shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm leading-snug text-left">
            <p className="font-semibold mb-0.5">Upload Notice</p>
            <p>{error}</p>
          </div>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              className="text-xs text-lion hover:underline font-mono shrink-0 ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Paste Lyrics for Exact Sync Modal Dialog */}
      {showLyricsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-2xl border p-5 sm:p-6 backdrop-blur-xl shadow-2xl transition-all"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.96)' : 'rgba(253, 252, 232, 0.98)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.4)' : 'rgba(115, 65, 40, 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-editorial text-lg font-semibold" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
                  Paste Lyrics for Exact Sync
                </h3>
                <p className="text-xs" style={{ color: isDark ? '#E2CEB1' : '#734128' }}>
                  Supplied lyrics will be force-aligned against your audio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLyricsModal(false)}
                className="text-xs text-lion hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <textarea
              rows={8}
              value={pastedLyrics}
              onChange={(e) => setPastedLyrics(e.target.value)}
              placeholder="Paste song lyrics line-by-line here..."
              className="w-full p-3 rounded-xl border text-xs sm:text-sm font-sans focus:outline-none resize-none leading-relaxed"
              style={{
                backgroundColor: isDark ? 'rgba(57, 30, 16, 0.8)' : 'rgba(226, 206, 177, 0.3)',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
                color: isDark ? '#FDFCE8' : '#391E10',
              }}
            />

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLyricsModal(false)
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium border cursor-pointer hover:bg-black/5"
                style={{
                  borderColor: isDark ? 'rgba(199, 160, 122, 0.4)' : 'rgba(115, 65, 40, 0.3)',
                  color: isDark ? '#E2CEB1' : '#734128',
                }}
              >
                Keep for Later
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowLyricsModal(false)
                  fileInputRef.current?.click()
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-transform active:scale-98 cursor-pointer flex items-center gap-2"
                style={{
                  backgroundColor: '#734128',
                  color: '#FDFCE8',
                }}
              >
                <Music2 className="w-3.5 h-3.5 text-lion" />
                <span>Choose Audio & Align</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
