import { useEffect, useState } from 'react'
import {
  Award,
  BarChart3,
  Calendar,
  Clock,
  Flame,
  History,
  Music2,
  Trash2,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import type { PracticeSessionRecord, Theme } from '../types'
import { clearSessionHistory, getSessionHistory } from '../lib/sessionHistory'

interface ProgressDashboardViewProps {
  onSelectSession?: (session: PracticeSessionRecord) => void
  onStartNewSession: () => void
  theme: Theme
}

export default function ProgressDashboardView({
  onSelectSession,
  onStartNewSession,
  theme,
}: ProgressDashboardViewProps) {
  const isDark = theme === 'dark'
  const [activeTab, setActiveTab] = useState<'sessions' | 'statistics' | 'achievements'>('sessions')
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([])

  useEffect(() => {
    setSessions(getSessionHistory())
  }, [])

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your local session history?')) {
      clearSessionHistory()
      setSessions([])
    }
  }

  // Calculate statistics
  const totalSessions = sessions.length
  const avgScore =
    totalSessions > 0
      ? Math.round(sessions.reduce((acc, s) => acc + s.overallScore, 0) / totalSessions)
      : 0
  const bestScore = totalSessions > 0 ? Math.max(...sessions.map((s) => s.overallScore)) : 0
  const totalPracticeMinutes =
    totalSessions > 0
      ? Math.round(sessions.reduce((acc, s) => acc + (s.duration || 120), 0) / 60)
      : 0

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Header with Step Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-lion/20 text-lion text-xs font-semibold">
              8
            </span>
            <span
              className="text-xs font-medium tracking-wide uppercase"
              style={{ color: isDark ? '#E2CEB1' : '#734128' }}
            >
              Track Progress
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">My Progress</h1>
          <p
            className="text-sm mt-1"
            style={{ color: isDark ? 'rgba(226,206,177,0.75)' : 'rgba(115,65,40,0.85)' }}
          >
            View history, improvement metrics, and practice performance over time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {totalSessions > 0 && (
            <button
              onClick={handleClear}
              className="p-2 rounded-xl text-dun hover:text-red-400 hover:bg-red-500/10 transition-colors border border-dun/20 cursor-pointer"
              title="Clear Local History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onStartNewSession}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-lion text-bistre shadow-sm hover:shadow transition-transform active:scale-95 cursor-pointer"
          >
            Practice a Song
          </button>
        </div>
      </div>

      {/* 2. Top Tabs: Sessions / Statistics / Achievements matching Box 8 */}
      <div
        className="flex p-1 rounded-2xl border"
        style={{
          backgroundColor: isDark ? 'rgba(45, 23, 12, 0.6)' : 'rgba(253, 252, 232, 0.7)',
          borderColor: isDark ? 'rgba(199, 160, 122, 0.2)' : 'rgba(115, 65, 40, 0.15)',
        }}
      >
        <button
          onClick={() => setActiveTab('sessions')}
          className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: activeTab === 'sessions' ? '#C7A07A' : 'transparent',
            color: activeTab === 'sessions' ? '#391E10' : isDark ? '#E2CEB1' : '#734128',
          }}
        >
          <History className="w-4 h-4" />
          Sessions
        </button>

        <button
          onClick={() => setActiveTab('statistics')}
          className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: activeTab === 'statistics' ? '#C7A07A' : 'transparent',
            color: activeTab === 'statistics' ? '#391E10' : isDark ? '#E2CEB1' : '#734128',
          }}
        >
          <BarChart3 className="w-4 h-4" />
          Statistics
        </button>

        <button
          onClick={() => setActiveTab('achievements')}
          className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: activeTab === 'achievements' ? '#C7A07A' : 'transparent',
            color: activeTab === 'achievements' ? '#391E10' : isDark ? '#E2CEB1' : '#734128',
          }}
        >
          <Trophy className="w-4 h-4" />
          Achievements
        </button>
      </div>

      {/* 3. Tab A: Sessions Content */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          {/* Score Over Time Trendline Chart matching Box 8 */}
          <div
            className="p-6 rounded-3xl border space-y-4"
            style={{
              backgroundColor: isDark ? 'rgba(43, 22, 12, 0.75)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(226, 206, 177, 0.9)',
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-lion" />
                Score Over Time
              </h2>
              <span className="text-xs font-mono text-dun/70">
                Avg: {avgScore}% • Best: {bestScore}%
              </span>
            </div>

            {/* SVG Trendline Graphic */}
            <div className="h-44 w-full relative pt-4 pb-2">
              {totalSessions >= 2 ? (
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 100">
                  {/* Grid lines */}
                  <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(226,206,177,0.15)" strokeDasharray="3 3" />
                  <line x1="0" y1="50" x2="400" y2="50" stroke="rgba(226,206,177,0.15)" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(226,206,177,0.15)" strokeDasharray="3 3" />

                  {/* Polyline of session scores */}
                  <polyline
                    fill="none"
                    stroke="#C7A07A"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={sessions
                      .slice(0, 10)
                      .reverse()
                      .map((s, idx, arr) => {
                        const x = (idx / Math.max(1, arr.length - 1)) * 380 + 10
                        const y = 90 - (s.overallScore / 100) * 80
                        return `${x},${y}`
                      })
                      .join(' ')}
                  />

                  {/* Data points */}
                  {sessions
                    .slice(0, 10)
                    .reverse()
                    .map((s, idx, arr) => {
                      const x = (idx / Math.max(1, arr.length - 1)) * 380 + 10
                      const y = 90 - (s.overallScore / 100) * 80
                      return (
                        <circle
                          key={`pt-${idx}`}
                          cx={x}
                          cy={y}
                          r="4.5"
                          fill="#391E10"
                          stroke="#C7A07A"
                          strokeWidth="2.5"
                        />
                      )
                    })}
                </svg>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-dun/60">
                  Complete at least two sing-along sessions to generate your trendline.
                </div>
              )}
            </div>
          </div>

          {/* Recent Sessions List matching Box 8 */}
          <div
            className="p-6 rounded-3xl border space-y-4"
            style={{
              backgroundColor: isDark ? 'rgba(43, 22, 12, 0.75)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(226, 206, 177, 0.9)',
            }}
          >
            <div className="flex items-center justify-between border-b border-dun/15 pb-3">
              <h2 className="font-serif font-bold text-base">Recent Sessions</h2>
              <span className="text-xs text-dun/70">{totalSessions} recorded</span>
            </div>

            {totalSessions === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Music2 className="w-8 h-8 text-lion/40 mx-auto" />
                <p className="text-sm text-dun/70">No practice sessions recorded yet.</p>
                <p className="text-xs text-dun/50">
                  Use the Sing-Along Studio to evaluate your vocal performance.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => onSelectSession?.(s)}
                    className="p-4 rounded-2xl border border-dun/15 hover:border-lion/40 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                    style={{
                      backgroundColor: isDark ? 'rgba(30, 15, 8, 0.5)' : '#FAF6EE',
                    }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-lion/15 text-lion flex items-center justify-center shrink-0">
                        <Music2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-serif font-semibold text-sm truncate group-hover:text-lion transition-colors">
                          {s.trackName}
                        </h4>
                        <p className="text-[11px] text-dun/60 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{s.dateFormatted}</span>
                          <span>•</span>
                          <span className="capitalize">{s.mode}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-lion/20 text-lion font-mono">
                        {s.overallScore}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Tab B: Statistics */}
      {activeTab === 'statistics' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            className="p-5 rounded-2xl border text-center space-y-1"
            style={{
              backgroundColor: isDark ? 'rgba(43, 22, 12, 0.75)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(226, 206, 177, 0.9)',
            }}
          >
            <Music2 className="w-5 h-5 text-lion mx-auto" />
            <div className="font-serif text-2xl font-bold">{totalSessions}</div>
            <div className="text-[11px] text-dun/70">Total Takes</div>
          </div>

          <div
            className="p-5 rounded-2xl border text-center space-y-1"
            style={{
              backgroundColor: isDark ? 'rgba(43, 22, 12, 0.75)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(226, 206, 177, 0.9)',
            }}
          >
            <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto" />
            <div className="font-serif text-2xl font-bold">{avgScore}%</div>
            <div className="text-[11px] text-dun/70">Average Score</div>
          </div>

          <div
            className="p-5 rounded-2xl border text-center space-y-1"
            style={{
              backgroundColor: isDark ? 'rgba(43, 22, 12, 0.75)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(226, 206, 177, 0.9)',
            }}
          >
            <Trophy className="w-5 h-5 text-lion mx-auto" />
            <div className="font-serif text-2xl font-bold">{bestScore}%</div>
            <div className="text-[11px] text-dun/70">Personal Best</div>
          </div>

          <div
            className="p-5 rounded-2xl border text-center space-y-1"
            style={{
              backgroundColor: isDark ? 'rgba(43, 22, 12, 0.75)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(199, 160, 122, 0.25)' : 'rgba(226, 206, 177, 0.9)',
            }}
          >
            <Clock className="w-5 h-5 text-blue-400 mx-auto" />
            <div className="font-serif text-2xl font-bold">{totalPracticeMinutes}m</div>
            <div className="text-[11px] text-dun/70">Practice Time</div>
          </div>
        </div>
      )}

      {/* 5. Tab C: Achievements */}
      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
              totalSessions >= 1 ? 'border-lion/40 bg-lion/10' : 'opacity-40 border-dun/20'
            }`}
          >
            <Flame className="w-8 h-8 text-amber-500 shrink-0" />
            <div>
              <h4 className="font-serif font-bold text-sm">First Note</h4>
              <p className="text-xs text-dun/70">Record and score your very first song take.</p>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
              bestScore >= 80 ? 'border-lion/40 bg-lion/10' : 'opacity-40 border-dun/20'
            }`}
          >
            <Award className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-serif font-bold text-sm">Vocal Virtuoso</h4>
              <p className="text-xs text-dun/70">Achieve an 80%+ score on any track.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
