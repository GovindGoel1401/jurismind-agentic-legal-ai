export type AgentStatus = 'pending' | 'running' | 'completed'

export interface Agent {
  key: string
  name: string
}

export interface CaseItem {
  id: number | string
  title: string
  court: string
  year: number | string
  similarity: number
  summary: string
  outcome: string
}
