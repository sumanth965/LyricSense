import { useCallback, useEffect, useRef, useState } from 'react'
import type { BackendHealth, ProcessingStage, TranscriptionResponse } from '../types'
import { checkBackendHealth, transcribeAudioFile } from '../lib/api'

export function useLyricsTranscription() {
  const [stage, setStage] = useState<ProcessingStage>('idle')
  const [result, setResult] = useState<TranscriptionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false)
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null)
  const [isCheckingBackend, setIsCheckingBackend] = useState<boolean>(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentRequestIdRef = useRef<number>(0)

  // Probe backend health periodically or on mount
  const probeHealth = useCallback(async () => {
    setIsCheckingBackend(true)
    try {
      const health = await checkBackendHealth()
      setBackendHealth(health)
    } catch {
      setBackendHealth(null)
    } finally {
      setIsCheckingBackend(false)
    }
  }, [])

  useEffect(() => {
    probeHealth()
  }, [probeHealth])

  // Cancel any active transcription
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsTranscribing(false)
    setStage('idle')
  }, [])

  // Clear all transcription state
  const clear = useCallback(() => {
    cancel()
    setResult(null)
    setError(null)
    setStage('idle')
  }, [cancel])

  // Immediately load pre-analyzed transcription data
  const setPreAnalyzedResult = useCallback((data: TranscriptionResponse) => {
    cancel()
    setResult(data)
    setError(null)
    setStage('completed')
  }, [cancel])

  // Transcribe uploaded audio file
  const transcribe = useCallback(
    async (
      file: File,
      language?: string,
      enableVocalSeparation?: boolean,
      enableCloud: boolean = true,
      separateVocals: 'auto' | 'on' | 'off' = 'off',
      lyrics?: string,
    ) => {
      // Abort previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      const requestId = ++currentRequestIdRef.current

      setIsTranscribing(true)
      setError(null)
      setResult(null)
      setStage('uploading')

      const timers: ReturnType<typeof setTimeout>[] = []

      try {
        timers.push(
          setTimeout(() => {
            if (requestId === currentRequestIdRef.current) {
              setStage('preparing')
            }
          }, 300),
        )

        timers.push(
          setTimeout(() => {
            if (requestId === currentRequestIdRef.current) {
              setStage('separating_vocals')
            }
          }, 800),
        )

        timers.push(
          setTimeout(() => {
            if (requestId === currentRequestIdRef.current) {
              setStage('transcribing')
            }
          }, 1800),
        )

        const response = await transcribeAudioFile(
          file,
          language,
          controller.signal,
          enableVocalSeparation,
          enableCloud,
          separateVocals,
          lyrics,
        )
        timers.forEach(clearTimeout)

        // Ignore stale results if another request started or was cleared
        if (requestId !== currentRequestIdRef.current) {
          return
        }

        // Stage: Aligning word-level timestamps
        setStage('aligning')

        // Small micro-delay for smooth UI progression
        await new Promise((r) => setTimeout(r, 250))

        if (requestId !== currentRequestIdRef.current) {
          return
        }

        setStage('rendering')
        setResult(response)

        if (response.warnings && response.warnings.length > 0) {
          setStage('completed_with_warnings')
        } else {
          setStage('completed')
        }
      } catch (err: unknown) {
        timers.forEach(clearTimeout)
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Request was deliberately cancelled
          return
        }
        if (requestId === currentRequestIdRef.current) {
          const message =
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred during transcription.'
          setError(message)
          setStage('failed')
        }
      } finally {
        if (requestId === currentRequestIdRef.current) {
          setIsTranscribing(false)
          abortControllerRef.current = null
        }
      }
    },
    [],
  )

  // In-line word correction callback that keeps word timestamps intact
  const updateWord = useCallback(
    (segmentIndex: number, wordIndex: number, newWordText: string) => {
      setResult((prev) => {
        if (!prev) return prev
        const updatedSegments = prev.segments.map((seg, sIdx) => {
          if (sIdx !== segmentIndex) return seg
          const updatedWords = seg.words.map((w, wIdx) => {
            if (wIdx !== wordIndex) return w
            return {
              ...w,
              word: newWordText,
              low_confidence: false,
            }
          })
          const updatedSegText = updatedWords.map((w) => w.word).join(' ')
          return {
            ...seg,
            text: updatedSegText,
            words: updatedWords,
          }
        })
        const updatedTranscript = updatedSegments.map((s) => s.text).join(' ')
        return {
          ...prev,
          transcript: updatedTranscript,
          segments: updatedSegments,
        }
      })
    },
    [],
  )

  return {
    stage,
    result,
    error,
    isTranscribing,
    backendHealth,
    isCheckingBackend,
    transcribe,
    setPreAnalyzedResult,
    updateWord,
    cancel,
    clear,
    probeHealth,
  }
}
