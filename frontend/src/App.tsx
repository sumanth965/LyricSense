import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type {
  LineScoreItem,
  NavigationTab,
  PracticeMode,
  ScoreResponse,
  SongCatalogItem,
  Theme,
} from './types'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useLyricsTranscription } from './hooks/useLyricsTranscription'
import AppHeader from './components/AppHeader'
import HeroSection from './components/HeroSection'
import ExploreView from './components/ExploreView'
import AddSongView from './components/AddSongView'
import SmartSetupView from './components/SmartSetupView'
import LyricsStudioView from './components/LyricsStudioView'
import ModeSelectorModal from './components/ModeSelectorModal'
import SingAlongStudioView from './components/SingAlongStudioView'
import PracticeModeView from './components/PracticeModeView'
import ReadModeView from './components/ReadModeView'
import KaraokeModeView from './components/KaraokeModeView'
import PerformanceResultsView from './components/PerformanceResultsView'
import ProgressDashboardView from './components/ProgressDashboardView'
import SettingsModal from './components/SettingsModal'
import HowItWorksDialog from './components/HowItWorksDialog'
import EdgeWaveDecorations from './components/EdgeWaveDecorations'
import { SAMPLE_SONG_LYRICS, SAMPLE_SONG_PREANALYZED } from './lib/songCatalog'

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('lyricsense-theme')
      return saved === 'dark' ? 'dark' : 'light'
    } catch {
      return 'dark'
    }
  })

  // Synchronize theme attribute on document root
  useEffect(() => {
    try {
      localStorage.setItem('lyricsense-theme', theme)
    } catch {}

    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  // Navigation tab state: 'explore' is the initial discovery experience
  const [currentTab, setCurrentTab] = useState<NavigationTab | 'home'>('explore')
  const [showSetupStep, setShowSetupStep] = useState<boolean>(false)
  const [lyricsInput, setLyricsInput] = useState<string>('')

  // Active Modes & Modals
  const [activePracticeMode, setActivePracticeMode] = useState<PracticeMode | null>(null)
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState<boolean>(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false)

  // Scoring results state
  const [latestScoreResult, setLatestScoreResult] = useState<ScoreResponse | null>(null)
  const [showResultsView, setShowResultsView] = useState<boolean>(false)

  // Audio player hook
  const {
    metadata,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    loopRange,
    error: audioError,
    loadAudio,
    loadAudioFromUrl,
    unloadAudio,
    play,
    pause,
    togglePlay,
    seek,
    seekBy,
    setVolume,
    toggleMute,
    setPlaybackRate,
    setLoopRange,
    clearLoopRange,
    clearError: clearAudioError,
  } = useAudioPlayer()

  // Neural transcription & alignment hook
  const {
    stage: transcriptionStage,
    result: transcriptionResult,
    error: transcriptionError,
    isTranscribing,
    backendHealth,
    transcribe,
    setPreAnalyzedResult,
    updateWord,
    cancel: cancelTranscription,
    clear: clearTranscription,
  } = useLyricsTranscription()

  // Track selection from Explore view
  const handleSelectTrackFromExplore = async (track: SongCatalogItem) => {
    clearTranscription()
    if (track.demoAudioUrl) {
      if (track.demoLyrics) {
        setLyricsInput(track.demoLyrics)
      } else {
        setLyricsInput('')
      }
      await loadAudioFromUrl(track.demoAudioUrl, `${track.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.mp3`)

      // If pre-analyzed lyrics data is available, load it immediately into Lyrics Studio!
      if (track.preAnalyzedData) {
        setPreAnalyzedResult(track.preAnalyzedData)
        setShowSetupStep(false)
        setCurrentTab('studio')
      } else {
        setShowSetupStep(true)
        setCurrentTab('add-song')
      }
    } else {
      // Guide user to upload audio file for this song recommendation
      setLyricsInput('')
      setShowSetupStep(false)
      setCurrentTab('add-song')
    }
  }

  // Quick 1-click demo button
  const handleQuickLoadDemo = async () => {
    clearTranscription()
    setLyricsInput(SAMPLE_SONG_LYRICS)
    const success = await loadAudioFromUrl('/demo/sample_song.mp3', 'sample_song.mp3')
    if (success) {
      setPreAnalyzedResult(SAMPLE_SONG_PREANALYZED)
      setShowSetupStep(false)
      setCurrentTab('studio')
    }
  }

  // Handle local file upload
  const handleFileSelected = (file: File) => {
    clearTranscription()
    setLyricsInput('') // Fresh audio upload should run real speech recognition
    loadAudio(file)
    setShowSetupStep(false)
  }

  const handleRemoveTrack = () => {
    clearTranscription()
    unloadAudio()
    setShowSetupStep(false)
    setLyricsInput('')
  }

  // Execute actual analysis
  const handleRunAnalysis = (
    lang?: string,
    vocalSep?: boolean,
    cloud?: boolean,
    sepMode?: 'auto' | 'on' | 'off',
    lyrics?: string,
  ) => {
    if (metadata?.file) {
      transcribe(
        metadata.file,
        lang,
        vocalSep,
        cloud ?? true,
        sepMode || 'off',
        lyrics || lyricsInput || undefined,
      )
    }
  }

  // When transcription finishes successfully, automatically transition into Lyrics Studio!
  useEffect(() => {
    if (transcriptionStage === 'completed' || transcriptionStage === 'completed_with_warnings') {
      setCurrentTab('studio')
      setShowSetupStep(false)
    }
  }, [transcriptionStage])

  // Drill specific line in Practice Mode
  const handlePracticeLineFromResults = (line: LineScoreItem) => {
    setShowResultsView(false)
    setActivePracticeMode('practice')
    setLoopRange(line.start, line.end, true)
    seek(line.start)
  }

  return (
    <div
      className="min-h-screen relative flex flex-col transition-colors duration-300 font-sans"
      style={{
        backgroundColor: theme === 'dark' ? '#391E10' : '#FAF6EE',
        color: theme === 'dark' ? '#FDFCE8' : '#391E10',
      }}
    >
      {/* Decorative ambient audio ribbons */}
      <EdgeWaveDecorations theme={theme} />

      {/* Persistent Application Navigation */}
      <AppHeader
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setShowResultsView(false)
          setActivePracticeMode(null)
          if (tab === 'practice-modes') {
            setIsModeSelectorOpen(true)
          } else {
            setCurrentTab(tab)
          }
        }}
        hasActiveTrack={Boolean(metadata)}
        hasTranscription={Boolean(transcriptionResult)}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        theme={theme}
        activeTrackName={metadata?.name}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 relative z-10 flex flex-col">
        <AnimatePresence mode="wait">
          {showResultsView && latestScoreResult ? (
            /* Box 7: Performance Results Screen */
            <motion.div
              key="results-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <PerformanceResultsView
                score={latestScoreResult}
                trackName={metadata?.name}
                audioDuration={duration}
                onPracticeLine={handlePracticeLineFromResults}
                onTryAgain={() => {
                  setShowResultsView(false)
                  setActivePracticeMode('sing-along')
                }}
                onReturnToStudio={() => {
                  setShowResultsView(false)
                  setCurrentTab('studio')
                }}
                theme={theme}
              />
            </motion.div>
          ) : activePracticeMode === 'practice' ? (
            /* Box 5 -> Practice Mode View */
            <motion.div
              key="practice-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <PracticeModeView
                transcription={transcriptionResult}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                playbackRate={playbackRate}
                loopRange={loopRange}
                onTogglePlay={togglePlay}
                onSeek={seek}
                onSetPlaybackRate={setPlaybackRate}
                onSetLoopRange={setLoopRange}
                onClearLoopRange={clearLoopRange}
                onExitPractice={() => {
                  clearLoopRange()
                  setActivePracticeMode(null)
                  setCurrentTab('studio')
                }}
                theme={theme}
              />
            </motion.div>
          ) : activePracticeMode === 'read' ? (
            /* Box 5 -> Read Mode View (Stage Teleprompter) */
            <motion.div
              key="read-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <ReadModeView
                transcription={transcriptionResult}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                onSeek={seek}
                onExitReadMode={() => {
                  setActivePracticeMode(null)
                  setCurrentTab('studio')
                }}
                theme={theme}
              />
            </motion.div>
          ) : activePracticeMode === 'karaoke' ? (
            /* Box 5 -> Karaoke Mode View */
            <motion.div
              key="karaoke-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <KaraokeModeView
                transcription={transcriptionResult}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                onSeek={seek}
                onExitKaraoke={() => {
                  setActivePracticeMode(null)
                  setCurrentTab('studio')
                }}
                onSwitchToSingAlong={() => {
                  setActivePracticeMode('sing-along')
                }}
                theme={theme}
              />
            </motion.div>
          ) : currentTab === 'home' ? (
            /* Home / Hero Section */
            <motion.div
              key="home-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex items-center"
            >
              <HeroSection
                theme={theme}
                onGetStarted={() => setCurrentTab('explore')}
                onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
              />
            </motion.div>
          ) : currentTab === 'explore' ? (
            /* Box 1: Explore & Song Discovery */
            <motion.div
              key="explore-screen"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <ExploreView
                onSelectTrack={handleSelectTrackFromExplore}
                onGoToUpload={() => {
                  setShowSetupStep(false)
                  setCurrentTab('add-song')
                }}
                onQuickLoadDemo={handleQuickLoadDemo}
                theme={theme}
              />
            </motion.div>
          ) : currentTab === 'add-song' ? (
            /* Box 2 / Box 3: Add a Song & Smart Setup */
            <motion.div
              key="add-song-screen"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {!showSetupStep ? (
                <AddSongView
                  metadata={metadata}
                  lyricsInput={lyricsInput}
                  onLyricsInputChange={setLyricsInput}
                  onFileSelected={handleFileSelected}
                  onRemoveTrack={handleRemoveTrack}
                  onContinueToSetup={() => setShowSetupStep(true)}
                  onOpenLibrary={() => setCurrentTab('explore')}
                  error={audioError}
                  onClearError={clearAudioError}
                  theme={theme}
                />
              ) : (
                <SmartSetupView
                  metadata={metadata}
                  lyricsInput={lyricsInput}
                  isTranscribing={isTranscribing}
                  stage={transcriptionStage}
                  error={transcriptionError}
                  backendHealth={backendHealth}
                  onAnalyze={handleRunAnalysis}
                  onCancel={cancelTranscription}
                  onBackToAddSong={() => setShowSetupStep(false)}
                  theme={theme}
                />
              )}
            </motion.div>
          ) : currentTab === 'studio' ? (
            /* Box 4: Interactive Lyrics Player (Lyrics Studio) */
            <motion.div
              key="studio-screen"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {metadata && !transcriptionResult && !isTranscribing ? (
                /* If audio is loaded but not yet analyzed, show Smart Setup directly */
                <SmartSetupView
                  metadata={metadata}
                  lyricsInput={lyricsInput}
                  isTranscribing={isTranscribing}
                  stage={transcriptionStage}
                  error={transcriptionError}
                  backendHealth={backendHealth}
                  onAnalyze={handleRunAnalysis}
                  onCancel={cancelTranscription}
                  onBackToAddSong={() => setCurrentTab('add-song')}
                  theme={theme}
                />
              ) : (
                <LyricsStudioView
                  metadata={metadata}
                  transcription={transcriptionResult}
                  currentTime={currentTime}
                  duration={duration}
                  isPlaying={isPlaying}
                  volume={volume}
                  isMuted={isMuted}
                  playbackRate={playbackRate}
                  onTogglePlay={togglePlay}
                  onSeek={seek}
                  onSeekBy={seekBy}
                  onSetVolume={setVolume}
                  onToggleMute={toggleMute}
                  onSetPlaybackRate={setPlaybackRate}
                  onUpdateWord={updateWord}
                  onOpenModeSelector={() => setIsModeSelectorOpen(true)}
                  onStartSingAlong={() => setActivePracticeMode('sing-along')}
                  onStartPractice={() => setActivePracticeMode('practice')}
                  theme={theme}
                />
              )}
            </motion.div>
          ) : (
            /* Box 8: Track Progress & Session History */
            <motion.div
              key="progress-screen"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <ProgressDashboardView
                onStartNewSession={() => setCurrentTab('explore')}
                theme={theme}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Dedicated Box 6: Sing-Along Studio View (Live recording & real-time teleprompter) */}
      {activePracticeMode === 'sing-along' && (
        <SingAlongStudioView
          analysisId={transcriptionResult?.analysis_id || 'preview_session'}
          trackName={metadata?.name}
          audioDuration={duration}
          segments={transcriptionResult?.segments || []}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onPlay={play}
          onPause={pause}
          onSeek={seek}
          onFinishScore={(result) => {
            setActivePracticeMode(null)
            setLatestScoreResult(result)
            setShowResultsView(true)
          }}
          onClose={() => {
            setActivePracticeMode(null)
          }}
          theme={theme}
        />
      )}

      {/* Box 5: Choose Your Mode Modal */}
      <ModeSelectorModal
        isOpen={isModeSelectorOpen}
        onClose={() => setIsModeSelectorOpen(false)}
        onSelectMode={(mode) => {
          setActivePracticeMode(mode)
        }}
        theme={theme}
      />

      {/* Diagnostics & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        backendHealth={backendHealth}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* How It Works Dialog */}
      <HowItWorksDialog
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onGetStarted={() => {
          setIsHowItWorksOpen(false)
          setCurrentTab('explore')
        }}
        theme={theme}
      />
    </div>
  )
}
