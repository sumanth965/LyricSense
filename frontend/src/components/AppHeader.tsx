import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Compass,
  FileAudio,
  HelpCircle,
  History,
  Home,
  Lock,
  Menu,
  Moon,
  Plus,
  Settings,
  Sliders,
  Sun,
  Upload,
  X,
} from 'lucide-react'
import type { NavigationTab, Theme } from '../types'
import LyricSenseLogo from './LyricSenseLogo'

interface AppHeaderProps {
  currentTab: NavigationTab | 'home'
  onSelectTab: (tab: NavigationTab | 'home') => void
  hasActiveTrack: boolean
  hasTranscription: boolean
  onToggleTheme: () => void
  onOpenSettings: () => void
  onOpenHowItWorks: () => void
  theme: Theme
  activeTrackName?: string
}

export default function AppHeader({
  currentTab,
  onSelectTab,
  hasActiveTrack,
  hasTranscription,
  onToggleTheme,
  onOpenSettings,
  onOpenHowItWorks,
  theme,
  activeTrackName,
}: AppHeaderProps) {
  const isDark = theme === 'dark'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  // Center navigation items (5 distinct primary destinations)
  const navItems: {
    id: NavigationTab | 'home'
    label: string
    icon: typeof Home
    enabled: boolean
    hasStatusDot?: boolean
    tooltip?: string
  }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      enabled: true,
      tooltip: 'Return to introduction',
    },
    {
      id: 'explore',
      label: 'Explore',
      icon: Compass,
      enabled: true,
      tooltip: 'Discover practice songs and library tracks',
    },
    {
      id: 'studio',
      label: 'Studio',
      icon: FileAudio,
      enabled: hasActiveTrack,
      hasStatusDot: hasActiveTrack,
      tooltip: hasActiveTrack
        ? `Active Track: ${activeTrackName || 'Loaded'}`
        : 'Load or upload an audio track to enter Studio',
    },
    {
      id: 'practice-modes',
      label: 'Practice',
      icon: Sliders,
      enabled: hasTranscription,
      tooltip: hasTranscription
        ? 'Open vocal timing and pitch drill modes'
        : 'Requires completed lyrics alignment in Studio',
    },
    {
      id: 'progress',
      label: 'History',
      icon: History,
      enabled: true,
      tooltip: 'View rehearsal history and vocal scoring progress',
    },
  ]

  const handleNavClick = (id: NavigationTab | 'home', enabled: boolean) => {
    if (!enabled) return
    onSelectTab(id)
    setMobileMenuOpen(false)
  }

  const isAddSongActive = currentTab === 'add-song'

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-md transition-colors duration-200 border-b select-none"
      style={{
        backgroundColor: isDark ? 'rgba(36, 20, 13, 0.94)' : 'rgba(250, 246, 238, 0.95)',
        borderColor: isDark ? 'rgba(199, 160, 122, 0.18)' : 'rgba(115, 65, 40, 0.14)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-4">
        {/* 1. Brand Section — Left */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('home', true)}
            className="flex items-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lion focus-visible:rounded-lg p-1 -ml-1 transition-opacity hover:opacity-90"
            aria-label="LyricSense Home"
          >
            <LyricSenseLogo theme={theme} textSize="text-lg sm:text-xl" iconSize={24} />
          </button>
        </div>

        {/* 2. Main Navigation — Center (Desktop / Laptop: lg+) */}
        <nav
          className="hidden lg:flex items-center justify-center space-x-1 xl:space-x-2 h-full"
          aria-label="Main Navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id
            const isClickable = item.enabled

            return (
              <button
                key={item.id}
                type="button"
                disabled={!isClickable}
                onClick={() => handleNavClick(item.id, isClickable)}
                title={item.tooltip}
                aria-disabled={!isClickable}
                aria-current={isActive ? 'page' : undefined}
                className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lion ${
                  !isClickable
                    ? 'opacity-40 cursor-not-allowed text-[#734128]/50 dark:text-[#E2CEB1]/40'
                    : isActive
                      ? 'text-[#391E10] dark:text-[#FDFCE8] font-semibold bg-[#C7A07A]/15 dark:bg-[#C7A07A]/20 cursor-default'
                      : 'text-[#734128] dark:text-[#E2CEB1] hover:text-[#391E10] dark:hover:text-[#FDFCE8] hover:bg-[#734128]/6 dark:hover:bg-white/5 cursor-pointer'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 opacity-80" />
                <span>{item.label}</span>

                {/* Subtle active underline indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-lion"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Track-ready tiny status indicator beside Studio */}
                {item.hasStatusDot && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-0.5"
                    title="Audio track ready in studio"
                  />
                )}

                {/* Locked indicator when unavailable */}
                {!isClickable && (
                  <Lock
                    className="w-3 h-3 opacity-60 shrink-0 ml-0.5"
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </nav>

        {/* 3. Utility Section — Right */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* How It Works (Full text on xl, icon on lg, mobile drawer on < lg) */}
          <button
            type="button"
            onClick={onOpenHowItWorks}
            title="How LyricSense Works"
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs xl:text-sm font-medium text-[#734128] dark:text-[#E2CEB1] hover:text-[#391E10] dark:hover:text-[#FDFCE8] hover:bg-[#734128]/6 dark:hover:bg-white/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lion"
          >
            <HelpCircle className="w-4 h-4 text-lion shrink-0" />
            <span>How It Works</span>
          </button>

          <button
            type="button"
            onClick={onOpenHowItWorks}
            title="How LyricSense Works"
            className="hidden lg:inline-flex xl:hidden p-2 rounded-lg text-[#734128] dark:text-[#E2CEB1] hover:text-[#391E10] dark:hover:text-[#FDFCE8] hover:bg-[#734128]/6 dark:hover:bg-white/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lion"
            aria-label="How It Works"
          >
            <HelpCircle className="w-4 h-4 text-lion" />
          </button>

          {/* Settings button */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Studio Settings"
            className="hidden sm:inline-flex p-2 rounded-lg text-[#734128] dark:text-[#E2CEB1] hover:text-[#391E10] dark:hover:text-[#FDFCE8] hover:bg-[#734128]/6 dark:hover:bg-white/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lion"
            aria-label="Studio Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Light/Dark theme toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className="p-2 rounded-lg text-[#734128] dark:text-[#E2CEB1] hover:text-[#391E10] dark:hover:text-[#FDFCE8] hover:bg-[#734128]/6 dark:hover:bg-white/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lion"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? (
              <Moon className="w-4 h-4 text-lion transition-transform hover:-rotate-12" />
            ) : (
              <Sun className="w-4 h-4 text-kobicha transition-transform hover:rotate-45" />
            )}
          </button>

          {/* Primary Action: + Add Song */}
          <button
            type="button"
            onClick={() => handleNavClick('add-song', true)}
            title="Add a song or upload local audio"
            className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold tracking-wide transition-all duration-150 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lion focus-visible:ring-offset-2 active:scale-[0.98] ${
              isAddSongActive
                ? 'ring-2 ring-lion ring-offset-1 ring-offset-transparent'
                : 'hover:bg-[#5C331E]'
            }`}
            style={{
              backgroundColor: isAddSongActive ? '#8C4F32' : '#734128',
              color: '#FDFCE8',
            }}
          >
            <Plus className="w-3.5 h-3.5 text-lion" strokeWidth={2.5} />
            <span className="hidden sm:inline">Add Song</span>
            <span className="sm:hidden">Add</span>
          </button>

          {/* Mobile Menu Hamburger (< lg) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="Navigation Menu"
            className="lg:hidden p-2 rounded-lg text-[#734128] dark:text-[#E2CEB1] hover:text-[#391E10] dark:hover:text-[#FDFCE8] hover:bg-[#734128]/6 dark:hover:bg-white/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lion"
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 4. Mobile / Tablet Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 top-18 sm:top-20 bg-black/40 backdrop-blur-xs z-40"
              aria-hidden="true"
            />

            {/* Slide-down Drawer Panel */}
            <motion.div
              ref={drawerRef}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="lg:hidden relative z-50 border-b shadow-xl px-4 py-4 space-y-3"
              style={{
                backgroundColor: isDark ? '#24140D' : '#FAF6EE',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(115, 65, 40, 0.16)',
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation Menu"
            >
              {/* Active track status banner */}
              {hasActiveTrack && (
                <div
                  className="p-2.5 rounded-lg border flex items-center justify-between text-xs"
                  style={{
                    backgroundColor: isDark ? 'rgba(199, 160, 122, 0.1)' : 'rgba(115, 65, 40, 0.06)',
                    borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(115, 65, 40, 0.14)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="font-medium truncate text-[#734128] dark:text-[#E2CEB1]">
                      {activeTrackName ? `Active: ${activeTrackName}` : 'Audio track loaded'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavClick('studio', true)}
                    className="font-semibold text-xs text-lion hover:underline shrink-0 ml-2 cursor-pointer"
                  >
                    Open Studio →
                  </button>
                </div>
              )}

              {/* Navigation list */}
              <nav className="flex flex-col space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = currentTab === item.id
                  const isClickable = item.enabled

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!isClickable}
                      onClick={() => handleNavClick(item.id, isClickable)}
                      aria-disabled={!isClickable}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lion ${
                        !isClickable
                          ? 'opacity-40 cursor-not-allowed text-[#734128]/50 dark:text-[#E2CEB1]/40'
                          : isActive
                            ? 'bg-[#C7A07A]/20 text-[#391E10] dark:text-[#FDFCE8] font-semibold'
                            : 'text-[#734128] dark:text-[#E2CEB1] hover:bg-[#734128]/6 dark:hover:bg-white/5 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0 opacity-80" />
                        <span>{item.label}</span>
                      </div>

                      {item.hasStatusDot && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Active
                        </span>
                      )}

                      {!isClickable && (
                        <span className="flex items-center gap-1 text-xs opacity-50">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </span>
                      )}
                    </button>
                  )
                })}

                {/* Upload / Add Song Action */}
                <button
                  type="button"
                  onClick={() => handleNavClick('add-song', true)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lion ${
                    isAddSongActive
                      ? 'bg-[#C7A07A]/20 text-[#391E10] dark:text-[#FDFCE8] font-semibold'
                      : 'text-[#734128] dark:text-[#E2CEB1] hover:bg-[#734128]/6 dark:hover:bg-white/5 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Upload className="w-4 h-4 shrink-0 opacity-80 text-lion" />
                    <span>Upload & Add Song</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#734128]/10 dark:bg-white/10 text-lion">
                    Audio
                  </span>
                </button>
              </nav>

              {/* Utility actions in drawer */}
              <div className="pt-2 border-t border-[#E2CEB1]/40 dark:border-[#C7A07A]/15 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenHowItWorks()
                    setMobileMenuOpen(false)
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-medium border border-[#E2CEB1]/60 dark:border-[#C7A07A]/20 text-[#734128] dark:text-[#E2CEB1] hover:text-[#391E10] dark:hover:text-[#FDFCE8] hover:bg-[#734128]/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-lion" />
                  <span>How It Works</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings()
                    setMobileMenuOpen(false)
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-medium border border-[#E2CEB1]/60 dark:border-[#C7A07A]/20 text-[#734128] dark:text-[#E2CEB1] hover:text-[#391E10] dark:hover:text-[#FDFCE8] hover:bg-[#734128]/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
