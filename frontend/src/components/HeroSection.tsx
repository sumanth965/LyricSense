import { useEffect, useState } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { AudioLines, Languages, Play, ShieldCheck, Upload } from 'lucide-react'
import type { Theme } from '../types'
import AudioWaveBackground from './AudioWaveBackground'
import MicrophoneScene from './MicrophoneScene'

interface HeroSectionProps {
  theme: Theme
  onGetStarted: () => void
  onOpenHowItWorks: () => void
}

/* Brand tokens: Bistre #391E10, Kobicha #734128, Lion #C7A07A, Dun #E2CEB1, Ivory #FDFCE8 */

const EXAMPLE_LINE = ['Hold', 'the', 'note', 'a', 'little', 'longer']

const FEATURES = [
  { icon: AudioLines, label: 'Word-by-word timing' },
  { icon: Languages, label: 'Any script, shown in Roman letters' },
  { icon: ShieldCheck, label: 'Processed on your machine by default' },
]

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
}

/** A short, original example line whose active word moves like the real teleprompter. */
function LyricPreview({ isDark, reduceMotion }: { isDark: boolean; reduceMotion: boolean }) {
  const [active, setActive] = useState(2)

  useEffect(() => {
    if (reduceMotion) return
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % EXAMPLE_LINE.length)
    }, 700)
    return () => window.clearInterval(id)
  }, [reduceMotion])

  return (
    <div
      className="w-full max-w-lg rounded-2xl border px-5 py-4 backdrop-blur-sm"
      style={{
        borderColor: isDark ? 'rgba(226,206,177,0.22)' : 'rgba(57,30,16,0.16)',
        background: isDark ? 'rgba(253,252,232,0.05)' : 'rgba(253,252,232,0.75)',
      }}
    >
      <p
        className="font-serif text-xl sm:text-2xl leading-relaxed"
        aria-label={EXAMPLE_LINE.join(' ')}
      >
        {EXAMPLE_LINE.map((word, i) => {
          const isActive = i === active
          const isPast = i < active
          return (
            <span
              key={word + i}
              aria-hidden="true"
              className="inline-block rounded-md px-1.5 transition-colors duration-200"
              style={{
                background: isActive ? '#C7A07A' : 'transparent',
                color: isActive
                  ? '#391E10'
                  : isDark
                    ? isPast
                      ? '#E2CEB1'
                      : 'rgba(226,206,177,0.5)'
                    : isPast
                      ? '#734128'
                      : 'rgba(115,65,40,0.5)',
              }}
            >
              {word}
            </span>
          )
        })}
      </p>
      <p
        className="mt-2 text-sm"
        style={{ color: isDark ? 'rgba(226,206,177,0.75)' : 'rgba(115,65,40,0.85)' }}
      >
        Words light up as the audio plays. Click any word to jump to it.
      </p>
    </div>
  )
}

export default function HeroSection({
  theme,
  onGetStarted,
  onOpenHowItWorks,
}: HeroSectionProps) {
  const isDark = theme === 'dark'
  const reduceMotion = useReducedMotion() ?? false

  const focusRing = isDark
    ? 'focus-visible:outline-[#E2CEB1]'
    : 'focus-visible:outline-[#734128]'

  return (
    <section className="relative w-full min-h-[calc(100vh-84px)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 lg:py-14 overflow-hidden">
      {/* Decorative flowing audio waves in lower scene background */}
      <AudioWaveBackground theme={theme} />

      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        {/* Left column: message, actions, live preview */}
        <motion.div
          variants={container}
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left"
        >
          <motion.h1
            variants={item}
            className="font-serif font-semibold tracking-tight text-4xl sm:text-5xl xl:text-6xl leading-[1.08] max-w-xl"
            style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
          >
            Every word, right on the beat.
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 text-lg leading-relaxed max-w-lg"
            style={{ color: isDark ? '#E2CEB1' : '#734128' }}
          >
            Upload a song or recording. LyricSense finds the vocals, writes out the
            lyrics, and times every word so you can sing along, rehearse, or read
            from the stage.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto"
          >
            <button
              type="button"
              onClick={onGetStarted}
              className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#C7A07A] px-7 py-3.5 text-base font-semibold text-[#391E10] shadow-[0_10px_30px_-12px_rgba(115,65,40,0.6)] transition hover:bg-[#d4b08d] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${focusRing}`}
            >
              <Upload className="h-5 w-5" aria-hidden="true" />
              Upload a track
            </button>

            <button
              type="button"
              onClick={onOpenHowItWorks}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-7 py-3.5 text-base font-semibold transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${focusRing} ${
                isDark
                  ? 'border-[#E2CEB1]/35 text-[#FDFCE8] hover:bg-[#E2CEB1]/10'
                  : 'border-[#391E10]/25 text-[#391E10] hover:bg-[#391E10]/5'
              }`}
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              See how it works
            </button>
          </motion.div>

          <motion.div variants={item} className="mt-10 w-full flex justify-center lg:justify-start">
            <LyricPreview isDark={isDark} reduceMotion={reduceMotion} />
          </motion.div>

          <motion.ul
            variants={item}
            className="mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-3"
            style={{ color: isDark ? '#E2CEB1' : '#734128' }}
          >
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2 text-sm">
                <Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: isDark ? '#C7A07A' : '#734128' }}
                  aria-hidden="true"
                />
                {label}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Right column: animated microphone scene, the one memorable element */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 flex items-center justify-center"
        >
          <MicrophoneScene theme={theme} />
        </motion.div>
      </div>
    </section>
  )
}