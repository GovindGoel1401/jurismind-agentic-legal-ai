import { CheckCircle2, Clock3, Loader2 } from 'lucide-react'
import { AgentStatus } from './types'

interface AgentCardProps {
  name: string
  status: AgentStatus
  detail?: string
}

const styleMap: Record<AgentStatus, string> = {
  pending: 'border-slate-700 bg-legal-card text-legal-muted',
  running: 'border-legal-blue/45 bg-legal-blue/10 text-blue-300',
  completed: 'border-emerald-500/45 bg-emerald-500/10 text-emerald-300',
}

export default function AgentCard({ name, status, detail }: AgentCardProps) {
  const Icon = status === 'completed' ? CheckCircle2 : status === 'running' ? Loader2 : Clock3

  return (
    <article className={`rounded-lg border px-4 py-3 ${styleMap[status]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-legal-text">{name}</p>
        <Icon size={15} className={status === 'running' ? 'animate-spin' : ''} />
      </div>
      <p className="mt-1 text-xs uppercase tracking-wide">{status}</p>
      {detail ? <p className="mt-2 text-xs leading-relaxed text-inherit/80">{detail}</p> : null}
    </article>
  )
}
