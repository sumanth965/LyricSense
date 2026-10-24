import type { BackendHealth, TranscriptionResponse } from '../types'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/+$/, '')

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function checkBackendHealth(signal?: AbortSignal): Promise<BackendHealth> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      signal,
    })
    if (!res.ok) {
      throw new ApiError(`Backend health check failed: HTTP ${res.status}`, res.status)
    }
    return (await res.json()) as BackendHealth
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }
    if (err instanceof ApiError) {
      throw err
    }
    throw new ApiError(
      `Cannot connect to local backend at ${API_BASE_URL}. Ensure the backend server is running on port 8000.`,
    )
  }
}

export async function transcribeAudioFile(
  file: File,
  language?: string,
  signal?: AbortSignal,
  enableVocalSeparation?: boolean,
  enableCloud: boolean = true,
  separateVocals: 'auto' | 'on' | 'off' = 'off',
  lyrics?: string,
): Promise<TranscriptionResponse> {
  const formData = new FormData()
  formData.append('file', file)
  if (language && language !== 'auto') {
    formData.append('language', language)
  }
  formData.append('enable_cloud', enableCloud ? 'true' : 'false')
  formData.append('separate_vocals', separateVocals)
  if (enableVocalSeparation !== undefined) {
    formData.append('enable_vocal_separation', enableVocalSeparation ? 'true' : 'false')
  }
  if (lyrics && lyrics.trim()) {
    formData.append('lyrics', lyrics.trim())
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
      signal,
    })

    if (!res.ok) {
      let errorDetail = ''
      try {
        const errorJson = await res.json()
        errorDetail = errorJson.detail || ''
      } catch {
        errorDetail = await res.text().catch(() => '')
      }

      if (res.status === 413) {
        throw new ApiError(
          errorDetail || 'The audio file exceeds the maximum 500 MB upload limit.',
          res.status,
        )
      }
      if (res.status === 400) {
        throw new ApiError(
          errorDetail || 'The uploaded file is not a valid or supported audio file.',
          res.status,
        )
      }
      if (res.status === 500) {
        throw new ApiError(
          errorDetail ||
            'Local transcription model encountered an error during audio processing.',
          res.status,
        )
      }

      throw new ApiError(
        errorDetail || `Transcription failed with HTTP ${res.status}`,
        res.status,
      )
    }

    const data = (await res.json()) as TranscriptionResponse
    return data
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }
    if (err instanceof ApiError) {
      throw err
    }
    console.error('API Error during transcription:', err)
    const rawMsg = err instanceof Error ? err.message : String(err)
    throw new ApiError(
      `Network error connecting to local transcription service at ${API_BASE_URL} (${rawMsg}). Please ensure the Python backend is running and CORS allows the current frontend origin.`,
    )
  }
}
