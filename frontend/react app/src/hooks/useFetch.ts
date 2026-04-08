import { useState, useEffect } from 'react'

interface UseFetchState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export const useFetch = <T>(url: string) => {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true }))
        // Mock fetch implementation
        await new Promise((resolve) => setTimeout(resolve, 1000))
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            data: [] as unknown as T,
          }))
        }
      } catch (error) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
          }))
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [url])

  return state
}
