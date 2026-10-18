import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioMetadata } from '../types'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

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
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize and clean up HTMLAudioElement
  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
      setIsLoading(false)
    }

    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const onError = () => {
      setIsLoading(false)
      setIsPlaying(false)
      setError('Unable to decode or play this audio file. Please try another track.')
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  // Sync volume & mute changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

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
          `File size exceeds 100 MB limit (${formatFileSize(file.size)}). Please choose a smaller track.`,
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
      await audioRef.current.play()
      setIsPlaying(true)
      setError(null)
    } catch (err: unknown) {
      console.warn('Playback error / autoplay restricted:', err)
      setIsPlaying(false)
      setError('Playback failed or was blocked by browser permissions.')
    }
  }, [metadata])

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

  return {
    audioRef,
    metadata,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoading,
    error,
    loadAudio,
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
