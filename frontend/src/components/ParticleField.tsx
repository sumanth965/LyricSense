import { motion } from 'framer-motion'

interface ParticleFieldProps {
  theme: 'dark' | 'light'
}

export default function ParticleField({ theme }: ParticleFieldProps) {
  const isDark = theme === 'dark'

  // Golden shimmer particles situated around the microphone and soundwave arc
  const particles = [
    { id: 1, x: '58%', y: '35%', size: 3, delay: 0, duration: 4.8 },
    { id: 2, x: '64%', y: '28%', size: 4, delay: 1.1, duration: 5.6 },
    { id: 3, x: '72%', y: '22%', size: 2.5, delay: 2.3, duration: 4.2 },
    { id: 4, x: '82%', y: '32%', size: 3.5, delay: 0.7, duration: 5.2 },
    { id: 5, x: '66%', y: '48%', size: 3, delay: 1.8, duration: 6.0 },
    { id: 6, x: '76%', y: '42%', size: 4, delay: 2.9, duration: 4.5 },
    { id: 7, x: '88%', y: '40%', size: 2.5, delay: 0.4, duration: 5.8 },
    { id: 8, x: '52%', y: '52%', size: 3, delay: 1.5, duration: 5.0 },
    { id: 9, x: '60%', y: '62%', size: 4.5, delay: 2.1, duration: 6.2 },
    { id: 10, x: '70%', y: '68%', size: 3, delay: 0.9, duration: 4.6 },
    { id: 11, x: '84%', y: '60%', size: 3.5, delay: 1.6, duration: 5.4 },
    { id: 12, x: '45%', y: '58%', size: 2.5, delay: 2.7, duration: 5.9 },
  ]

  // Floating musical notes
  const notes = [
    { id: 'n1', char: '♪', x: '55%', y: '25%', size: 16, delay: 0.3, duration: 7 },
    { id: 'n2', char: '♫', x: '68%', y: '16%', size: 20, delay: 1.8, duration: 8.5 },
    { id: 'n3', char: '♪', x: '84%', y: '22%', size: 18, delay: 3.2, duration: 6.8 },
    { id: 'n4', char: '♬', x: '50%', y: '44%', size: 15, delay: 2.0, duration: 7.5 },
    { id: 'n5', char: '♪', x: '78%', y: '54%', size: 17, delay: 1.2, duration: 8.0 },
    { id: 'n6', char: '♫', x: '90%', y: '48%', size: 19, delay: 2.8, duration: 7.2 },
  ]

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-15 select-none"
      aria-hidden="true"
    >
      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: '#FDFCE8',
            boxShadow: '0 0 8px #C7A07A, 0 0 16px rgba(199, 160, 122, 0.6)',
          }}
          animate={{
            y: [-12, 12, -12],
            x: [-6, 6, -6],
            opacity: isDark ? [0.2, 0.85, 0.2] : [0.35, 0.95, 0.35],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Floating musical notes */}
      {notes.map((note) => (
        <motion.span
          key={note.id}
          className="absolute font-serif"
          style={{
            left: note.x,
            top: note.y,
            fontSize: `${note.size}px`,
            color: isDark ? '#E2CEB1' : '#734128',
            textShadow: '0 0 12px rgba(199, 160, 122, 0.45)',
          }}
          animate={{
            y: [-16, 8, -16],
            x: [-8, 8, -8],
            rotate: [-8, 8, -8],
            opacity: isDark ? [0.25, 0.75, 0.25] : [0.35, 0.85, 0.35],
          }}
          transition={{
            duration: note.duration,
            repeat: Infinity,
            delay: note.delay,
            ease: 'easeInOut',
          }}
        >
          {note.char}
        </motion.span>
      ))}
    </div>
  )
}
