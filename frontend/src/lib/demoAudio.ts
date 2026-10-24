// Generates a soothing, harmonious 30-second Rhodes/piano chord progression as a real WAV Blob
// to enable immediate instant audio playback without requiring external files.

export interface SyncedWord {
  word: string
  start: number // in seconds
  end: number
  probability?: number
  low_confidence?: boolean
}

export interface SyncedLine {
  id: number
  start: number
  end: number
  text: string
  words: SyncedWord[]
}

export const DEMO_LYRICS: SyncedLine[] = [
  {
    id: 1,
    start: 1.0,
    end: 4.5,
    text: 'Sing freely, we will keep you on track',
    words: [
      { word: 'Sing', start: 1.0, end: 1.6 },
      { word: 'freely,', start: 1.65, end: 2.3 },
      { word: 'we', start: 2.4, end: 2.8 },
      { word: 'will', start: 2.85, end: 3.2 },
      { word: 'keep', start: 3.25, end: 3.7 },
      { word: 'you', start: 3.75, end: 4.0 },
      { word: 'on', start: 4.05, end: 4.2 },
      { word: 'track', start: 4.25, end: 4.5 },
    ],
  },
  {
    id: 2,
    start: 5.0,
    end: 9.2,
    text: 'I can hear the music in the silence',
    words: [
      { word: 'I', start: 5.0, end: 5.4 },
      { word: 'can', start: 5.45, end: 5.8 },
      { word: 'hear', start: 5.85, end: 6.4 },
      { word: 'the', start: 6.45, end: 6.7 },
      { word: 'music', start: 6.75, end: 7.5 },
      { word: 'in', start: 7.55, end: 7.9 },
      { word: 'the', start: 7.95, end: 8.2 },
      { word: 'silence', start: 8.25, end: 9.2 },
    ],
  },
  {
    id: 3,
    start: 9.8,
    end: 14.2,
    text: 'Golden soundwaves rising through the air',
    words: [
      { word: 'Golden', start: 9.8, end: 10.6 },
      { word: 'soundwaves', start: 10.65, end: 11.7, low_confidence: true, probability: 0.32 },
      { word: 'rising', start: 11.75, end: 12.6 },
      { word: 'through', start: 12.65, end: 13.2 },
      { word: 'the', start: 13.25, end: 13.5 },
      { word: 'air', start: 13.55, end: 14.2 },
    ],
  },
  {
    id: 4,
    start: 14.8,
    end: 19.5,
    text: 'Every syllable aligned in perfect time',
    words: [
      { word: 'Every', start: 14.8, end: 15.4 },
      { word: 'syllable', start: 15.45, end: 16.5 },
      { word: 'aligned', start: 16.55, end: 17.5 },
      { word: 'in', start: 17.55, end: 17.8 },
      { word: 'perfect', start: 17.85, end: 18.7 },
      { word: 'time', start: 18.75, end: 19.5 },
    ],
  },
  {
    id: 5,
    start: 20.2,
    end: 25.5,
    text: 'Your music, your words, forever in sync',
    words: [
      { word: 'Your', start: 20.2, end: 20.7 },
      { word: 'music,', start: 20.75, end: 21.6 },
      { word: 'your', start: 21.65, end: 22.1 },
      { word: 'words,', start: 22.15, end: 23.0 },
      { word: 'forever', start: 23.05, end: 24.2 },
      { word: 'in', start: 24.25, end: 24.6 },
      { word: 'sync', start: 24.65, end: 25.5 },
    ],
  },
]

export function createSynthesizedDemoWavUrl(): string {
  const sampleRate = 22050
  const duration = 28 // 28 seconds
  const totalSamples = sampleRate * duration

  // Audio chords: Cmaj7 - Am7 - Fmaj7 - G7
  // Frequencies (Hz)
  const chordProgression = [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0],  // Am7
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [196.0, 246.94, 293.66, 349.23], // G7
  ]

  // Create PCM buffer
  const buffer = new Float32Array(totalSamples)

  const chordDuration = 7 // 7 seconds each
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate
    const chordIndex = Math.floor(t / chordDuration) % chordProgression.length
    const chord = chordProgression[chordIndex]
    const chordLocalTime = t % chordDuration

    // Gentle envelope: attack and decay
    const attack = Math.min(1, chordLocalTime / 0.15)
    const decay = Math.exp(-chordLocalTime / 3.8)
    const env = attack * decay * 0.28

    let sample = 0
    for (const freq of chord) {
      // Warm Rhodes-like tone with soft harmonics
      const s1 = Math.sin(2 * Math.PI * freq * t)
      const s2 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.3
      const s3 = Math.sin(2 * Math.PI * freq * 3 * t) * 0.1
      sample += (s1 + s2 + s3) * env
    }

    // Add subtle warm sub-bass note
    const rootFreq = chord[0] / 2
    sample += Math.sin(2 * Math.PI * rootFreq * t) * env * 0.45

    buffer[i] = Math.max(-1, Math.min(1, sample))
  }

  // Convert Float32Array to 16-bit PCM WAV Blob
  const wavBytes = encodeWav(buffer, sampleRate)
  const blob = new Blob([wavBytes], { type: 'audio/wav' })
  return URL.createObjectURL(blob)
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = samples.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  /* RIFF identifier */
  writeString(view, 0, 'RIFF')
  /* RIFF chunk length */
  view.setUint32(4, 36 + dataSize, true)
  /* RIFF type */
  writeString(view, 8, 'WAVE')
  /* format chunk identifier */
  writeString(view, 12, 'fmt ')
  /* format chunk length */
  view.setUint32(16, 16, true)
  /* sample format (raw) */
  view.setUint16(20, 1, true)
  /* channel count */
  view.setUint16(22, numChannels, true)
  /* sample rate */
  view.setUint32(24, sampleRate, true)
  /* byte rate (sample rate * block align) */
  view.setUint32(28, byteRate, true)
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true)
  /* bits per sample */
  view.setUint16(34, bitsPerSample, true)
  /* data chunk identifier */
  writeString(view, 36, 'data')
  /* data chunk length */
  view.setUint32(40, dataSize, true)

  // Write audio samples as 16-bit PCM
  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return buffer
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
