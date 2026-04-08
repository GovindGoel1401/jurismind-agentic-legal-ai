import { SimilarCaseResult } from '../../services/caseService'

interface SimilarCaseListProps {
  cases: SimilarCaseResult[]
  selectedCaseId: string | null
  onSelect: (item: SimilarCaseResult) => void
}

export default function SimilarCaseList({ cases, selectedCaseId, onSelect }: SimilarCaseListProps) {
  return (
    <section className="panel">
      <h2 className="text-xl font-semibold text-legal-text">Similar Case List</h2>
      <p className="mt-1 text-sm text-legal-muted">
        Retrieved cases ranked by similarity, with explainable comparison signals.
      </p>

      <div className="mt-4 space-y-4">
        {cases.map((item) => (
          <button
            key={item.case_id}
            type="button"
            onClick={() => onSelect(item)}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              selectedCaseId === item.case_id
                ? 'border-legal-gold bg-legal-card'
                : 'border-slate-700 bg-legal-panel hover:border-legal-gold/40'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-legal-text">{item.title}</h3>
                <p className="mt-1 text-sm text-legal-muted">{item.summary}</p>
              </div>
              <div className="rounded-full border border-legal-gold/30 px-3 py-1 text-sm font-semibold text-legal-gold">
                {Math.round(item.similarity_score * 100)}%
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {item.similarity_reasons.slice(0, 3).map((reason) => (
                <span
                  key={`${item.case_id}-${reason}`}
                  className="rounded-full border border-slate-700 px-2 py-1 text-xs text-legal-muted"
                >
                  {reason}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
