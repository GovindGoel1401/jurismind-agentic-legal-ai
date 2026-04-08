import { TrendingUp } from 'lucide-react'
import type { VerdictImprovementAction } from '../../types/analysis'

interface VerdictImprovementListProps {
  actions: VerdictImprovementAction[]
}

export default function VerdictImprovementList({ actions }: VerdictImprovementListProps) {
  return (
    <div className="space-y-3">
      {actions.map((item) => (
        <article key={`${item.action}-${item.reason}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-legal-text">{item.action}</h3>
              <p className="mt-2 text-sm leading-relaxed text-legal-muted">{item.reason}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
              <TrendingUp size={12} />
              {item.expected_impact}
            </span>
          </div>
        </article>
      ))}
    </div>
  )
}
