import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  Compass,
  FileAudio,
  Music2,
  Play,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react'
import type { SongCatalogItem, Theme } from '../types'
import { CATALOG_SONGS } from '../lib/songCatalog'

interface ExploreViewProps {
  onSelectTrack: (track: SongCatalogItem) => void
  onGoToUpload: () => void
  onQuickLoadDemo: () => void
  theme: Theme
}

const FILTER_PILLS = ['Trending', 'Hindi', 'English', 'Kannada', 'Japanese', 'All']

export default function ExploreView({
  onSelectTrack,
  onGoToUpload,
  onQuickLoadDemo,
  theme,
}: ExploreViewProps) {
  const isDark = theme === 'dark'
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('Trending')

  const filteredSongs = CATALOG_SONGS.filter((song) => {
    const matchesSearch =
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.language.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (activeFilter === 'Trending') return true
    if (activeFilter === 'All') return true
    return song.language.toLowerCase().includes(activeFilter.toLowerCase())
  })

  const recommendedSongs = filteredSongs.filter((s) => s.isRecommended)
  const topPracticeSongs = filteredSongs.filter((s) => s.isTopPractice)

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* 1. Header & Search Area */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-lion/20 text-lion text-xs font-semibold">
                1
              </span>
              <span
                className="text-xs font-medium tracking-wide uppercase"
                style={{ color: isDark ? '#E2CEB1' : '#734128' }}
              >
                Explore / Discover
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold">
              Start with a song or explore the studio library
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: isDark ? 'rgba(226,206,177,0.75)' : 'rgba(115,65,40,0.85)' }}
            >
              Choose a practice track with bundled audio, or upload your own local audio file.
            </p>
          </div>

          <button
            onClick={onGoToUpload}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: '#C7A07A',
              color: '#391E10',
            }}
          >
            <Upload className="w-4 h-4" />
            Upload Your Audio
          </button>
        </div>

        {/* Search input with URL indicator */}
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: isDark ? '#C7A07A' : '#734128' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, languages..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-lion/40"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.7)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.18)',
              color: isDark ? '#FDFCE8' : '#391E10',
            }}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_PILLS.map((pill) => {
            const isActive = activeFilter === pill
            return (
              <button
                key={pill}
                onClick={() => setActiveFilter(pill)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer"
                style={{
                  backgroundColor: isActive
                    ? '#C7A07A'
                    : isDark
                      ? 'rgba(253, 252, 232, 0.08)'
                      : 'rgba(115, 65, 40, 0.08)',
                  color: isActive
                    ? '#391E10'
                    : isDark
                      ? '#E2CEB1'
                      : '#734128',
                  borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(115, 65, 40, 0.15)',
                }}
              >
                {pill}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Recommended for You Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-serif font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-lion" />
            Recommended for you
          </h2>
          <span className="text-xs text-dun/80">3 featured songs</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {recommendedSongs.map((song) => (
            <motion.div
              key={song.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              onClick={() => onSelectTrack(song)}
              className="p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between"
              style={{
                backgroundColor: isDark ? 'rgba(43, 22, 12, 0.75)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.22)' : 'rgba(226, 206, 177, 0.9)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: song.coverColor || '#734128' }}
                >
                  <Music2 className="w-6 h-6 text-lion" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-lion/15 text-lion mb-1">
                    {song.language}
                  </span>
                  <h3 className="font-medium text-sm truncate group-hover:text-lion transition-colors">
                    {song.title}
                  </h3>
                  <p
                    className="text-xs truncate"
                    style={{ color: isDark ? '#E2CEB1' : '#734128' }}
                  >
                    {song.artist}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-dun/15 flex items-center justify-between text-xs">
                <span className="text-dun/70 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {song.duration}
                </span>
                <span className="text-lion font-medium group-hover:underline flex items-center gap-1">
                  <Play className="w-3 h-3 fill-current" />
                  Practice Now
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. Top Practice Tracks Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-serif font-semibold flex items-center gap-2">
            <Compass className="w-4 h-4 text-lion" />
            Top Practice Tracks
          </h2>
          <span className="text-xs text-dun/80">Acoustic & vocal timing drills</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {topPracticeSongs.map((song) => {
            const hasBundledAudio = Boolean(song.demoAudioUrl)
            return (
              <motion.div
                key={song.id}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                onClick={() => onSelectTrack(song)}
                className="p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between"
                style={{
                  backgroundColor: isDark ? 'rgba(43, 22, 12, 0.75)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(199, 160, 122, 0.22)' : 'rgba(226, 206, 177, 0.9)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: song.coverColor || '#391E10' }}
                  >
                    <FileAudio className="w-6 h-6 text-lion" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-lion/15 text-lion">
                        {song.language}
                      </span>
                      {hasBundledAudio && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                          Demo Ready
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-sm truncate group-hover:text-lion transition-colors">
                      {song.title}
                    </h3>
                    <p
                      className="text-xs truncate"
                      style={{ color: isDark ? '#E2CEB1' : '#734128' }}
                    >
                      {song.artist}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-dun/15 flex items-center justify-between text-xs">
                  <span className="text-dun/70 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {song.duration}
                  </span>
                  <span className="text-lion font-medium group-hover:underline flex items-center gap-1">
                    <Play className="w-3 h-3 fill-current" />
                    {hasBundledAudio ? 'Load & Sync' : 'Select'}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* 4. Instant Demo Audio Banner */}
      <div
        className="p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(115, 65, 40, 0.4) 0%, rgba(57, 30, 16, 0.8) 100%)'
            : 'linear-gradient(135deg, #FDFCE8 0%, #E2CEB1 100%)',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
        }}
      >
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-12 h-12 rounded-xl bg-lion/20 flex items-center justify-center shrink-0 text-lion">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-serif font-semibold text-sm sm:text-base">
              Try LyricSense Instantly with Pre-loaded Studio Audio
            </h4>
            <p
              className="text-xs mt-0.5"
              style={{ color: isDark ? 'rgba(226,206,177,0.85)' : 'rgba(57,30,16,0.85)' }}
            >
              Includes full vocal track, reference lyrics, and instant word alignment.
            </p>
          </div>
        </div>

        <button
          onClick={onQuickLoadDemo}
          className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-transform active:scale-95 cursor-pointer shrink-0"
          style={{
            backgroundColor: '#391E10',
            color: '#FDFCE8',
            border: '1px solid rgba(199, 160, 122, 0.4)',
          }}
        >
          One-Click Demo Track
        </button>
      </div>
    </div>
  )
}
