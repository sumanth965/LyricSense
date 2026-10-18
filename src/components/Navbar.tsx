import { useState } from 'react'
import {
  ArrowRight,
  AudioWaveform,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react'
import type { Theme } from '../types'

interface NavbarProps {
  theme: Theme
  onToggleTheme: () => void
  onGetStarted: () => void
  onOpenHowItWorks: () => void
  onNavigateSection?: (sectionId: string) => void
}

export default function Navbar({
  theme,
  onToggleTheme,
  onGetStarted,
  onOpenHowItWorks,
  onNavigateSection,
}: NavbarProps) {
  const [activeItem, setActiveItem] = useState('Home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isDark = theme === 'dark'

  const navItems = [
    { name: 'Home', action: () => setActiveItem('Home') },
    {
      name: 'Features',
      action: () => {
        setActiveItem('Features')
        onNavigateSection?.('features')
      },
    },
    {
      name: 'How It Works',
      action: () => {
        setActiveItem('How It Works')
        onOpenHowItWorks()
      },
    },
    {
      name: 'Pricing',
      action: () => {
        setActiveItem('Pricing')
        onNavigateSection?.('pricing')
      },
    },
    {
      name: 'About',
      action: () => {
        setActiveItem('About')
        onNavigateSection?.('about')
      },
    },
  ]

  return (
    <header className="relative w-full z-40 px-4 sm:px-8 pt-5 sm:pt-6">
      <div
        className="max-w-6xl mx-auto rounded-2xl border px-4 sm:px-6 py-3.5 backdrop-blur-md flex items-center justify-between transition-colors shadow-sm"
        style={{
          backgroundColor: isDark ? 'rgba(57, 30, 16, 0.78)' : 'rgba(253, 252, 232, 0.88)',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.22)' : 'rgba(115, 65, 40, 0.2)',
        }}
      >
        {/* Brand (Left) */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{
              backgroundColor: isDark ? 'rgba(115, 65, 40, 0.4)' : 'rgba(226, 206, 177, 0.5)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
            }}
          >
            <AudioWaveform className="w-4 h-4 text-lion" />
          </div>
          <span
            className="font-editorial text-xl sm:text-2xl font-semibold tracking-tight select-none"
            style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
          >
            Lyric<span className="text-lion">Sense</span>
          </span>
        </div>

        {/* Center Navigation Items (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = activeItem === item.name
            return (
              <button
                key={item.name}
                type="button"
                onClick={item.action}
                className="relative px-3.5 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-colors cursor-pointer"
                style={{
                  color: isActive
                    ? isDark ? '#FDFCE8' : '#391E10'
                    : isDark ? '#E2CEB1' : '#734128',
                }}
              >
                {item.name}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                    style={{ backgroundColor: '#C7A07A' }}
                  />
                )}
              </button>
            )
          })}
        </nav>

        {/* Right Controls: Theme Toggle + Get Started Button */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Circular Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.65)' : 'rgba(226, 206, 177, 0.4)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
              color: '#C7A07A',
            }}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Primary Get Started Button */}
          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer"
            style={{
              backgroundColor: '#734128',
              color: '#FDFCE8',
            }}
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 text-lion" />
          </button>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.65)' : 'rgba(226, 206, 177, 0.4)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
              color: isDark ? '#FDFCE8' : '#391E10',
            }}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className="md:hidden mt-2 max-w-6xl mx-auto rounded-2xl border p-4 backdrop-blur-md shadow-xl transition-all"
          style={{
            backgroundColor: isDark ? 'rgba(45, 23, 12, 0.95)' : 'rgba(253, 252, 232, 0.98)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.25)',
          }}
        >
          <nav className="flex flex-col gap-1.5" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  item.action()
                  setMobileMenuOpen(false)
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  backgroundColor:
                    activeItem === item.name
                      ? isDark ? 'rgba(115, 65, 40, 0.35)' : 'rgba(226, 206, 177, 0.4)'
                      : 'transparent',
                  color:
                    activeItem === item.name
                      ? '#C7A07A'
                      : isDark ? '#FDFCE8' : '#391E10',
                }}
              >
                {item.name}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
