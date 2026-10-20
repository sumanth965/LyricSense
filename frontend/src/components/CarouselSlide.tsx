import { motion } from 'framer-motion'
import {
  AudioWaveform,
  Check,
  Mic,
  Music2,
  Play,
  Sliders,
  Sparkles,
  Type,
  Volume2,
} from 'lucide-react'
import type { CarouselSlideData } from '../types'

interface CarouselSlideProps {
  slide: CarouselSlideData
  isActive: boolean
  theme: 'dark' | 'light'
}

export default function CarouselSlide({ slide, isActive, theme }: CarouselSlideProps) {
  const isDark = theme === 'dark'

  return (
    <div className="w-full h-full flex flex-col justify-between p-6 sm:p-7 select-none">
      {/* Slide Header: Badge + Category */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase"
          style={{
            backgroundColor: isDark ? 'rgba(199, 160, 122, 0.15)' : 'rgba(115, 65, 40, 0.12)',
            color: isDark ? '#E2CEB1' : '#734128',
            border: isDark ? '1px solid rgba(199, 160, 122, 0.28)' : '1px solid rgba(115, 65, 40, 0.22)',
          }}
        >
          <Sparkles className="w-3 h-3 text-lion" />
          {slide.badge}
        </span>
        <span className="text-xs font-mono tracking-wider text-lion/80">
          0{slide.id} / 04
        </span>
      </div>

      {/* Slide Interactive Graphic / Showcase */}
      <div className="my-auto py-2">
        {slide.id === 1 && (
          /* Slide 1: Audio Analysis */
          <div className="space-y-4">
            <div
              className="p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden"
              style={{
                backgroundColor: isDark ? 'rgba(57, 30, 16, 0.6)' : 'rgba(253, 252, 232, 0.7)',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-kobicha/30 border border-lion/30 flex items-center justify-center text-lion">
                    <Music2 className="w-4 h-4 text-lion" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ivory dark:text-ivory" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
                      Acoustic Spectrum
                    </p>
                    <p className="text-[10px] text-lion/90">faster-whisper AI Pipeline</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-lion/15 text-lion border border-lion/30 font-mono">
                  44.1 kHz
                </span>
              </div>

              {/* Dynamic waveform bars */}
              <div className="flex items-end justify-between gap-1.5 h-16 pt-2 px-1">
                {[40, 65, 30, 85, 95, 50, 75, 40, 90, 100, 70, 45, 80, 60, 35, 75, 90, 55, 30, 60].map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      background: i % 3 === 0 ? '#C7A07A' : i % 2 === 0 ? '#E2CEB1' : '#734128',
                    }}
                    animate={
                      isActive
                        ? {
                            height: [`${h * 0.4}%`, `${h}%`, `${Math.max(20, h * 0.6)}%`, `${h}%`],
                          }
                        : { height: `${h}%` }
                    }
                    transition={{
                      duration: 1.6 + (i % 5) * 0.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-lion/80 pt-1 border-t border-lion/15">
                <span>Vocal Separation</span>
                <span className="font-mono text-[10px]">Confidence: 98.4%</span>
              </div>
            </div>
          </div>
        )}

        {slide.id === 2 && (
          /* Slide 2: Synchronized Lyrics */
          <div className="space-y-4">
            <div
              className="p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden"
              style={{
                backgroundColor: isDark ? 'rgba(57, 30, 16, 0.6)' : 'rgba(253, 252, 232, 0.7)',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
              }}
            >
              {/* Illustrative Timestamp Banner */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-lion font-mono">
                  <Play className="w-3.5 h-3.5 fill-lion text-lion" />
                  <span>01:24.40</span>
                  <span className="text-lion/50">/ 03:42.00</span>
                </div>
                <span className="text-[10px] tracking-wide px-2 py-0.5 rounded bg-kobicha/20 text-lion border border-lion/25 font-sans">
                  Illustrative Preview
                </span>
              </div>

              {/* Synchronized Lyrics with One Highlighted Word */}
              <div className="py-2 px-1 text-center font-editorial text-lg sm:text-xl leading-relaxed">
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

              {/* Playback progress bar */}
              <div className="space-y-1.5 pt-1">
                <div className="w-full h-1.5 rounded-full bg-lion/20 overflow-hidden relative">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: '#C7A07A' }}
                    animate={isActive ? { width: ['35%', '65%', '42%'] } : { width: '45%' }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-lion/75 font-mono">
                  <span>Verse 2 • Line 4</span>
                  <span>Sync Offset: 0ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {slide.id === 3 && (
          /* Slide 3: Live Singing */
          <div className="space-y-4">
            <div
              className="p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden"
              style={{
                backgroundColor: isDark ? 'rgba(57, 30, 16, 0.6)' : 'rgba(253, 252, 232, 0.7)',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-kobicha/30 border border-lion/30 flex items-center justify-center text-lion">
                    <Mic className="w-4 h-4 text-lion" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
                      Microphone Vocal Input
                    </p>
                    <p className="text-[10px] text-lion/90">Live Pitch & Word Match</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded bg-lion/15 text-lion border border-lion/30 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-lion animate-pulse" />
                  Standby
                </span>
              </div>

              {/* Voice vs Reference Waveform Matching */}
              <div className="h-16 flex items-center justify-center relative px-2">
                <svg className="w-full h-full" viewBox="0 0 260 50" fill="none">
                  {/* Reference line */}
                  <path
                    d="M 5,25 Q 35,5 65,25 T 125,25 T 185,25 T 255,25"
                    stroke="#E2CEB1"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  {/* Live vocal wave */}
                  <motion.path
                    d="M 5,25 Q 35,10 65,25 T 125,18 T 185,32 T 255,25"
                    stroke="#C7A07A"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    animate={
                      isActive
                        ? {
                            d: [
                              'M 5,25 Q 35,10 65,25 T 125,18 T 185,32 T 255,25',
                              'M 5,25 Q 35,35 65,20 T 125,32 T 185,15 T 255,25',
                              'M 5,25 Q 35,10 65,25 T 125,18 T 185,32 T 255,25',
                            ],
                          }
                        : undefined
                    }
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-lion/80 pt-1 border-t border-lion/15">
                <span>Phase 2 Feature: Stage Teleprompter</span>
                <span className="font-mono text-[10px]">Latency: &lt;15ms</span>
              </div>
            </div>
          </div>
        )}

        {slide.id === 4 && (
          /* Slide 4: Teleprompter Controls */
          <div className="space-y-4">
            <div
              className="p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden"
              style={{
                backgroundColor: isDark ? 'rgba(57, 30, 16, 0.6)' : 'rgba(253, 252, 232, 0.7)',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(115, 65, 40, 0.2)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-kobicha/30 border border-lion/30 flex items-center justify-center text-lion">
                    <Sliders className="w-4 h-4 text-lion" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
                      Prompter Ergonomics
                    </p>
                    <p className="text-[10px] text-lion/90">Custom Reading Environment</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-lion/15 text-lion border border-lion/30 font-mono">
                  Stage Mode
                </span>
              </div>

              {/* Visual Controls Preview */}
              <div className="grid grid-cols-2 gap-2 text-xs py-1">
                <div
                  className="p-2.5 rounded-lg border flex items-center justify-between"
                  style={{
                    backgroundColor: isDark ? 'rgba(45, 23, 12, 0.7)' : 'rgba(226, 206, 177, 0.35)',
                    borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(115, 65, 40, 0.15)',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-lion" />
                    <span style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>Size</span>
                  </div>
                  <span className="font-mono text-lion font-medium">32 pt</span>
                </div>

                <div
                  className="p-2.5 rounded-lg border flex items-center justify-between"
                  style={{
                    backgroundColor: isDark ? 'rgba(45, 23, 12, 0.7)' : 'rgba(226, 206, 177, 0.35)',
                    borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(115, 65, 40, 0.15)',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <AudioWaveform className="w-3.5 h-3.5 text-lion" />
                    <span style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>Scroll</span>
                  </div>
                  <span className="font-mono text-lion font-medium">Auto-Sync</span>
                </div>
              </div>

              {/* Teleprompter mini preview row */}
              <div className="flex items-center justify-between text-[11px] text-lion/80 pt-1 border-t border-lion/15">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-lion" /> Mirror Display Mode
                </span>
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-lion" /> High Contrast
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slide Text Content */}
      <div className="mt-4 pt-2">
        <h3
          className="text-lg sm:text-xl font-editorial font-semibold tracking-tight mb-1.5"
          style={{ color: isDark ? '#FDFCE8' : '#391E10' }}
        >
          {slide.title}
        </h3>
        <p
          className="text-xs sm:text-sm leading-relaxed"
          style={{ color: isDark ? '#E2CEB1' : '#734128' }}
        >
          {slide.description}
        </p>
      </div>
    </div>
  )
}
