import { AgentStatus } from './types'

interface PipelineNodeProps {
  label: string
  accent?: 'default' | 'highlight'
  status?: AgentStatus
}

const statusClassMap: Record<AgentStatus, string> = {
  pending: 'border-slate-700 bg-legal-card text-legal-text',
  running: 'border-legal-blue/45 bg-legal-blue/10 text-blue-300',
  completed: 'border-emerald-500/45 bg-emerald-500/10 text-emerald-200',
}

export default function PipelineNode({ label, accent = 'default', status = 'pending' }: PipelineNodeProps) {
  return (
    <div
      className={`rounded-md border px-3 py-2 text-center text-sm ${
        accent === 'highlight'
          ? 'border-legal-gold/45 bg-legal-gold/10 text-legal-gold'
          : statusClassMap[status]
      }`}
    >
      {label}
    </div>
  )
}
