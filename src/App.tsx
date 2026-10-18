import { useEffect, useState } from 'react'
import type { Theme } from './types'
import AudioTeleprompter from './components/AudioTeleprompter'
import ParticleField from './components/ParticleField'

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('lyricsense-theme')
      return saved === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })

  // Synchronize theme attribute on document root
  useEffect(() => {
    try {
      localStorage.setItem('lyricsense-theme', theme)
    } catch {
      // LocalStorage might be restricted
    }

    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const isDark = theme === 'dark'

  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex flex-col select-none transition-colors duration-500"
      style={{
        backgroundColor: isDark ? '#391E10' : '#FDFCE8',
        color: isDark ? '#FDFCE8' : '#391E10',
      }}
    >
      {/* 1. Full-Screen Cinematic Background Layer (The Bronze Microphone Artwork) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/image.png"
          alt="LyricSense Cinematic Microphone and Soundwaves"
          className="w-full h-full object-cover object-[72%_center] sm:object-[68%_center] scale-100 transition-transform duration-1000 ease-out"
        />

        {/* Soft Vignette Overlay ensuring teleprompter text contrast while preserving microphone visual */}
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, rgba(57, 30, 16, 0.94) 0%, rgba(57, 30, 16, 0.8) 35%, rgba(57, 30, 16, 0.45) 65%, rgba(57, 30, 16, 0.65) 100%)'
              : 'linear-gradient(90deg, rgba(253, 252, 232, 0.94) 0%, rgba(253, 252, 232, 0.82) 35%, rgba(253, 252, 232, 0.45) 65%, rgba(253, 252, 232, 0.6) 100%)',
          }}
        />

        {/* Top & Bottom Atmospheric Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse at 70% 45%, rgba(199, 160, 122, 0.15) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at 70% 45%, rgba(199, 160, 122, 0.25) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* 2. Interactive SVG Golden Halo Rings & Waves */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <filter id="sceneHaloGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="sceneGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C7A07A" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FDFCE8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#734128" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Golden Halo Ring 1 */}
        <g transform="translate(1010, 390)">
          <circle
            r="165"
            fill="none"
            stroke="url(#sceneGoldGrad)"
            strokeWidth="1.8"
            strokeDasharray="20 12 6 12"
            filter="url(#sceneHaloGlow)"
            className="animate-halo-spin origin-center"
            opacity="0.8"
          />
        </g>

        {/* Golden Halo Ring 2 */}
        <g transform="translate(1010, 390)">
          <circle
            r="225"
            fill="none"
            stroke="#E2CEB1"
            strokeWidth="1.2"
            strokeDasharray="8 10"
            className="animate-halo-spin-rev origin-center"
            opacity="0.45"
          />
        </g>
      </svg>

      {/* 3. Floating Shimmer Particles & Musical Notes */}
      <ParticleField theme={theme} />

      {/* 4. Forefront: Live Audio & Synchronized Lyrics Teleprompter */}
      <div className="relative z-20 w-full h-full flex flex-col">
        <AudioTeleprompter
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>
    </div>
  )
}
