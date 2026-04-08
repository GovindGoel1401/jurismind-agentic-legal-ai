const LAST_CASE_KEY = 'jurismind-last-case'
const LAST_ANALYSIS_KEY = 'jurismind-last-analysis'
const RECENT_CASES_KEY = 'jurismind-recent-cases'

function safeParse(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function saveLastCase(payload: unknown) {
  localStorage.setItem(LAST_CASE_KEY, JSON.stringify(payload))
}

export function getLastCase<T>() {
  return safeParse(localStorage.getItem(LAST_CASE_KEY)) as T | null
}

export function getLastCaseId() {
  const payload = getLastCase<{ caseId?: string }>()
  return String(payload?.caseId || '').trim()
}

export function saveLastAnalysis(payload: unknown) {
  localStorage.setItem(LAST_ANALYSIS_KEY, JSON.stringify(payload))
}

export function getLastAnalysis<T>() {
  return safeParse(localStorage.getItem(LAST_ANALYSIS_KEY)) as T | null
}

export function saveRecentCases(payload: unknown) {
  localStorage.setItem(RECENT_CASES_KEY, JSON.stringify(payload))
}

export function getRecentCases<T>() {
  return safeParse(localStorage.getItem(RECENT_CASES_KEY)) as T | null
}
