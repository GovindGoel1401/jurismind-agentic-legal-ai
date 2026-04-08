export type AgentStatus = 'pending' | 'running' | 'completed'

export interface AgentItem {
  key: string
  name: string
  status: AgentStatus
}

export interface CaseInputData {
  category: string
  description: string
  jurisdiction: string
  files: File[]
}

export interface VerdictProbabilityItem {
  label: string
  value: number
  color: string
}

export interface SimilarCase {
  title: string
  court: string
  year: number
  similarityScore: number
  factSummary: string
  outcome: string
}

export interface FeedbackPayload {
  rating: number
  accuracy: 'accurate' | 'partially-accurate' | 'incorrect'
  missedSection: string
  additionalComments: string
}
