import { motion } from 'framer-motion'
import type { Theme } from '../types'

interface EdgeWaveDecorationsProps {
  theme: Theme
}

export default function EdgeWaveDecorations({ theme }: EdgeWaveDecorationsProps) {
  const isDark = theme === 'dark'

  // Floating ambient dust / sparkle coordinates
  const leftSparkles = [
    { id: 1, cx: 140, cy: 380, r: 3.5, delay: 0, duration: 6 },
    { id: 2, cx: 210, cy: 460, r: 2.5, delay: 1.2, duration: 7.5 },
    { id: 3, cx: 90, cy: 520, r: 4, delay: 2.1, duration: 5.5 },
    { id: 4, cx: 260, cy: 580, r: 2, delay: 0.7, duration: 8 },
    { id: 5, cx: 180, cy: 670, r: 3, delay: 1.8, duration: 6.8 },
    { id: 6, cx: 120, cy: 760, r: 4.5, delay: 2.7, duration: 7.2 },
  ]

  const rightSparkles = [
    { id: 7, cx: 320, cy: 220, r: 3, delay: 0.5, duration: 6.5 },
    { id: 8, cx: 240, cy: 340, r: 2.5, delay: 1.5, duration: 7 },
    { id: 9, cx: 360, cy: 450, r: 4, delay: 2.3, duration: 5.8 },
    { id: 10, cx: 280, cy: 590, r: 2, delay: 1.1, duration: 8.2 },
    { id: 11, cx: 330, cy: 720, r: 3.5, delay: 2.9, duration: 6.6 },
  ]

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* 1. Warm radial ambient glow in page center */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full blur-3xl opacity-70 transition-opacity duration-700 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(115, 65, 40, 0.25) 0%, rgba(199, 160, 122, 0.08) 50%, transparent 80%)'
            : 'radial-gradient(circle, rgba(226, 206, 177, 0.45) 0%, rgba(253, 252, 232, 0.2) 60%, transparent 80%)',
        }}
      />

      {/* 2. Left Edge Flowing Waveform Ribbons */}
      <svg
        className="absolute left-0 top-0 h-full w-[340px] sm:w-[460px] lg:w-[580px] max-w-[48vw] pointer-events-none"
        viewBox="0 0 500 1000"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main Gold/Cream Ribbon Gradient */}
          <linearGradient id="leftWaveFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DFBA85" stopOpacity={isDark ? '0.22' : '0.4'} />
            <stop offset="35%" stopColor="#E2CEB1" stopOpacity={isDark ? '0.18' : '0.35'} />
            <stop offset="70%" stopColor="#C7A07A" stopOpacity={isDark ? '0.12' : '0.25'} />
            <stop offset="100%" stopColor="#FDFCE8" stopOpacity={isDark ? '0.02' : '0.05'} />
          </linearGradient>

          {/* Secondary Soft Fill */}
          <linearGradient id="leftWaveFill2" x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#E2CEB1" stopOpacity={isDark ? '0.15' : '0.32'} />
            <stop offset="50%" stopColor="#FDFCE8" stopOpacity={isDark ? '0.12' : '0.28'} />
            <stop offset="100%" stopColor="#C7A07A" stopOpacity="0" />
          </linearGradient>

          {/* Glowing Stroke Gradients */}
          <linearGradient id="leftStroke1" x1="0%" y1="30%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#C7A07A" stopOpacity={isDark ? '0.7' : '0.65'} />
            <stop offset="40%" stopColor="#DFBA85" stopOpacity={isDark ? '0.9' : '0.85'} />
            <stop offset="75%" stopColor="#FDFCE8" stopOpacity={isDark ? '0.65' : '0.75'} />
            <stop offset="100%" stopColor="#C7A07A" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="leftStroke2" x1="0%" y1="20%" x2="100%" y2="90%">
            <stop offset="0%" stopColor="#734128" stopOpacity={isDark ? '0.5' : '0.45'} />
            <stop offset="50%" stopColor="#C7A07A" stopOpacity={isDark ? '0.8' : '0.7'} />
            <stop offset="100%" stopColor="#E2CEB1" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="sparkleGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF9E6" stopOpacity="1" />
            <stop offset="45%" stopColor="#DFBA85" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#C7A07A" stopOpacity="0" />
          </radialGradient>

          <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Soft filled ribbon 1 */}
        <motion.path
          d="M-40,240 C140,340 260,520 180,720 C110,880 20,960 -40,1020 Z"
          fill="url(#leftWaveFill)"
          animate={{
            d: [
              'M-40,240 C140,340 260,520 180,720 C110,880 20,960 -40,1020 Z',
              'M-40,250 C160,330 240,540 190,700 C130,860 30,970 -40,1020 Z',
              'M-40,240 C140,340 260,520 180,720 C110,880 20,960 -40,1020 Z',
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Soft filled ribbon 2 (overlapping fold) */}
        <motion.path
          d="M-50,380 C180,440 280,620 160,820 C70,950 -30,1020 -50,1020 Z"
          fill="url(#leftWaveFill2)"
          animate={{
            d: [
              'M-50,380 C180,440 280,620 160,820 C70,950 -30,1020 -50,1020 Z',
              'M-50,370 C160,460 290,600 150,830 C50,960 -20,1020 -50,1020 Z',
              'M-50,380 C180,440 280,620 160,820 C70,950 -30,1020 -50,1020 Z',
            ],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        {/* Primary flowing crest line */}
        <motion.path
          d="M-40,240 C140,340 260,520 180,720 C110,880 20,960 -40,1020"
          stroke="url(#leftStroke1)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          filter="url(#waveGlow)"
        />

        {/* Harmonic parallel wave lines (reminiscent of sound ribbons) */}
        <path
          d="M-40,255 C135,355 250,530 175,725 C105,885 15,965 -40,1025"
          stroke="url(#leftStroke1)"
          strokeWidth="1.2"
          strokeOpacity="0.7"
          fill="none"
        />
        <path
          d="M-40,270 C130,370 240,540 170,730 C100,890 10,970 -40,1030"
          stroke="url(#leftStroke2)"
          strokeWidth="0.9"
          strokeOpacity="0.6"
          strokeDasharray="4 3"
          fill="none"
        />
        <path
          d="M-40,285 C125,385 230,550 165,735 C95,895 5,975 -40,1035"
          stroke="url(#leftStroke1)"
          strokeWidth="0.75"
          strokeOpacity="0.45"
          fill="none"
        />
        <path
          d="M-40,300 C120,400 220,560 160,740 C90,900 0,980 -40,1040"
          stroke="url(#leftStroke2)"
          strokeWidth="0.6"
          strokeOpacity="0.35"
          fill="none"
        />

        {/* Secondary wave crest */}
        <motion.path
          d="M-50,380 C180,440 280,620 160,820 C70,950 -30,1020 -50,1020"
          stroke="url(#leftStroke1)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Delicate floating sparkles along the wave ribbons */}
        {leftSparkles.map((sp) => (
          <motion.circle
            key={sp.id}
            cx={sp.cx}
            cy={sp.cy}
            r={sp.r}
            fill="url(#sparkleGlow)"
            animate={{
              opacity: isDark ? [0.3, 0.9, 0.3] : [0.4, 0.95, 0.4],
              scale: [0.9, 1.25, 0.9],
              y: [-4, 4, -4],
            }}
            transition={{
              duration: sp.duration,
              repeat: Infinity,
              delay: sp.delay,
              ease: 'easeInOut',
            }}
          />
        ))}
      </svg>

      {/* 3. Right Edge Flowing Waveform Ribbons */}
      <svg
        className="absolute right-0 top-0 h-full w-[340px] sm:w-[460px] lg:w-[580px] max-w-[48vw] pointer-events-none"
        viewBox="0 0 500 1000"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="rightWaveFill" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#DFBA85" stopOpacity={isDark ? '0.24' : '0.42'} />
            <stop offset="40%" stopColor="#E2CEB1" stopOpacity={isDark ? '0.18' : '0.34'} />
            <stop offset="80%" stopColor="#C7A07A" stopOpacity={isDark ? '0.1' : '0.2'} />
            <stop offset="100%" stopColor="#FDFCE8" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="rightStroke1" x1="100%" y1="10%" x2="0%" y2="90%">
            <stop offset="0%" stopColor="#DFBA85" stopOpacity={isDark ? '0.85' : '0.8'} />
            <stop offset="45%" stopColor="#FDFCE8" stopOpacity={isDark ? '0.75' : '0.75'} />
            <stop offset="80%" stopColor="#C7A07A" stopOpacity={isDark ? '0.5' : '0.55'} />
            <stop offset="100%" stopColor="#734128" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="rightStroke2" x1="100%" y1="20%" x2="0%" y2="80%">
            <stop offset="0%" stopColor="#C7A07A" stopOpacity={isDark ? '0.75' : '0.65'} />
            <stop offset="55%" stopColor="#DFBA85" stopOpacity={isDark ? '0.6' : '0.55'} />
            <stop offset="100%" stopColor="#E2CEB1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soft filled ribbon on right */}
        <motion.path
          d="M550,60 C380,220 310,480 390,720 C440,860 500,960 550,1020 Z"
          fill="url(#rightWaveFill)"
          animate={{
            d: [
              'M550,60 C380,220 310,480 390,720 C440,860 500,960 550,1020 Z',
              'M550,70 C360,240 330,460 380,740 C430,850 510,950 550,1020 Z',
              'M550,60 C380,220 310,480 390,720 C440,860 500,960 550,1020 Z',
            ],
          }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Primary right flowing crest */}
        <motion.path
          d="M550,60 C380,220 310,480 390,720 C440,860 500,960 550,1020"
          stroke="url(#rightStroke1)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          filter="url(#waveGlow)"
        />

        {/* Harmonic parallel ribbons */}
        <path
          d="M550,80 C385,235 315,490 395,725 C445,865 505,965 550,1025"
          stroke="url(#rightStroke1)"
          strokeWidth="1.2"
          strokeOpacity="0.75"
          fill="none"
        />
        <path
          d="M550,100 C390,250 320,500 400,730 C450,870 510,970 550,1030"
          stroke="url(#rightStroke2)"
          strokeWidth="0.9"
          strokeOpacity="0.6"
          strokeDasharray="4 3"
          fill="none"
        />
        <path
          d="M550,120 C395,265 325,510 405,735 C455,875 515,975 550,1035"
          stroke="url(#rightStroke1)"
          strokeWidth="0.75"
          strokeOpacity="0.45"
          fill="none"
        />
        <path
          d="M550,140 C400,280 330,520 410,740 C460,880 520,980 550,1040"
          stroke="url(#rightStroke2)"
          strokeWidth="0.6"
          strokeOpacity="0.35"
          fill="none"
        />

        {/* Floating sparkles on right edge */}
        {rightSparkles.map((sp) => (
          <motion.circle
            key={sp.id}
            cx={sp.cx}
            cy={sp.cy}
            r={sp.r}
            fill="url(#sparkleGlow)"
            animate={{
              opacity: isDark ? [0.35, 0.9, 0.35] : [0.45, 0.95, 0.45],
              scale: [0.9, 1.25, 0.9],
              y: [-5, 5, -5],
            }}
            transition={{
              duration: sp.duration,
              repeat: Infinity,
              delay: sp.delay,
              ease: 'easeInOut',
            }}
          />
        ))}
      </svg>
    </div>
  )
}
