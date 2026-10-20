import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AudioWaveform,
  ChevronLeft,
  ChevronRight,
  Mic,
  Music2,
  Play,
  Sliders,
  Sparkles,
  Type,
} from 'lucide-react'
import type { CarouselSlideData } from '../types'
import ParticleField from './ParticleField'

const SLIDES: CarouselSlideData[] = [
  {
    id: 1,
    title: 'Precision Audio Analysis',
    subtitle: 'Spectral Feature Extraction',
    description:
      'Locally runs neural speech transcription with acoustic separation to analyze track tempo and frequency signatures.',
    category: 'Analysis',
    badge: 'Stage 1',
  },
  {
    id: 2,
    title: 'Synchronized Word Highlighting',
    subtitle: 'Millisecond Timestamp Alignment',
    description:
      'Maps recognized vocal tokens to precise timestamps, highlighting each word in fluid real-time synchrony during playback.',
    category: 'Sync Engine',
    badge: 'Core Feature',
  },
  {
    id: 3,
    title: 'Live Singing & Vocal Tracking',
    subtitle: 'Dynamic Microphone Input',
    description:
      'Phase 2 vocal tracking follows your microphone input in real time, adapting prompter cadence to your singing speed.',
    category: 'Vocal AI',
    badge: 'Upcoming',
  },
  {
    id: 4,
    title: 'Pro Teleprompter Controls',
    subtitle: 'Stage-Ready Ergonomics',
    description:
      'Fine-tune typography size, auto-scroll pacing, mirror mode projection, and high-contrast stage colorways.',
    category: 'Interface',
    badge: 'Display',
  },
]

interface MicrophoneSceneProps {
  theme: 'dark' | 'light'
}

export default function MicrophoneScene({ theme }: MicrophoneSceneProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const isDark = theme === 'dark'

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide()
      if (e.key === 'ArrowLeft') prevSlide()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextSlide, prevSlide])

  const activeSlide = SLIDES[currentIndex]

  return (
    <div
      className="relative w-full h-[540px] sm:h-[620px] lg:h-[680px] rounded-3xl overflow-hidden select-none border transition-all shadow-2xl flex flex-col justify-between"
      style={{
        borderColor: isDark ? 'rgba(199, 160, 122, 0.28)' : 'rgba(115, 65, 40, 0.22)',
        boxShadow: isDark
          ? '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(199, 160, 122, 0.12)'
          : '0 25px 60px -15px rgba(115, 65, 40, 0.18), 0 0 40px rgba(199, 160, 122, 0.2)',
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="LyricSense Cinematic Microphone Showcase"
    >
      {/* 1. Base Layer: The Text-Free Bronze Microphone Artwork */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/image.png"
          alt="LyricSense Cinematic Bronze Microphone and Luminous Soundwaves"
          className="w-full h-full object-cover object-[70%_center] sm:object-[68%_center] transition-transform duration-1000 ease-out"
        />

        {/* Soft Vignette Overlay to ensure text readability & theme harmonizing */}
        <div
          className="absolute inset-0 pointer-events-none transition-colors duration-500"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, rgba(57, 30, 16, 0.88) 0%, rgba(57, 30, 16, 0.4) 40%, rgba(57, 30, 16, 0.05) 70%, rgba(57, 30, 16, 0.4) 100%)'
              : 'linear-gradient(90deg, rgba(253, 252, 232, 0.85) 0%, rgba(253, 252, 232, 0.35) 40%, rgba(253, 252, 232, 0) 70%, rgba(253, 252, 232, 0.3) 100%)',
          }}
        />

        {/* Vertical subtle gradient for top header blend & bottom card foundation */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(57, 30, 16, 0.2) 0%, transparent 30%, transparent 65%, rgba(45, 23, 12, 0.65) 100%)',
          }}
        />
      </div>

      {/* 2. Interactive SVG Layer: Animated Golden Halo Rings & Glowing Waves */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 680"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <filter id="haloGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="haloGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C7A07A" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FDFCE8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#734128" stopOpacity="0.6" />
          </linearGradient>

          <linearGradient id="waveLiveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C7A07A" stopOpacity="0" />
            <stop offset="35%" stopColor="#FDFCE8" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#C7A07A" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#E2CEB1" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Animated Golden Halo Ring 1 (Inner, rotating slowly) */}
        <g transform="translate(545, 260)">
          <circle
            r="125"
            fill="none"
            stroke="url(#haloGold)"
            strokeWidth="1.5"
            strokeDasharray="18 10 4 10"
            filter="url(#haloGlow)"
            className="animate-halo-spin origin-center"
            opacity="0.85"
          />
        </g>

        {/* Animated Golden Halo Ring 2 (Middle, counter-rotating) */}
        <g transform="translate(545, 260)">
          <circle
            r="165"
            fill="none"
            stroke="#E2CEB1"
            strokeWidth="1.2"
            strokeDasharray="6 8"
            className="animate-halo-spin-rev origin-center"
            opacity="0.45"
          />
        </g>

        {/* Animated Golden Halo Ring 3 (Outer ambient pulse) */}
        <g transform="translate(545, 260)">
          <circle
            r="205"
            fill="none"
            stroke="#C7A07A"
            strokeWidth="0.8"
            strokeDasharray="4 14"
            className="animate-glow-pulse origin-center"
            opacity="0.3"
          />
        </g>

        {/* Additional Flowing SVG Audio Wave Overlay Ribbon */}
        <motion.path
          d="M 120,400 Q 280,330 440,370 T 760,320"
          fill="none"
          stroke="url(#waveLiveGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#haloGlow)"
          animate={{
            d: [
              'M 120,400 Q 280,330 440,370 T 760,320',
              'M 120,385 Q 280,360 440,345 T 760,335',
              'M 120,400 Q 280,330 440,370 T 760,320',
            ],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Harmonic Crest */}
        <motion.path
          d="M 160,420 Q 340,360 520,390 T 800,345"
          fill="none"
          stroke="#C7A07A"
          strokeWidth="1.2"
          strokeDasharray="5 5"
          opacity="0.5"
          animate={{
            d: [
              'M 160,420 Q 340,360 520,390 T 800,345',
              'M 160,405 Q 340,380 520,370 T 800,360',
              'M 160,420 Q 340,360 520,390 T 800,345',
            ],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />

        {/* Stage Reflective Platform Luminous Pulse at bottom */}
        <ellipse
          cx="545"
          cy="555"
          rx="180"
          ry="32"
          fill="url(#haloGold)"
          opacity="0.18"
          filter="url(#haloGlow)"
          className="animate-glow-pulse"
        />
      </svg>

      {/* 3. Floating Particles & Musical Notes */}
      <ParticleField theme={theme} />

      {/* 4. Top Scene Badge / Mode indicator */}
      <div className="relative z-20 p-5 sm:p-6 flex items-center justify-between">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono tracking-wide border backdrop-blur-md shadow-xs"
          style={{
            backgroundColor: isDark ? 'rgba(57, 30, 16, 0.75)' : 'rgba(253, 252, 232, 0.85)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
            color: isDark ? '#E2CEB1' : '#734128',
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-lion" />
          <span className="font-semibold">{activeSlide.badge}</span>
          <span className="opacity-40">•</span>
          <span>{activeSlide.category}</span>
        </div>

        <span
          className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border backdrop-blur-md text-lion"
          style={{
            backgroundColor: isDark ? 'rgba(45, 23, 12, 0.7)' : 'rgba(253, 252, 232, 0.85)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(115, 65, 40, 0.2)',
          }}
        >
          0{activeSlide.id} / 04
        </span>
      </div>

      {/* 5. Center/Lower Capability Interactive Preview Card */}
      <div className="relative z-20 px-4 sm:px-6 pb-5 sm:pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg mx-auto sm:mx-0 rounded-2xl border p-4 sm:p-5 backdrop-blur-md shadow-xl transition-all"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.86)' : 'rgba(253, 252, 232, 0.92)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.28)',
            }}
          >
            {/* Dynamic Interactive Visuals for each Capability */}
            {activeSlide.id === 1 && (
              /* Slide 1: Audio Analysis */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-kobicha/30 border border-lion/30 flex items-center justify-center text-lion">
                      <Music2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
                        {activeSlide.title}
                      </h4>
                      <p className="text-[10px] text-lion/90">faster-whisper AI Pipeline</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-lion/15 text-lion border border-lion/25">
                    44.1 kHz • Local
                  </span>
                </div>

                {/* Animated Spectrum Equalizer */}
                <div className="flex items-end justify-between gap-1.5 h-12 pt-1 px-1">
                  {[35, 75, 45, 90, 100, 60, 85, 40, 95, 80, 50, 70, 90, 45, 65, 85].map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-full"
                      style={{
                        backgroundColor: i % 2 === 0 ? '#C7A07A' : '#E2CEB1',
                      }}
                      animate={{
                        height: [`${h * 0.35}%`, `${h}%`, `${Math.max(20, h * 0.5)}%`, `${h}%`],
                      }}
                      transition={{
                        duration: 1.4 + (i % 4) * 0.25,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeSlide.id === 2 && (
              /* Slide 2: Synchronized Lyrics Preview */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-lion font-mono">
                    <Play className="w-3.5 h-3.5 fill-lion text-lion" />
                    <span>01:24.40</span>
                    <span className="text-lion/50">/ 03:42.00</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-kobicha/25 text-lion border border-lion/25 font-sans">
                    Illustrative Sync Preview
                  </span>
                </div>

                {/* Word Highlighting Karaoke Display */}
                <div className="py-1 text-center font-editorial text-base sm:text-lg leading-relaxed">
                  <span style={{ color: isDark ? 'rgba(253, 252, 232, 0.45)' : 'rgba(57, 30, 16, 0.45)' }}>
                    I can hear the music in the{' '}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-md font-semibold inline-block shadow-xs border transition-colors"
                    style={{
                      backgroundColor: '#734128',
                      color: '#FDFCE8',
                      borderColor: '#C7A07A',
                    }}
                  >
                    silence
                  </span>
                  <span style={{ color: isDark ? 'rgba(253, 252, 232, 0.45)' : 'rgba(57, 30, 16, 0.45)' }}>
                    , echo in my soul.
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-lion/20 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-lion"
                    animate={{ width: ['30%', '70%', '45%'] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </div>
            )}

            {activeSlide.id === 3 && (
              /* Slide 3: Live Singing & Voice Input */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-kobicha/30 border border-lion/30 flex items-center justify-center text-lion">
                      <Mic className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
                        {activeSlide.title}
                      </h4>
                      <p className="text-[10px] text-lion/90">Microphone Pitch Following</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded bg-lion/15 text-lion border border-lion/25 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-lion animate-pulse" />
                    Phase 2 Standby
                  </span>
                </div>

                {/* Pitch alignment curve */}
                <div className="h-10 flex items-center justify-center px-1">
                  <svg className="w-full h-full" viewBox="0 0 240 40" fill="none">
                    <path
                      d="M 5,20 Q 35,5 65,20 T 125,20 T 185,20 T 235,20"
                      stroke="#E2CEB1"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      opacity="0.5"
                    />
                    <motion.path
                      d="M 5,20 Q 35,8 65,20 T 125,14 T 185,26 T 235,20"
                      stroke="#C7A07A"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      animate={{
                        d: [
                          'M 5,20 Q 35,8 65,20 T 125,14 T 185,26 T 235,20',
                          'M 5,20 Q 35,30 65,16 T 125,26 T 185,12 T 235,20',
                          'M 5,20 Q 35,8 65,20 T 125,14 T 185,26 T 235,20',
                        ],
                      }}
                      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </svg>
                </div>
              </div>
            )}

            {activeSlide.id === 4 && (
              /* Slide 4: Teleprompter Controls */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-kobicha/30 border border-lion/30 flex items-center justify-center text-lion">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
                        {activeSlide.title}
                      </h4>
                      <p className="text-[10px] text-lion/90">Display Ergonomics</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-lion/15 text-lion border border-lion/25 font-mono">
                    Stage Mode
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div
                    className="p-2 rounded-lg border flex items-center justify-between"
                    style={{
                      backgroundColor: isDark ? 'rgba(57, 30, 16, 0.6)' : 'rgba(226, 206, 177, 0.3)',
                      borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.18)',
                    }}
                  >
                    <span className="flex items-center gap-1.5" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
                      <Type className="w-3 h-3 text-lion" /> Text Size
                    </span>
                    <span className="font-mono text-lion font-semibold">32 pt</span>
                  </div>

                  <div
                    className="p-2 rounded-lg border flex items-center justify-between"
                    style={{
                      backgroundColor: isDark ? 'rgba(57, 30, 16, 0.6)' : 'rgba(226, 206, 177, 0.3)',
                      borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.18)',
                    }}
                  >
                    <span className="flex items-center gap-1.5" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
                      <AudioWaveform className="w-3 h-3 text-lion" /> Auto-Scroll
                    </span>
                    <span className="font-mono text-lion font-semibold">Sync</span>
                  </div>
                </div>
              </div>
            )}

            {/* Slide Description Summary */}
            <p
              className="text-xs leading-relaxed mt-2.5 pt-2 border-t"
              style={{
                borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(115, 65, 40, 0.15)',
                color: isDark ? '#E2CEB1' : '#734128',
              }}
            >
              {activeSlide.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* 6. Carousel Controls Area */}
        <div className="flex items-center justify-between mt-3 px-1">
          {/* Previous Arrow */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous capability"
            className="w-8 h-8 rounded-full flex items-center justify-center border backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.75)' : 'rgba(253, 252, 232, 0.85)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
              color: isDark ? '#FDFCE8' : '#391E10',
            }}
          >
            <ChevronLeft className="w-4 h-4 text-lion" />
          </button>

          {/* 4 Pagination Indicators */}
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.65)' : 'rgba(253, 252, 232, 0.8)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
            }}
            role="tablist"
            aria-label="Capability pagination"
          >
            {SLIDES.map((slide, index) => {
              const isSelected = index === currentIndex
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`View ${slide.title}`}
                  onClick={() => setCurrentIndex(index)}
                  className="relative h-2 rounded-full transition-all duration-300 cursor-pointer"
                  style={{
                    width: isSelected ? '22px' : '7px',
                    backgroundColor: isSelected
                      ? '#C7A07A'
                      : isDark
                        ? 'rgba(199, 160, 122, 0.35)'
                        : 'rgba(115, 65, 40, 0.3)',
                  }}
                />
              )
            })}
          </div>

          {/* Next Arrow */}
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next capability"
            className="w-8 h-8 rounded-full flex items-center justify-center border backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
            style={{
              backgroundColor: isDark ? 'rgba(45, 23, 12, 0.75)' : 'rgba(253, 252, 232, 0.85)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
              color: isDark ? '#FDFCE8' : '#391E10',
            }}
          >
            <ChevronRight className="w-4 h-4 text-lion" />
          </button>
        </div>
      </div>
    </div>
  )
}
