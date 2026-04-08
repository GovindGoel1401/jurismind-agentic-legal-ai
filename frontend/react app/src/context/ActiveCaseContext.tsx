import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

const ACTIVE_CASE_SESSION_KEY = 'jurismind-active-case-id'
const ACTIVE_CASE_LOCAL_KEY = 'jurismind-active-case-id-persisted'

function readStoredActiveCaseId() {
  if (typeof window === 'undefined') return ''

  return (
    window.sessionStorage.getItem(ACTIVE_CASE_SESSION_KEY) ||
    window.localStorage.getItem(ACTIVE_CASE_LOCAL_KEY) ||
    ''
  ).trim()
}

function writeStoredActiveCaseId(caseId: string) {
  if (typeof window === 'undefined') return

  if (!caseId) {
    window.sessionStorage.removeItem(ACTIVE_CASE_SESSION_KEY)
    window.localStorage.removeItem(ACTIVE_CASE_LOCAL_KEY)
    return
  }

  window.sessionStorage.setItem(ACTIVE_CASE_SESSION_KEY, caseId)
  window.localStorage.setItem(ACTIVE_CASE_LOCAL_KEY, caseId)
}

interface ActiveCaseContextValue {
  activeCaseId: string
  setActiveCaseId: (caseId?: string | null) => void
  clearActiveCaseId: () => void
}

const ActiveCaseContext = createContext<ActiveCaseContextValue | null>(null)

export function ActiveCaseProvider({ children }: PropsWithChildren) {
  const [activeCaseId, setActiveCaseIdState] = useState(readStoredActiveCaseId)

  const setActiveCaseId = useCallback((caseId?: string | null) => {
    const normalizedCaseId = String(caseId || '').trim()
    setActiveCaseIdState(normalizedCaseId)
    writeStoredActiveCaseId(normalizedCaseId)
  }, [])

  const clearActiveCaseId = useCallback(() => {
    setActiveCaseIdState('')
    writeStoredActiveCaseId('')
  }, [])

  const value = useMemo(
    () => ({
      activeCaseId,
      setActiveCaseId,
      clearActiveCaseId,
    }),
    [activeCaseId, clearActiveCaseId, setActiveCaseId],
  )

  return <ActiveCaseContext.Provider value={value}>{children}</ActiveCaseContext.Provider>
}

export function useActiveCase() {
  const context = useContext(ActiveCaseContext)

  if (!context) {
    throw new Error('useActiveCase must be used inside ActiveCaseProvider.')
  }

  return context
}
