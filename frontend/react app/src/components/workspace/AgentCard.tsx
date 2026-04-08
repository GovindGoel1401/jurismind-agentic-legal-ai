import { motion } from 'framer-motion'
import { CheckCircle2, Clock3, Loader2 } from 'lucide-react'
import { AgentStatus } from './types'

interface AgentCardProps {
  name: string
  status: AgentStatus
  index: number
}

const statusStyles: Record<AgentStatus, string> = {
  pending: 'bg-ai-panel border-slate-700 text-slate-400',
  running: 'bg-blue-500/10 border-blue-500/40 text-blue-300',
  completed: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
}

export default function AgentCard({ name, status, index }: AgentCardProps) {
  const Icon = status === 'completed' ? CheckCircle2 : status === 'running' ? Loader2 : Clock3

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`rounded-lg border p-3 ${statusStyles[status]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ai-text">{name}</p>
        <Icon size={16} className={status === 'running' ? 'animate-spin' : ''} />
      </div>
      <p className="mt-1 text-xs uppercase tracking-wide">{status}</p>
    </motion.div>
  )
}
