import type { PracticeSessionRecord } from '../types'

const STORAGE_KEY = 'lyricsense_practice_history_v1'

export function getSessionHistory(): PracticeSessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return []
  } catch (err) {
    console.warn('Failed to parse session history from localStorage:', err)
    return []
  }
}

export function saveSessionRecord(session: Omit<PracticeSessionRecord, 'id' | 'timestamp' | 'dateFormatted'> & { timestamp?: number }): PracticeSessionRecord {
  const history = getSessionHistory()
  const timestamp = session.timestamp || Date.now()
  const dateFormatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(timestamp))

  const newRecord: PracticeSessionRecord = {
    ...session,
    id: `session_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    dateFormatted,
  }

  const updated = [newRecord, ...history].slice(0, 50) // keep last 50 sessions
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.warn('Failed to persist session record:', err)
  }
  return newRecord
}

export function clearSessionHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.warn('Failed to clear session history:', err)
  }
}
