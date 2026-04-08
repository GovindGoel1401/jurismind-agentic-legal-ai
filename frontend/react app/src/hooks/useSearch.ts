import { useState, useCallback } from 'react'

interface UseSearchState {
  query: string
  results: any[]
  loading: boolean
  error: string | null
}

export const useSearch = (initialResults: any[] = []) => {
  const [state, setState] = useState<UseSearchState>({
    query: '',
    results: initialResults,
    loading: false,
    error: null,
  })

  const search = useCallback((newQuery: string) => {
    setState((prev) => ({
      ...prev,
      query: newQuery,
      loading: true,
      error: null,
    }))

    // Simulate API call
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        loading: false,
      }))
    }, 500)
  }, [])

  const reset = useCallback(() => {
    setState({
      query: '',
      results: initialResults,
      loading: false,
      error: null,
    })
  }, [initialResults])

  return { ...state, search, reset }
}
