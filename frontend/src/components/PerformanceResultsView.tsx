import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Repeat,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react'
import type { LineScoreItem, ScoreResponse, Theme } from '../types'
import { saveSessionRecord } from '../lib/sessionHistory'

interface PerformanceResultsViewProps {
  score: ScoreResponse
  trackName?: string
  audioDuration?: number
  onPracticeLine: (line: LineScoreItem) => void
  onTryAgain: () => void
  onReturnToStudio: () => void
  theme: Theme
}

export default function PerformanceResultsView({
  score,
  trackName = 'Studio Audio Track',
  audioDuration = 0,
  onPracticeLine,
  onTryAgain,
  onReturnToStudio,
  theme,
}: PerformanceResultsViewProps) {
  const isDark = theme === 'dark'
  const [activeTab, setActiveTab] = useState<'lines' | 'pitch' | 'leaderboard'>('lines')
  const [selectedLine, setSelectedLine] = useState<LineScoreItem | null>(
    score.lines && score.lines.length > 0 ? score.lines[0] : null,
  )

  // Automatically record this session into localStorage history once on mount
  useEffect(() => {
    // Average sub-metrics if available
    let avgPitch = 0
    let avgTiming = 0
    let avgPresence = 0
    if (score.lines && score.lines.length > 0) {
      avgPitch = Math.round(
        score.lines.reduce((acc, l) => acc + l.pitch, 0) / score.lines.length,
      )
      avgTiming = Math.round(
        score.lines.reduce((acc, l) => acc + l.timing, 0) / score.lines.length,
      )
      avgPresence = Math.round(
        score.lines.reduce((acc, l) => acc + l.presence, 0) / score.lines.length,
      )
    }

    saveSessionRecord({
      trackName,
      duration: audioDuration,
      overallScore: Math.round(score.overall_score),
      grade: score.grade || (score.overall_score >= 80 ? 'Great!' : 'Good'),
      pitchScore: avgPitch || Math.round(score.overall_score),
      timingScore: avgTiming || Math.round(score.overall_score),
      presenceScore: avgPresence || Math.round(score.overall_score),
      keyShift: score.key_shift_semitones || 0,
      mode: 'sing-along',
      lines: score.lines,
      warnings: score.warnings,
    })
  }, [score, trackName, audioDuration])

  // Overall grade label
  const gradeLabel =
    score.grade ||
    (score.overall_score >= 85
      ? 'Great!'
      : score.overall_score >= 70
        ? 'Good!'
        : score.overall_score >= 50
          ? 'Fair'
          : 'Keep Practicing')

  // Calculate pitch, timing, presence averages from lines
  const pitchAvg =
    score.lines.length > 0
      ? Math.round(score.lines.reduce((acc, l) => acc + l.pitch, 0) / score.lines.length)
      : Math.round(score.overall_score)

  const timingAvg =
    score.lines.length > 0
      ? Math.round(score.lines.reduce((acc, l) => acc + l.timing, 0) / score.lines.length)
      : Math.round(score.overall_score)

  const presenceAvg =
    score.lines.length > 0
      ? Math.round(score.lines.reduce((acc, l) => acc + l.presence, 0) / score.lines.length)
      : Math.round(score.overall_score)

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Header with Step Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-lion/20 text-lion text-xs font-semibold">
              7
            </span>
            <span
              className="text-xs font-medium tracking-wide uppercase"
              style={{ color: isDark ? '#E2CEB1' : '#734128' }}
            >
              Performance Results
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            See Detailed Feedback & Improvement Tips
          </h1>
        </div>

        <button
          onClick={onReturnToStudio}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dun/30 hover:border-lion text-xs font-medium text-dun hover:text-lion transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Studio</span>
        </button>
      </div>

      {/* 2. Top Summary Card: Overall Score Badge + Metric Bars matching Box 7 */}
      <div
        className="p-6 sm:p-8 rounded-3xl border grid grid-cols-1 md:grid-cols-3 gap-6 items-center shadow-lg"
        style={{
          backgroundColor: isDark ? 'rgba(43, 22, 12, 0.85)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.3)' : 'rgba(226, 206, 177, 0.95)',
        }}
      >
        {/* Overall Score Circle */}
        <div className="flex flex-col items-center justify-center text-center space-y-2 md:border-r border-dun/15 md:pr-6">
          <div className="relative w-32 h-32 rounded-full border-4 border-lion/30 flex flex-col items-center justify-center shadow-inner bg-lion/10">
            <span className="font-serif text-4xl sm:text-5xl font-black text-lion">
              {Math.round(score.overall_score)}
            </span>
            <span className="text-xs font-bold text-emerald-400 mt-0.5">{gradeLabel}</span>
          </div>
          <p className="text-xs text-dun/70 font-medium">Overall Studio Score</p>
        </div>

        {/* Breakdown Metric Bars */}
        <div className="md:col-span-2 space-y-4">
          {/* Pitch Accuracy */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-dun">Pitch Accuracy</span>
              <span className="text-lion font-mono font-bold">{pitchAvg}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-dun/15 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${pitchAvg}%` }}
              />
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-dun">Timing & Latency</span>
              <span className="text-lion font-mono font-bold">{timingAvg}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-dun/15 overflow-hidden">
              <div
                className="h-full bg-lion rounded-full transition-all duration-500"
                style={{ width: `${timingAvg}%` }}
              />
            </div>
          </div>

          {/* Lyric Presence */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-dun">Lyric Presence & Pronunciation</span>
              <span className="text-lion font-mono font-bold">{presenceAvg}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-dun/15 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${presenceAvg}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {score.warnings && score.warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Acoustic Observations:</span>
            {score.warnings.map((w, i) => (
              <p key={i} className="text-amber-200/80">
                • {w}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 3. Detailed Tabs: Line Analysis / Pitch Contour / Leaderboard */}
      <div
        className="p-6 rounded-3xl border space-y-5"
        style={{
          backgroundColor: isDark ? 'rgba(43, 22, 12, 0.75)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(226, 206, 177, 0.9)',
        }}
      >
        <div className="flex border-b border-dun/15 pb-3 gap-2">
          <button
            onClick={() => setActiveTab('lines')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'lines' ? 'bg-lion text-bistre shadow-sm' : 'text-dun/70 hover:text-dun'
            }`}
          >
            Line Analysis
          </button>
          <button
            onClick={() => setActiveTab('pitch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'pitch' ? 'bg-lion text-bistre shadow-sm' : 'text-dun/70 hover:text-dun'
            }`}
          >
            Pitch Contour
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'leaderboard' ? 'bg-lion text-bistre shadow-sm' : 'text-dun/70 hover:text-dun'
            }`}
          >
            Leaderboard
          </button>
        </div>

        {/* Tab 1: Line Analysis matching Box 7 */}
        {activeTab === 'lines' && (
          <div className="space-y-3">
            {score.lines && score.lines.length > 0 ? (
              score.lines.map((line, idx) => {
                const isSelected = selectedLine?.index === line.index
                return (
                  <div
                    key={`line-res-${idx}`}
                    onClick={() => setSelectedLine(line)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-lion bg-lion/10 shadow-sm'
                        : 'border-dun/15 hover:border-dun/30 bg-dun/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-lion/15 text-lion flex items-center justify-center shrink-0 text-xs font-bold font-mono">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-serif text-sm font-semibold truncate"
                          style={{ color: isDark ? '#FDFCE8' : '#200F07' }}
                        >
                          {line.text}
                        </p>
                        <p
                          className="text-[11px] font-mono font-medium"
                          style={{ color: isDark ? 'rgba(226,206,177,0.7)' : '#734128' }}
                        >
                          {line.start.toFixed(1)}s - {line.end.toFixed(1)}s
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-24 sm:w-32 hidden sm:block">
                        <div className="w-full h-2 rounded-full bg-dun/20 overflow-hidden">
                          <div
                            className="h-full bg-lion rounded-full"
                            style={{ width: `${Math.round(line.score)}%` }}
                          />
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-lion w-10 text-right">
                        {Math.round(line.score)}%
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onPracticeLine(line)
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-kobicha hover:bg-kobicha/80 text-ivory border border-lion/30 transition-colors"
                      >
                        Practice
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-dun/70 py-6 text-center">
                Line-by-line scores are computed for full vocal recordings.
              </p>
            )}
          </div>
        )}

        {/* Tab 2: Pitch Contour Visualization */}
        {activeTab === 'pitch' && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-dun/80">
              Visual comparison between the song's original vocal pitch and your recorded pitch contour:
            </p>
            <div className="h-40 rounded-2xl bg-black/40 border border-lion/20 p-4 flex items-center justify-center relative overflow-hidden">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 300 100">
                {/* Reference pitch line */}
                <path
                  d="M 0 50 Q 50 20, 100 40 T 200 60 T 300 30"
                  fill="none"
                  stroke="#C7A07A"
                  strokeWidth="3"
                />
                {/* User recorded line */}
                <path
                  d="M 0 55 Q 50 28, 100 45 T 200 55 T 300 35"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                />
              </svg>
              <div className="absolute top-2 right-3 flex items-center gap-3 text-[10px] font-medium bg-black/70 px-2 py-1 rounded-lg">
                <span className="flex items-center gap-1 text-lion">
                  <span className="w-2 h-0.5 bg-lion inline-block" /> Original Vocal
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-0.5 bg-emerald-400 inline-block" /> Your Singing
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs font-semibold text-dun">
              <span>Studio Leaderboard</span>
              <span className="text-[11px] text-dun/60">Local Session High Scores</span>
            </div>
            <div className="p-4 rounded-2xl bg-dun/5 border border-dun/15 text-center space-y-1">
              <Trophy className="w-8 h-8 text-lion mx-auto mb-2" />
              <p className="text-sm font-semibold text-ivory">Your score has been registered!</p>
              <p className="text-xs text-dun/70">
                Overall: {Math.round(score.overall_score)}% • Grade: {gradeLabel}
              </p>
            </div>
          </div>
        )}

        {/* Footer info: Detected Key Shift */}
        <div className="pt-4 border-t border-dun/15 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-dun/80 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-lion" />
            <span>
              Detected Key Shift:{' '}
              <strong className="text-lion">
                {score.key_shift_semitones > 0 ? `+${score.key_shift_semitones}` : score.key_shift_semitones} semitone
                {Math.abs(score.key_shift_semitones) === 1 ? '' : 's'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {selectedLine && (
              <button
                onClick={() => onPracticeLine(selectedLine)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-kobicha hover:bg-kobicha/80 text-ivory border border-lion/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Practice This Line</span>
              </button>
            )}

            <button
              onClick={onTryAgain}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-lion text-bistre shadow hover:scale-102 active:scale-98 transition-transform cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
