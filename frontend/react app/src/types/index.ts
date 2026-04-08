export interface Case {
  id: number
  title: string
  year: number
  court: string
  relevance: number
  summary?: string
  citations?: string[]
}

export interface SearchFilters {
  query: string
  year?: number
  court?: string
  minRelevance?: number
}

export interface DashboardMetrics {
  totalCasesAnalyzed: number
  researchHoursSaved: number
  accuracyRate: number
}

export interface ApiResponse<T> {
  data: T
  message?: string
  error?: string
}
