import { motion } from 'framer-motion'

interface AudioWaveBackgroundProps {
  theme: 'dark' | 'light'
}

export default function AudioWaveBackground({ theme }: AudioWaveBackgroundProps) {
  const isDark = theme === 'dark'

  // Subtle floating particles/musical notes
  const particles = [
    { id: 1, x: '12%', y: '68%', delay: 0, duration: 6, size: 4, symbol: '♪' },
    { id: 2, x: '28%', y: '75%', delay: 1.2, duration: 7, size: 3, symbol: '•' },
    { id: 3, x: '46%', y: '62%', delay: 2.1, duration: 5.5, size: 4, symbol: '♫' },
    { id: 4, x: '68%', y: '72%', delay: 0.8, duration: 8, size: 3, symbol: '•' },
    { id: 5, x: '84%', y: '64%', delay: 1.8, duration: 6.5, size: 4, symbol: '♪' },
    { id: 6, x: '92%', y: '78%', delay: 2.5, duration: 7.2, size: 3, symbol: '•' },
  ]

  return (
    <div
      className="absolute inset-x-0 bottom-0 pointer-events-none overflow-hidden h-[260px] sm:h-[340px] z-0 select-none"
      aria-hidden="true"
    >
      {/* Soft warm radial glow at center bottom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[220px] rounded-full blur-3xl transition-opacity duration-500"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(199, 160, 122, 0.14) 0%, rgba(115, 65, 40, 0.08) 50%, transparent 80%)'
            : 'radial-gradient(circle, rgba(199, 160, 122, 0.22) 0%, rgba(226, 206, 177, 0.15) 50%, transparent 80%)',
        }}
      />

      {/* Floating particles & musical notes */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute text-lion/60 font-serif select-none"
          style={{ left: p.x, top: p.y, fontSize: `${p.size * 3.5}px` }}
          animate={{
            y: [-6, 6, -6],
            opacity: isDark ? [0.25, 0.7, 0.25] : [0.35, 0.8, 0.35],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        >
          {p.symbol}
        </motion.span>
      ))}

      {/* Flowing Audio Wave SVG Ribbons */}
      <svg
        className="absolute bottom-0 w-full h-full min-w-[960px] left-1/2 -translate-x-1/2"
        viewBox="0 0 1440 320"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C7A07A" stopOpacity="0" />
            <stop offset="30%" stopColor="#C7A07A" stopOpacity={isDark ? '0.45' : '0.35'} />
            <stop offset="70%" stopColor="#E2CEB1" stopOpacity={isDark ? '0.35' : '0.45'} />
            <stop offset="100%" stopColor="#C7A07A" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#734128" stopOpacity="0" />
            <stop offset="25%" stopColor="#C7A07A" stopOpacity={isDark ? '0.3' : '0.25'} />
            <stop offset="65%" stopColor="#734128" stopOpacity={isDark ? '0.4' : '0.35'} />
            <stop offset="100%" stopColor="#734128" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E2CEB1" stopOpacity="0" />
            <stop offset="45%" stopColor="#E2CEB1" stopOpacity={isDark ? '0.2' : '0.3'} />
            <stop offset="85%" stopColor="#C7A07A" stopOpacity={isDark ? '0.25' : '0.25'} />
            <stop offset="100%" stopColor="#E2CEB1" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="waveFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C7A07A" stopOpacity={isDark ? '0.06' : '0.08'} />
            <stop offset="100%" stopColor="#391E10" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soft filled ribbon underneath */}
        <path
          d="M0,230 C240,160 480,270 720,200 C960,130 1200,240 1440,180 L1440,320 L0,320 Z"
          fill="url(#waveFillGrad)"
        />

        {/* Primary flowing wave */}
        <motion.path
          d="M0,230 C240,160 480,270 720,200 C960,130 1200,240 1440,180"
          stroke="url(#waveGrad1)"
          strokeWidth="1.75"
          strokeLinecap="round"
          animate={{
            d: [
              'M0,230 C240,160 480,270 720,200 C960,130 1200,240 1440,180',
              'M0,220 C240,180 480,250 720,185 C960,150 1200,225 1440,195',
              'M0,230 C240,160 480,270 720,200 C960,130 1200,240 1440,180',
            ],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Secondary wave - contrasting harmonics */}
        <motion.path
          d="M0,210 C200,270 440,170 680,240 C920,290 1160,180 1440,235"
          stroke="url(#waveGrad2)"
          strokeWidth="1.25"
          strokeLinecap="round"
          animate={{
            d: [
              'M0,210 C200,270 440,170 680,240 C920,290 1160,180 1440,235',
              'M0,225 C200,250 440,190 680,220 C920,270 1160,205 1440,220',
              'M0,210 C200,270 440,170 680,240 C920,290 1160,180 1440,235',
            ],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        />

        {/* Third delicate harmonic crest */}
        <motion.path
          d="M0,255 C300,210 600,285 900,225 C1150,180 1320,260 1440,210"
          stroke="url(#waveGrad3)"
          strokeWidth="1"
          strokeDasharray="4 4"
          animate={{
            d: [
              'M0,255 C300,210 600,285 900,225 C1150,180 1320,260 1440,210',
              'M0,245 C300,230 600,265 900,240 C1150,200 1320,245 1440,225',
              'M0,255 C300,210 600,285 900,225 C1150,180 1320,260 1440,210',
            ],
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
      </svg>
    </div>
  )
}
