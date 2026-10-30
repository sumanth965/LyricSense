import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioMetadata } from '../types'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function detectAudioFormat(file: File): string {
  const extension = file.name.split('.').pop()?.toUpperCase()
  if (extension && ['MP3', 'WAV', 'M4A', 'AAC', 'OGG', 'FLAC'].includes(extension)) {
    return extension
  }
  if (file.type) {
    if (file.type.includes('mpeg') || file.type.includes('mp3')) return 'MP3'
    if (file.type.includes('wav')) return 'WAV'
    if (file.type.includes('mp4') || file.type.includes('m4a')) return 'M4A'
    if (file.type.includes('aac')) return 'AAC'
    if (file.type.includes('ogg')) return 'OGG'
    if (file.type.includes('flac')) return 'FLAC'
  }
  return extension || 'AUDIO'
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const [metadata, setMetadata] = useState<AudioMetadata | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [volume, setVolume] = useState<number>(0.85)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [playbackRate, setPlaybackRateState] = useState<number>(1.0)
  const [loopRange, setLoopRangeState] = useState<{ start: number; end: number; enabled: boolean } | null>(null)
  const loopRangeRef = useRef<{ start: number; end: number; enabled: boolean } | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Keep ref in sync for event listeners
  useEffect(() => {
    loopRangeRef.current = loopRange
  }, [loopRange])

  // Initialize and clean up HTMLAudioElement
  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const onTimeUpdate = () => {
      const cur = audio.currentTime
      setCurrentTime(cur)

      // Section/Line Looping support for Practice Mode
      const activeLoop = loopRangeRef.current
      if (activeLoop && activeLoop.enabled && activeLoop.end > activeLoop.start) {
        if (cur >= activeLoop.end || cur < activeLoop.start) {
          audio.currentTime = activeLoop.start
          setCurrentTime(activeLoop.start)
        }
      }
    }

    const onSeekEvent = () => {
      setCurrentTime(audio.currentTime)
    }

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
      setIsLoading(false)
    }

    const onEnded = () => {
      const activeLoop = loopRangeRef.current
      if (activeLoop && activeLoop.enabled) {
        audio.currentTime = activeLoop.start
        setCurrentTime(activeLoop.start)
        audio.play().catch(() => setIsPlaying(false))
        return
      }
      setIsPlaying(false)
      // Preserve currentTime so the final words remain synchronized and highlighted at song end
      if (audio.duration && isFinite(audio.duration)) {
        setCurrentTime(audio.duration)
      }
    }

    const onError = () => {
      setIsLoading(false)
      setIsPlaying(false)
      setError('Unable to decode or play this audio file. Please try another track.')
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('seeking', onSeekEvent)
    audio.addEventListener('seeked', onSeekEvent)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('seeking', onSeekEvent)
      audio.removeEventListener('seeked', onSeekEvent)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  // Sync volume, mute & playbackRate changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
      audioRef.current.playbackRate = playbackRate
    }
  }, [volume, isMuted, playbackRate])

  // Unload current audio file
  const unloadAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setMetadata(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setLoopRangeState(null)
    loopRangeRef.current = null
    setError(null)
    setIsLoading(false)
  }, [])


  // Validate & load local audio file
  const loadAudio = useCallback(
    async (file: File) => {
      setError(null)
      setIsLoading(true)

      // 1. File size validation
      if (file.size > MAX_FILE_SIZE) {
        setError(
          `File size exceeds 500 MB limit (${formatFileSize(file.size)}). Please choose a smaller track.`,
        )
        setIsLoading(false)
        return false
      }

      // 2. Format validation check
      const supportedExtensions = /\.(mp3|wav|m4a|aac|ogg|flac)$/i
      const isAudioType = file.type.startsWith('audio/') || file.name.match(supportedExtensions)
      if (!isAudioType) {
        setError('Unsupported audio format. Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC.')
        setIsLoading(false)
        return false
      }

      // 3. Stop previous playback & release previous object URL
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }

      // 4. Create new object URL and test decoding
      const newUrl = URL.createObjectURL(file)
      objectUrlRef.current = newUrl

      try {
        const audio = audioRef.current || new Audio()
        audioRef.current = audio
        audio.src = newUrl
        audio.currentTime = 0

        // Wait for metadata to verify decoding
        const metaDuration = await new Promise<number>((resolve, reject) => {
          const handleLoaded = () => {
            audio.removeEventListener('loadedmetadata', handleLoaded)
            audio.removeEventListener('error', handleError)
            resolve(audio.duration)
          }
          const handleError = () => {
            audio.removeEventListener('loadedmetadata', handleLoaded)
            audio.removeEventListener('error', handleError)
            reject(new Error('Browser decoding failed'))
          }

          if (audio.readyState >= 1 && isFinite(audio.duration)) {
            resolve(audio.duration)
          } else {
            audio.addEventListener('loadedmetadata', handleLoaded)
            audio.addEventListener('error', handleError)
          }
        })

        const format = detectAudioFormat(file)
        const newMeta: AudioMetadata = {
          file,
          name: file.name,
          size: file.size,
          formattedSize: formatFileSize(file.size),
          format,
          duration: metaDuration,
          objectUrl: newUrl,
        }

        setMetadata(newMeta)
        setDuration(metaDuration)
        setCurrentTime(0)
        setIsPlaying(false)
        setIsLoading(false)
        return true
      } catch {
        URL.revokeObjectURL(newUrl)
        objectUrlRef.current = null
        setError('Could not decode audio. The file may be corrupt or encoded in an unsupported codec.')
        setIsLoading(false)
        return false
      }
    },
    [],
  )

  // Playback control functions
  const play = useCallback(async () => {
    if (!audioRef.current || !metadata) return
    try {
      // If playback ended or is at the end, restart from beginning
      if (
        audioRef.current.ended ||
        (duration > 0 && audioRef.current.currentTime >= duration - 0.1)
      ) {
        audioRef.current.currentTime = 0
        setCurrentTime(0)
      }
      await audioRef.current.play()
      setIsPlaying(true)
      setError(null)
    } catch (err: unknown) {
      console.warn('Playback error / autoplay restricted:', err)
      setIsPlaying(false)
      setError('Playback failed or was blocked by browser permissions.')
    }
  }, [metadata, duration])

  const pause = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
    setIsPlaying(false)
  }, [])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const seek = useCallback(
    (time: number) => {
      if (!audioRef.current || !metadata) return
      const targetTime = Math.max(0, Math.min(time, duration))
      audioRef.current.currentTime = targetTime
      setCurrentTime(targetTime)
    },
    [duration, metadata],
  )

  const seekBy = useCallback(
    (seconds: number) => {
      if (!audioRef.current || !metadata) return
      const targetTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration))
      audioRef.current.currentTime = targetTime
      setCurrentTime(targetTime)
    },
    [duration, metadata],
  )

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const changeVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(val, 1))
    setVolume(clamped)
    if (clamped > 0) {
      setIsMuted(false)
    }
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    const clamped = Math.max(0.25, Math.min(rate, 2.0))
    setPlaybackRateState(clamped)
    if (audioRef.current) {
      audioRef.current.playbackRate = clamped
    }
  }, [])

  const setLoopRange = useCallback((start: number, end: number, enabled: boolean = true) => {
    const validStart = Math.max(0, start)
    const validEnd = Math.max(validStart + 0.2, end)
    const newRange = { start: validStart, end: validEnd, enabled }
    setLoopRangeState(newRange)
    loopRangeRef.current = newRange
    if (audioRef.current && enabled) {
      if (audioRef.current.currentTime < validStart || audioRef.current.currentTime >= validEnd) {
        audioRef.current.currentTime = validStart
        setCurrentTime(validStart)
      }
    }
  }, [])

  const clearLoopRange = useCallback(() => {
    setLoopRangeState(null)
    loopRangeRef.current = null
  }, [])

  const loadAudioFromUrl = useCallback(
    async (url: string, filename: string, mimeType = 'audio/mpeg') => {
      try {
        setIsLoading(true)
        setError(null)
        const resp = await fetch(url)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const blob = await resp.blob()
        const file = new File([blob], filename, { type: mimeType })
        return await loadAudio(file)
      } catch (err) {
        console.warn('Failed to load audio from url:', err)
        setError('Failed to fetch audio track from URL. Please check the link or upload a local file.')
        setIsLoading(false)
        return false
      }
    },
    [loadAudio],
  )

  return {
    audioRef,
    metadata,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    setPlaybackRate,
    loopRange,
    setLoopRange,
    clearLoopRange,
    isLoading,
    error,
    loadAudio,
    loadAudioFromUrl,
    unloadAudio,
    play,
    pause,
    togglePlay,
    seek,
    seekBy,
    setVolume: changeVolume,
    toggleMute,
    clearError: () => setError(null),
  }
}
