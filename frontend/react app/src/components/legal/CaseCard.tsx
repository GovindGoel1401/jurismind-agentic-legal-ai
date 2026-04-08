import { CaseItem } from './types'

interface CaseCardProps {
  item: CaseItem
}

export default function CaseCard({ item }: CaseCardProps) {
  return (
    <article className="card-legal">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-legal-text">{item.title}</h3>
        <span className="rounded-full border border-legal-blue/40 bg-legal-blue/10 px-2 py-1 text-xs text-blue-300">
          {item.similarity}% similarity
        </span>
      </div>
      <p className="text-xs text-legal-muted">
        {item.court} | {item.year}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-legal-muted">{item.summary}</p>
      <p className="mt-3 text-sm text-legal-gold">Outcome: {item.outcome}</p>
    </article>
  )
}
