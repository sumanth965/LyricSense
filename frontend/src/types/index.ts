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
  original_word?: string | null
}

export interface SegmentItem {
  start: number
  end: number
  text: string
  original_text?: string | null
  words: WordItem[]
}

export type AlignmentStatus = 'completed' | 'failed' | 'unsupported' | 'unavailable'

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
  warnings?: string[]
}

export interface BackendHealth {
  status: string
  model_size: string
  device: string
  compute_type: string
  model_loaded: boolean
  ffmpeg_available: boolean
  alignment_available: boolean
}

export type ProcessingStage =
  | 'idle'
  | 'uploading'
  | 'preparing'
  | 'transcribing'
  | 'aligning'
  | 'rendering'
  | 'completed'
  | 'completed_with_warnings'
  | 'failed'
