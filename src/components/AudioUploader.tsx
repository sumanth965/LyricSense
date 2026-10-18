import { useRef, useState } from 'react'
import { AlertCircle, FileAudio, Music2, Sparkles, UploadCloud } from 'lucide-react'
import type { Theme } from '../types'

interface AudioUploaderProps {
  onFileSelected: (file: File) => void
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
    // Check if moving outside the current container
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
      onFileSelected(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onClearError?.()
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0])
      // Reset input value so re-uploading the same file still triggers onChange
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
    <div className="w-full max-w-2xl mx-auto select-none">
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
        onChange={handleFileChange}
        className="hidden"
        id="audio-file-input"
        aria-label="Upload audio track"
      />

      {/* Main Drag-and-Drop Zone */}
      <div
        tabIndex={0}
        role="button"
        aria-label="Audio upload zone: drop your audio file or press Enter to choose file"
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full rounded-3xl border-2 border-dashed p-8 sm:p-12 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer group ${
          isDragOver
            ? 'scale-[1.01] shadow-2xl'
            : 'hover:scale-[1.005] hover:shadow-lg'
        }`}
        style={{
          borderColor: isDragOver
            ? '#C7A07A'
            : isDark
              ? 'rgba(199, 160, 122, 0.35)'
              : 'rgba(115, 65, 40, 0.28)',
          backgroundColor: isDragOver
            ? isDark
              ? 'rgba(115, 65, 40, 0.3)'
              : 'rgba(226, 206, 177, 0.45)'
            : isDark
              ? 'rgba(45, 23, 12, 0.72)'
              : 'rgba(253, 252, 232, 0.88)',
          boxShadow: isDragOver
            ? '0 0 35px rgba(199, 160, 122, 0.25)'
            : '0 10px 30px rgba(0,0,0,0.06)',
        }}
      >
        {/* Animated Glow on Drag */}
        <div
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 border ${
            isDragOver
              ? 'scale-110 shadow-lg'
              : 'group-hover:scale-105'
          }`}
          style={{
            backgroundColor: isDark
              ? 'rgba(115, 65, 40, 0.45)'
              : 'rgba(226, 206, 177, 0.55)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.4)' : 'rgba(115, 65, 40, 0.3)',
          }}
        >
          {isDragOver ? (
            <FileAudio className="w-8 h-8 sm:w-10 sm:h-10 text-lion animate-pulse" />
          ) : (
            <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 text-lion transition-transform group-hover:-translate-y-1" />
          )}
        </div>

        {/* Heading & Instructions */}
        <h2
          className="font-editorial text-2xl sm:text-3xl font-semibold tracking-tight mb-2"
          style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
        >
          {isDragOver ? 'Release to Load Track' : 'Drop your audio here'}
        </h2>

        <p
          className="text-sm sm:text-base leading-relaxed mb-6 max-w-md font-normal"
          style={{ color: isDark ? '#E2CEB1' : '#734128' }}
        >
          Choose a track to begin your session.
        </p>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-102 active:scale-98 shadow-md cursor-pointer mb-6"
          style={{
            backgroundColor: '#734128',
            color: '#FDFCE8',
          }}
        >
          <Music2 className="w-4 h-4 text-lion" />
          <span>Choose Audio File</span>
        </button>

        {/* Technical Specification Badges */}
        <div
          className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono"
          style={{ color: isDark ? 'rgba(226, 206, 177, 0.8)' : 'rgba(115, 65, 40, 0.8)' }}
        >
          <span className="px-2.5 py-1 rounded-md bg-lion/10 border border-lion/20">
            MP3, WAV, M4A, AAC, OGG, FLAC
          </span>
          <span className="opacity-40">•</span>
          <span className="px-2.5 py-1 rounded-md bg-lion/10 border border-lion/20">
            Max 100 MB
          </span>
          <span className="opacity-40">•</span>
          <span className="inline-flex items-center gap-1 text-lion">
            <Sparkles className="w-3 h-3" /> 100% Client-Side
          </span>
        </div>
      </div>

      {/* Error Announcement Live Region */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 p-4 rounded-2xl border flex items-start gap-3 backdrop-blur-md shadow-sm transition-all"
          style={{
            backgroundColor: isDark ? 'rgba(115, 65, 40, 0.35)' : 'rgba(226, 206, 177, 0.45)',
            borderColor: '#C7A07A',
            color: isDark ? '#FDFCE8' : '#391E10',
          }}
        >
          <AlertCircle className="w-5 h-5 text-lion shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm leading-snug">
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
    </div>
  )
}
