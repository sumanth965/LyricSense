import { motion } from 'framer-motion'
import { ArrowRight, Play, Sparkles } from 'lucide-react'
import type { Theme } from '../types'
import AudioWaveBackground from './AudioWaveBackground'
import MusicCarousel from './MusicCarousel'

interface HeroSectionProps {
  theme: Theme
  onGetStarted: () => void
  onOpenHowItWorks: () => void
}

export default function HeroSection({
  theme,
  onGetStarted,
  onOpenHowItWorks,
}: HeroSectionProps) {
  const isDark = theme === 'dark'

  return (
    <section className="relative w-full min-h-[calc(100vh-80px)] flex items-center justify-center px-4 sm:px-8 py-8 lg:py-12 overflow-hidden">
      {/* Decorative Cinematic Audio Wave Ribbon at bottom */}
      <AudioWaveBackground theme={theme} />

      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Headline, Copy, Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 flex flex-col items-start text-left"
        >
          {/* Eyebrow Label */}
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium tracking-wider uppercase mb-6 border transition-colors shadow-2xs"
            style={{
              backgroundColor: isDark ? 'rgba(57, 30, 16, 0.7)' : 'rgba(226, 206, 177, 0.45)',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
              color: isDark ? '#E2CEB1' : '#734128',
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-lion" />
            <span>AI-Powered Lyrics Teleprompter</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.12] mb-6">
            <span
              className="block"
              style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
            >
              Sing Freely,
            </span>
            <span
              className="block"
              style={{ color: isDark ? '#C7A07A' : '#734128' }}
            >
              We'll Keep You
            </span>
            <span
              className="block"
              style={{ color: isDark ? '#E2CEB1' : '#A37248' }}
            >
              on Track.
            </span>
          </h1>

          {/* Supporting Description */}
          <p
            className="text-base sm:text-lg leading-relaxed mb-8 max-w-lg font-normal"
            style={{ color: isDark ? '#E2CEB1' : '#734128' }}
          >
            Upload your song, get the lyrics automatically, and watch them highlight as you sing — in real time.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
            {/* Primary Action: Get Started */}
            <button
              type="button"
              onClick={onGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
              style={{
                backgroundColor: '#734128',
                color: '#FDFCE8',
              }}
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 text-lion" />
            </button>

            {/* Secondary Action: See How It Works */}
            <button
              type="button"
              onClick={onOpenHowItWorks}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-medium border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{
                backgroundColor: 'transparent',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.45)' : 'rgba(115, 65, 40, 0.35)',
                color: isDark ? '#FDFCE8' : '#391E10',
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center border"
                style={{
                  borderColor: isDark ? 'rgba(199, 160, 122, 0.5)' : 'rgba(115, 65, 40, 0.35)',
                  backgroundColor: isDark ? 'rgba(199, 160, 122, 0.15)' : 'rgba(115, 65, 40, 0.1)',
                }}
              >
                <Play className="w-2.5 h-2.5 text-lion fill-lion ml-0.5" />
              </div>
              <span>See How It Works</span>
            </button>
          </div>

          {/* Micro trust indicators */}
          <div
            className="mt-8 flex items-center gap-4 text-xs font-mono tracking-tight"
            style={{ color: isDark ? 'rgba(226, 206, 177, 0.7)' : 'rgba(115, 65, 40, 0.75)' }}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lion" />
              100% Local AI Model
            </span>
            <span className="opacity-40">•</span>
            <span>Zero Cloud Uploads</span>
            <span className="opacity-40">•</span>
            <span>Sub-second Sync</span>
          </div>
        </motion.div>

        {/* Right Column: Interactive Music Carousel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 flex items-center justify-center"
        >
          <MusicCarousel theme={theme} />
        </motion.div>
      </div>
    </section>
  )
}
