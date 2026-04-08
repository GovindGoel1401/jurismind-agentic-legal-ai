import { SimilarCase } from './types'

interface SimilarCaseCardProps {
  item: SimilarCase
}

export default function SimilarCaseCard({ item }: SimilarCaseCardProps) {
  return (
    <article className="rounded-lg border border-slate-700 bg-ai-bg/70 p-4">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h3 className="font-medium text-ai-text">{item.title}</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
          {item.similarityScore.toFixed(2)}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-2">
        {item.court} · {item.year}
      </p>
      <p className="text-sm text-slate-300 mb-2">{item.factSummary}</p>
      <p className="text-sm text-violet-300">Outcome: {item.outcome}</p>
    </article>
  )
}
