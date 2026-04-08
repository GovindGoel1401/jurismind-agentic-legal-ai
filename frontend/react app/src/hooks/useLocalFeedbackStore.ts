import { useCallback, useEffect, useState } from 'react'

export type AccuracyRating = 'accurate' | 'partially-accurate' | 'incorrect' | ''

export interface FeedbackEntry {
  id: string
  caseId: string
  sessionId?: string
  phaseContext: string
  feedbackType: string
  linkedFeature?: string
  starRating?: number
  verdictAccuracy?: AccuracyRating
  summary: string
  submittedAt: string
}

const FEEDBACK_STORAGE_KEY = 'jurismind-feedback-local'

function readFeedbackStore() {
  try {
    const saved = localStorage.getItem(FEEDBACK_STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved) as FeedbackEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useLocalFeedbackStore() {
  const [storedFeedback, setStoredFeedback] = useState<FeedbackEntry[]>([])

  useEffect(() => {
    setStoredFeedback(readFeedbackStore())
  }, [])

  const addEntry = useCallback((entry: FeedbackEntry) => {
    setStoredFeedback((current) => {
      const next = [entry, ...current]
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return {
    storedFeedback,
    addEntry,
  }
}
