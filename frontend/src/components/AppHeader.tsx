import { useState } from 'react'
import {
  Compass,
  FileAudio,
  History,
  Home,
  Menu,
  Moon,
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
}: AppHeaderProps) {
  const isDark = theme === 'dark'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks: { id: NavigationTab | 'home'; label: string; icon: typeof Home; enabled: boolean }[] = [
    { id: 'home', label: 'Home', icon: Home, enabled: true },
    { id: 'explore', label: 'Explore', icon: Compass, enabled: true },
    { id: 'add-song', label: 'Add a Song', icon: Upload, enabled: true },
    { id: 'studio', label: 'Lyrics Studio', icon: FileAudio, enabled: hasActiveTrack },
    { id: 'practice-modes', label: 'Practice Modes', icon: Sliders, enabled: hasTranscription },
    { id: 'progress', label: 'History / Progress', icon: History, enabled: true },
  ]

  return (
    <header className="relative w-full z-40 px-4 sm:px-8 pt-4 sm:pt-5 pb-2">
      <div
        className="max-w-6xl mx-auto rounded-2xl border px-4 sm:px-6 py-3 backdrop-blur-md flex items-center justify-between transition-colors shadow-sm"
        style={{
          backgroundColor: isDark ? 'rgba(57, 30, 16, 0.85)' : 'rgba(253, 252, 232, 0.92)',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
        }}
      >
        {/* Brand (Left) */}
        <div
          className="cursor-pointer"
          onClick={() => onSelectTab('home')}
        >
          <LyricSenseLogo theme={theme} textSize="text-lg sm:text-xl" iconSize={24} />
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navLinks.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id
            if (!item.enabled) return null

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-lion text-bistre shadow-xs'
                    : isDark
                      ? 'text-dun/80 hover:text-ivory hover:bg-white/5'
                      : 'text-kobicha/80 hover:text-bistre hover:bg-black/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Right Action Icons: How It Works, Settings, Theme Toggle, Add Song CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* How It Works Button */}
          <button
            type="button"
            onClick={onOpenHowItWorks}
            className="hidden sm:inline-flex px-3 py-1.5 rounded-xl text-xs font-medium border border-dun/25 text-dun hover:border-lion hover:text-lion transition-colors cursor-pointer"
          >
            How It Works
          </button>

          {/* Settings button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl border border-dun/20 hover:border-lion text-dun hover:text-lion transition-colors cursor-pointer"
            title="Studio Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            className="p-2 rounded-xl border border-dun/20 hover:border-lion text-dun hover:text-lion transition-colors cursor-pointer"
            title="Toggle Theme"
          >
            {isDark ? <Moon className="w-4 h-4 text-lion" /> : <Sun className="w-4 h-4 text-kobicha" />}
          </button>

          {/* Primary Quick CTA */}
          <button
            type="button"
            onClick={() => onSelectTab('add-song')}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            style={{
              backgroundColor: '#734128',
              color: '#FDFCE8',
            }}
          >
            <Upload className="w-3.5 h-3.5 text-lion" />
            <span className="hidden sm:inline">Add a Song</span>
            <span className="sm:hidden">Add</span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-dun/20 text-dun hover:text-lion cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden mt-2 max-w-6xl mx-auto rounded-2xl border p-4 backdrop-blur-md shadow-xl transition-all"
          style={{
            backgroundColor: isDark ? 'rgba(45, 23, 12, 0.98)' : 'rgba(253, 252, 232, 0.98)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
          }}
        >
          <nav className="flex flex-col gap-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon
              const isActive = currentTab === item.id
              if (!item.enabled) return null

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2.5 ${
                    isActive ? 'bg-lion text-bistre' : 'text-dun hover:bg-dun/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}

            <button
              onClick={() => {
                onOpenHowItWorks()
                setMobileMenuOpen(false)
              }}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-dun hover:bg-dun/10"
            >
              How It Works
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
