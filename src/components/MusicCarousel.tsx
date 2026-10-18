import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CarouselSlideData } from '../types'
import CarouselSlide from './CarouselSlide'

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
      'Planned Phase 2 tracking to follow your microphone input in real time, adapting prompter cadence to your singing speed.',
    category: 'Vocal AI',
    badge: 'Upcoming',
  },
  {
    id: 4,
    title: 'Pro Teleprompter Controls',
    subtitle: 'Stage-Ready Ergonomics',
    description:
      'Fine-tune typography size, auto-scroll pacing, mirror mode projection, and high-contrast colorways for effortless stage reading.',
    category: 'Interface',
    badge: 'Display',
  },
]

interface MusicCarouselProps {
  theme: 'dark' | 'light'
}

export default function MusicCarousel({ theme }: MusicCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const isDark = theme === 'dark'

  const nextSlide = useCallback(() => {
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length)
  }, [])

  const prevSlide = useCallback(() => {
    setDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
  }, [])

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextSlide()
      } else if (e.key === 'ArrowLeft') {
        prevSlide()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextSlide, prevSlide])

  // Slide transition variants
  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 120 : -120,
      opacity: 0,
      scale: 0.94,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 10,
      transition: {
        x: { type: 'spring', stiffness: 280, damping: 28 },
        opacity: { duration: 0.35 },
        scale: { duration: 0.35 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -120 : 120,
      opacity: 0,
      scale: 0.94,
      zIndex: 0,
      transition: {
        x: { type: 'spring', stiffness: 280, damping: 28 },
        opacity: { duration: 0.25 },
        scale: { duration: 0.25 },
      },
    }),
  }

  // Calculate previous and next preview slides for layered depth
  const prevIndex = (currentIndex - 1 + SLIDES.length) % SLIDES.length
  const nextIndex = (currentIndex + 1) % SLIDES.length

  return (
    <div
      className="relative w-full max-w-[480px] sm:max-w-[520px] lg:max-w-[560px] mx-auto select-none"
      role="region"
      aria-roledescription="carousel"
      aria-label="LyricSense Features Carousel"
    >
      {/* Warm ambient glow behind cards */}
      <div
        className="absolute -inset-4 rounded-3xl blur-2xl pointer-events-none transition-all duration-700 opacity-60"
        style={{
          background: isDark
            ? 'radial-gradient(circle at center, rgba(199, 160, 122, 0.16) 0%, rgba(115, 65, 40, 0.1) 60%, transparent 80%)'
            : 'radial-gradient(circle at center, rgba(199, 160, 122, 0.28) 0%, rgba(226, 206, 177, 0.2) 60%, transparent 80%)',
        }}
      />

      {/* Layered Card Container */}
      <div className="relative h-[430px] sm:h-[460px] flex items-center justify-center">
        {/* Left Peeking Card (Perspective Layer) */}
        <div
          onClick={prevSlide}
          className="hidden md:block absolute -left-12 top-6 bottom-6 w-[70%] rounded-2xl cursor-pointer transition-all duration-500 opacity-35 hover:opacity-55 -rotate-3 scale-90 border pointer-events-auto"
          style={{
            backgroundColor: isDark ? 'rgba(45, 23, 12, 0.55)' : 'rgba(226, 206, 177, 0.35)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.18)' : 'rgba(115, 65, 40, 0.15)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
            zIndex: 1,
          }}
          title={`Previous: ${SLIDES[prevIndex].title}`}
          aria-hidden="true"
        >
          <div className="p-5 pointer-events-none filter blur-[0.5px]">
            <span className="text-[10px] uppercase font-mono text-lion">
              {SLIDES[prevIndex].badge}
            </span>
            <p className="text-sm font-editorial font-semibold mt-1 line-clamp-1" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
              {SLIDES[prevIndex].title}
            </p>
          </div>
        </div>

        {/* Right Peeking Card (Perspective Layer) */}
        <div
          onClick={nextSlide}
          className="hidden md:block absolute -right-12 top-6 bottom-6 w-[70%] rounded-2xl cursor-pointer transition-all duration-500 opacity-35 hover:opacity-55 rotate-3 scale-90 border pointer-events-auto"
          style={{
            backgroundColor: isDark ? 'rgba(45, 23, 12, 0.55)' : 'rgba(226, 206, 177, 0.35)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.18)' : 'rgba(115, 65, 40, 0.15)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
            zIndex: 1,
          }}
          title={`Next: ${SLIDES[nextIndex].title}`}
          aria-hidden="true"
        >
          <div className="p-5 pointer-events-none filter blur-[0.5px]">
            <span className="text-[10px] uppercase font-mono text-lion">
              {SLIDES[nextIndex].badge}
            </span>
            <p className="text-sm font-editorial font-semibold mt-1 line-clamp-1" style={{ color: isDark ? '#FDFCE8' : '#391E10' }}>
              {SLIDES[nextIndex].title}
            </p>
          </div>
        </div>

        {/* Central Active Card */}
        <div className="relative w-full h-full z-10">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_e, { offset }) => {
                if (offset.x < -40) {
                  nextSlide()
                } else if (offset.x > 40) {
                  prevSlide()
                }
              }}
              className="w-full h-full rounded-2xl border backdrop-blur-md shadow-xl flex flex-col overflow-hidden"
              style={{
                backgroundColor: isDark ? 'rgba(45, 23, 12, 0.85)' : 'rgba(253, 252, 232, 0.92)',
                borderColor: isDark ? 'rgba(199, 160, 122, 0.32)' : 'rgba(115, 65, 40, 0.25)',
                boxShadow: isDark
                  ? '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(199, 160, 122, 0.25)'
                  : '0 20px 40px rgba(115, 65, 40, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
              }}
            >
              <CarouselSlide
                slide={SLIDES[currentIndex]}
                isActive={true}
                theme={theme}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Carousel Controls: Previous/Next Arrows + 4 Pagination Indicators */}
      <div className="flex items-center justify-between mt-6 px-3">
        {/* Previous Button */}
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Previous capability slide"
          className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            backgroundColor: isDark ? 'rgba(57, 30, 16, 0.75)' : 'rgba(226, 206, 177, 0.6)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
            color: isDark ? '#FDFCE8' : '#391E10',
          }}
        >
          <ChevronLeft className="w-5 h-5 text-lion" />
        </button>

        {/* 4 Pagination Indicators */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
          style={{
            backgroundColor: isDark ? 'rgba(45, 23, 12, 0.65)' : 'rgba(226, 206, 177, 0.4)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(115, 65, 40, 0.15)',
          }}
          role="tablist"
          aria-label="Carousel pagination"
        >
          {SLIDES.map((slide, index) => {
            const isSelected = index === currentIndex
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Go to slide ${index + 1}: ${slide.title}`}
                onClick={() => goToSlide(index)}
                className="relative h-2 rounded-full transition-all duration-300 cursor-pointer"
                style={{
                  width: isSelected ? '24px' : '8px',
                  backgroundColor: isSelected
                    ? '#C7A07A'
                    : isDark
                      ? 'rgba(199, 160, 122, 0.3)'
                      : 'rgba(115, 65, 40, 0.25)',
                }}
              />
            )
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next capability slide"
          className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            backgroundColor: isDark ? 'rgba(57, 30, 16, 0.75)' : 'rgba(226, 206, 177, 0.6)',
            borderColor: isDark ? 'rgba(199, 160, 122, 0.35)' : 'rgba(115, 65, 40, 0.25)',
            color: isDark ? '#FDFCE8' : '#391E10',
          }}
        >
          <ChevronRight className="w-5 h-5 text-lion" />
        </button>
      </div>
    </div>
  )
}
