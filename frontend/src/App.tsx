import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Theme, ViewState } from './types'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import HowItWorksDialog from './components/HowItWorksDialog'
import AudioWorkspace from './components/AudioWorkspace'

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('lyricsense-theme')
      return saved === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  const [currentView, setCurrentView] = useState<ViewState>('home')
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

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

  return (
    <div
      className="min-h-screen relative flex flex-col transition-colors duration-300"
      style={{
        backgroundColor: theme === 'dark' ? '#391E10' : '#FAF6EE',
        color: theme === 'dark' ? '#FDFCE8' : '#391E10',
      }}
    >
      <AnimatePresence mode="wait">
        {currentView === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col justify-between"
          >
            {/* Top Navigation */}
            <Navbar
              theme={theme}
              onToggleTheme={toggleTheme}
              onGetStarted={() => setCurrentView('workspace')}
              onOpenHowItWorks={() => setHowItWorksOpen(true)}
              onNavigateSection={(_section) => setHowItWorksOpen(true)}
            />

            {/* Cinematic Hero with Microphone Scene */}
            <main className="flex-1 flex items-center">
              <HeroSection
                theme={theme}
                onGetStarted={() => setCurrentView('workspace')}
                onOpenHowItWorks={() => setHowItWorksOpen(true)}
              />
            </main>
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-screen"
          >
            {/* Recreated Audio Workspace Reference View */}
            <AudioWorkspace
              onBackToHome={() => setCurrentView('home')}
              theme={theme}
              onToggleTheme={toggleTheme}
              onOpenHowItWorks={() => setHowItWorksOpen(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Accessible How It Works Modal (Available from both Home and Workspace) */}
      <HowItWorksDialog
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
        onGetStarted={() => {
          setHowItWorksOpen(false)
          setCurrentView('workspace')
        }}
        theme={theme}
      />
    </div>
  )
}
