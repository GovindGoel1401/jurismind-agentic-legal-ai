const DEBATE_SESSION_KEY = 'jurismind-debate-session'

function safeParse(value: string | null) {
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function saveDebateSession(payload: unknown) {
  localStorage.setItem(DEBATE_SESSION_KEY, JSON.stringify(payload))
}

export function getDebateSession<T>() {
  return safeParse(localStorage.getItem(DEBATE_SESSION_KEY)) as T | null
}

export function clearDebateSession() {
  localStorage.removeItem(DEBATE_SESSION_KEY)
}
