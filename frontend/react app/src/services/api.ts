import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Add response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
      return 'The request is taking longer than expected. JurisMind analysis can take up to a few minutes for multi-agent legal reasoning.'
    }

    const requestId = error.response?.data?.requestId
    const message =
      error.response?.data?.error ||
      error.message ||
      fallback

    return requestId ? `${message} (Request ID: ${requestId})` : message
  }

  if (error instanceof Error) return error.message
  return fallback
}

export default apiClient
