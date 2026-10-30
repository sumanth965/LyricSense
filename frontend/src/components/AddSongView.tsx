import { useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Globe,
  Link as LinkIcon,
  Trash2,
  UploadCloud,
  Wand2,
} from 'lucide-react'
import type { AudioMetadata, Theme } from '../types'
import { SAMPLE_SONG_LYRICS } from '../lib/songCatalog'

interface AddSongViewProps {
  metadata: AudioMetadata | null
  lyricsInput: string
  onLyricsInputChange: (lyrics: string) => void
  onFileSelected: (file: File) => void
  onRemoveTrack: () => void
  onContinueToSetup: () => void
  onOpenLibrary: () => void
  error: string | null
  onClearError: () => void
  theme: Theme
}

export default function AddSongView({
  metadata,
  lyricsInput,
  onLyricsInputChange,
  onFileSelected,
  onRemoveTrack,
  onContinueToSetup,
  onOpenLibrary,
  error,
  onClearError,
  theme,
}: AddSongViewProps) {
  const isDark = theme === 'dark'
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'library'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlNotice, setUrlNotice] = useState<string | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.[0]) {
      onFileSelected(e.dataTransfer.files[0])
    }
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return
    // Respect user prompt: Only implement URL import if backend supports it or explain capability honestly
    setUrlNotice(
      'Direct web stream extraction requires local audio files for offline neural processing. Please download the audio or select an explore demo track.',
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Header with Step Indicator */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-lion/20 text-lion text-xs font-semibold">
            2
          </span>
          <span
            className="text-xs font-medium tracking-wide uppercase"
            style={{ color: isDark ? '#E2CEB1' : '#734128' }}
          >
            Quick Start Options
          </span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold">Add a Song</h1>
        <p
          className="text-sm mt-1"
          style={{ color: isDark ? 'rgba(226,206,177,0.75)' : 'rgba(115,65,40,0.85)' }}
        >
          Choose how you want to add audio into your practice workspace.
        </p>
      </div>

      {/* 2. Top Tabs: Upload File, Paste URL, Choose from Library */}
      <div
        className="flex p-1 rounded-2xl border"
        style={{
          backgroundColor: isDark ? 'rgba(45, 23, 12, 0.6)' : 'rgba(253, 252, 232, 0.7)',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(115, 65, 40, 0.15)',
        }}
      >
        <button
          onClick={() => setActiveTab('upload')}
          className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: activeTab === 'upload' ? '#C7A07A' : 'transparent',
            color: activeTab === 'upload' ? '#391E10' : isDark ? '#E2CEB1' : '#734128',
          }}
        >
          <UploadCloud className="w-4 h-4" />
          Upload File
        </button>

        <button
          onClick={() => setActiveTab('url')}
          className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: activeTab === 'url' ? '#C7A07A' : 'transparent',
            color: activeTab === 'url' ? '#391E10' : isDark ? '#E2CEB1' : '#734128',
          }}
        >
          <LinkIcon className="w-4 h-4" />
          Paste URL
        </button>

        <button
          onClick={() => {
            setActiveTab('library')
            onOpenLibrary()
          }}
          className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: activeTab === 'library' ? '#C7A07A' : 'transparent',
            color: activeTab === 'library' ? '#391E10' : isDark ? '#E2CEB1' : '#734128',
          }}
        >
          <FolderOpen className="w-4 h-4" />
          Choose from Library
        </button>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={onClearError}
            className="text-xs underline hover:no-underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onFileSelected(e.target.files[0])
            e.target.value = ''
          }
        }}
        className="hidden"
      />

      {/* 4. Tab A: Upload File Zone */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          {!metadata ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all text-center cursor-pointer group"
              style={{
                backgroundColor: isDragging
                  ? isDark
                    ? 'rgba(199, 160, 122, 0.12)'
                    : 'rgba(199, 160, 122, 0.2)'
                  : isDark
                    ? 'rgba(43, 22, 12, 0.7)'
                    : '#FFFFFF',
                borderColor: isDragging
                  ? '#C7A07A'
                  : isDark
                    ? 'rgba(199, 160, 122, 0.35)'
                    : 'rgba(115, 65, 40, 0.25)',
              }}
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-lion/15 flex items-center justify-center text-lion group-hover:scale-110 transition-transform mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-semibold">
                Drag & drop your audio file here
              </h2>
              <p
                className="text-xs mt-1"
                style={{ color: isDark ? '#E2CEB1' : '#734128' }}
              >
                or
              </p>

              <button
                type="button"
                className="mt-4 px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm group-hover:shadow cursor-pointer"
                style={{
                  backgroundColor: '#734128',
                  color: '#FDFCE8',
                }}
              >
                Choose File
              </button>

              <p
                className="text-[11px] mt-4"
                style={{ color: isDark ? 'rgba(226,206,177,0.6)' : 'rgba(115,65,40,0.6)' }}
              >
                Supports MP3, WAV, M4A, AAC, OGG, FLAC • Max 500 MB
              </p>
            </div>
          ) : (
            /* Selected File Card */
            <div
              className="p-5 rounded-2xl border flex items-center justify-between gap-4"
              style={{
                backgroundColor: isDark ? 'rgba(43, 22, 12, 0.85)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
              }}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-sm truncate">{metadata.name}</h3>
                  <p
                    className="text-xs flex items-center gap-2 mt-0.5"
                    style={{ color: isDark ? '#E2CEB1' : '#734128' }}
                  >
                    <span>{metadata.format}</span>
                    <span>•</span>
                    <span>{metadata.formattedSize}</span>
                    <span>•</span>
                    <span>
                      {Math.floor(metadata.duration / 60)}:
                      {Math.floor(metadata.duration % 60)
                        .toString()
                        .padStart(2, '0')}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dun/30 hover:border-lion text-dun cursor-pointer"
                >
                  Replace
                </button>
                <button
                  onClick={onRemoveTrack}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Remove track"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab B: Paste URL */}
      {activeTab === 'url' && (
        <form
          onSubmit={handleUrlSubmit}
          className="p-6 rounded-3xl border space-y-4"
          style={{
            backgroundColor: isDark ? 'rgba(43, 22, 12, 0.7)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.18)',
          }}
        >
          <div>
            <label className="block text-xs font-medium mb-1.5">
              Paste Audio or Media URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/audio/song.mp3"
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-lion/40"
                style={{
                  backgroundColor: isDark ? 'rgba(30, 15, 8, 0.6)' : '#FAF6EE',
                  borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
                  color: isDark ? '#FDFCE8' : '#391E10',
                }}
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-lion text-bistre cursor-pointer shrink-0"
              >
                Fetch Audio
              </button>
            </div>
          </div>

          {urlNotice && (
            <div className="p-3 rounded-xl bg-lion/10 border border-lion/30 text-xs flex items-start gap-2">
              <Globe className="w-4 h-4 text-lion shrink-0 mt-0.5" />
              <p>{urlNotice}</p>
            </div>
          )}
        </form>
      )}

      {/* 6. Optional: Provide Lyrics for Exact Sync */}
      <div
        className="p-5 rounded-2xl border space-y-3"
        style={{
          backgroundColor: isDark ? 'rgba(45, 23, 12, 0.6)' : 'rgba(253, 252, 232, 0.8)',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.22)' : 'rgba(226, 206, 177, 0.9)',
        }}
      >
        <div className="flex items-center justify-between">
          <label className="text-xs sm:text-sm font-serif font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-lion"></span>
            Optional: Provide Lyrics (for exact sync)
          </label>
          <button
            type="button"
            onClick={() => onLyricsInputChange(SAMPLE_SONG_LYRICS)}
            className="text-[11px] font-medium text-lion hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Wand2 className="w-3 h-3" />
            Fill Demo Lyrics
          </button>
        </div>

        <p
          className="text-xs"
          style={{ color: isDark ? 'rgba(226,206,177,0.7)' : 'rgba(115,65,40,0.75)' }}
        >
          If you already have the official lyrics text, paste them here. The neural model will use
          phoneme forced-alignment to achieve exact word timing without hallucinating words.
        </p>

        <textarea
          value={lyricsInput}
          onChange={(e) => onLyricsInputChange(e.target.value)}
          placeholder="Paste lyrics here... (Optional)"
          rows={3}
          className="w-full p-3 rounded-xl border text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-lion/40 resize-y"
          style={{
            backgroundColor: isDark ? 'rgba(30, 15, 8, 0.7)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.22)' : 'rgba(115, 65, 40, 0.18)',
            color: isDark ? '#FDFCE8' : '#391E10',
          }}
        />
      </div>

      {/* 7. Action Button: Continue to Setup & Analyze */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onContinueToSetup}
          disabled={!metadata}
          className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-sm transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          style={{
            backgroundColor: '#734128',
            color: '#FDFCE8',
          }}
        >
          <span>Continue to Smart Setup</span>
          <span className="text-lion">→</span>
        </button>
      </div>
    </div>
  )
}
