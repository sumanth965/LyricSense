export type Theme = 'dark' | 'light'

export type ViewState = 'home' | 'workspace'

export interface CarouselSlideData {
  id: number
  title: string
  subtitle: string
  description: string
  category: string
  badge: string
}

export interface AudioMetadata {
  file: File
  name: string
  size: number
  formattedSize: string
  format: string
  duration: number
  objectUrl: string
}

export interface WordItem {
  word: string
  start: number | null
  end: number | null
  probability?: number | null
  low_confidence?: boolean | null
  original_word?: string | null
}

export interface SegmentItem {
  start: number
  end: number
  text: string
  original_text?: string | null
  words: WordItem[]
}

export type AlignmentStatus = 'completed' | 'partial' | 'failed' | 'unsupported' | 'unavailable' | 'native'

export interface TranscriptionResponse {
  status: 'completed' | 'failed'
  filename: string
  language?: string | null
  detected_language_name?: string | null
  duration?: number | null
  transcript: string
  original_transcript?: string | null
  transliterated?: boolean
  segments: SegmentItem[]
  alignment_status: AlignmentStatus
  aligned_words_count?: number | null
  total_words_count?: number | null
  vocal_separation_used?: boolean
  separation_status?: 'completed' | 'failed' | 'unavailable' | 'skipped'
  engine_used?: 'groq' | 'local_whisper' | 'local'
  fallback_used?: boolean
  fallback_reason?: string | null
  warnings?: string[]
  music_detected?: boolean | null
  known_lyrics_used?: boolean
  analysis_id?: string | null
}

export interface BackendHealth {
  status: string
  model_size: string
  device: string
  compute_type: string
  model_loaded: boolean
  ffmpeg_available: boolean
  alignment_available: boolean
  vocal_separation_available?: boolean
  demucs_available?: boolean
  whisperx_available?: boolean
  groq_available?: boolean
  cloud_transcription_enabled?: boolean
  groq_model?: string
  scoring_available?: boolean
}

export interface LineScoreItem {
  index: number
  start: number
  end: number
  text: string
  score: number
  pitch: number
  timing: number
  presence: number
  skipped: boolean
}

export interface ScoreResponse {
  overall_score: number
  grade: string
  lines: LineScoreItem[]
  key_shift_semitones: number
  estimated_offset_ms: number
  warnings: string[]
  reference_contour: (number | null)[]
  user_contour: (number | null)[]
  contour_sample_rate_hz: number
  range_start?: number | null
  range_end?: number | null
}

export interface LeaderboardEntry {
  nickname: string
  score: number
  grade: string
  timestamp: number
  songName: string
  keyShift: number
}

export type ProcessingStage =
  | 'idle'
  | 'uploading'
  | 'preparing'
  | 'separating_vocals'
  | 'transcribing'
  | 'aligning'
  | 'rendering'
  | 'completed'
  | 'completed_with_warnings'
  | 'failed'

export type NavigationTab =
  | 'explore'
  | 'add-song'
  | 'studio'
  | 'practice-modes'
  | 'progress'
  | 'settings'

export type PracticeMode = 'sing-along' | 'practice' | 'read' | 'karaoke'

export interface LoopRange {
  start: number
  end: number
  enabled: boolean
}

export interface PracticeSessionRecord {
  id: string
  timestamp: number
  dateFormatted: string
  trackName: string
  duration: number
  overallScore: number
  grade: string
  pitchScore: number
  timingScore: number
  presenceScore: number
  keyShift: number
  mode: PracticeMode
  lines?: LineScoreItem[]
  warnings?: string[]
}

export interface SongCatalogItem {
  id: string
  title: string
  artist: string
  language: string
  genre?: string
  duration?: string
  isRecommended?: boolean
  isTopPractice?: boolean
  coverColor?: string
  demoAudioUrl?: string
  demoLyrics?: string
}

