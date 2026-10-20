interface LyricSenseLogoProps {
  className?: string
  iconSize?: number
  textSize?: string
  theme?: 'dark' | 'light'
}

export function LyricSenseLogoIcon({
  className = 'w-6 h-6',
  color,
}: {
  className?: string
  color?: string
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={color ? { color } : undefined}
    >
      {/* 5 vertical sound bars with rounded dots at top and bottom */}
      {/* Bar 1 (left) */}
      <line
        x1="5"
        y1="11"
        x2="5"
        y2="21"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="5" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="5" cy="23.5" r="1.5" fill="currentColor" />

      {/* Bar 2 */}
      <line
        x1="10.5"
        y1="7.5"
        x2="10.5"
        y2="24.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="10.5" cy="5" r="1.5" fill="currentColor" />
      <circle cx="10.5" cy="27" r="1.5" fill="currentColor" />

      {/* Bar 3 (center - tallest) */}
      <line
        x1="16"
        y1="4.5"
        x2="16"
        y2="27.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="16" cy="2" r="1.6" fill="currentColor" />
      <circle cx="16" cy="30" r="1.6" fill="currentColor" />

      {/* Bar 4 */}
      <line
        x1="21.5"
        y1="7.5"
        x2="21.5"
        y2="24.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="21.5" cy="5" r="1.5" fill="currentColor" />
      <circle cx="21.5" cy="27" r="1.5" fill="currentColor" />

      {/* Bar 5 (right) */}
      <line
        x1="27"
        y1="11"
        x2="27"
        y2="21"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="27" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="27" cy="23.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

export default function LyricSenseLogo({
  className = '',
  iconSize = 26,
  textSize = 'text-xl sm:text-2xl',
  theme = 'light',
}: LyricSenseLogoProps) {
  const isDark = theme === 'dark'

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <div
        className="shrink-0 flex items-center justify-center text-kobicha dark:text-lion transition-colors"
        style={{ width: iconSize, height: iconSize }}
      >
        <LyricSenseLogoIcon className="w-full h-full" />
      </div>
      <span
        className={`font-editorial ${textSize} font-medium tracking-tight`}
        style={{ color: isDark ? '#FDFCE8' : '#734128' }}
      >
        Lyric<span className={isDark ? 'text-lion' : 'text-[#734128]'}>Sense</span>
      </span>
    </div>
  )
}
