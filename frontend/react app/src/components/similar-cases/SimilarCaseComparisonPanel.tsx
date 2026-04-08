import { SimilarCaseResult } from '../../services/caseService'
import { StoredCaseContext } from '../../types/analysis'

interface SimilarCaseComparisonPanelProps {
  selectedCase: SimilarCaseResult | null
  caseContext: StoredCaseContext
}

export default function SimilarCaseComparisonPanel({
  selectedCase,
  caseContext,
}: SimilarCaseComparisonPanelProps) {
  if (!selectedCase) {
    return (
      <section className="panel">
        <h2 className="text-xl font-semibold text-legal-text">Case Comparison</h2>
        <p className="mt-4 text-sm text-legal-muted">
          Select a similar case to compare your current case context against it.
        </p>
      </section>
    )
  }

  return (
    <section className="panel">
      <h2 className="text-xl font-semibold text-legal-text">Case Comparison</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-700 bg-legal-card p-4">
          <p className="text-xs uppercase tracking-wide text-legal-muted">Your Current Case</p>
          <p className="mt-2 text-sm font-semibold text-legal-text">{caseContext.category}</p>
          <p className="mt-2 text-sm text-legal-muted">{caseContext.description}</p>
          <p className="mt-2 text-xs text-legal-muted">Jurisdiction: {caseContext.jurisdiction}</p>
        </article>

        <article className="rounded-xl border border-slate-700 bg-legal-card p-4">
          <p className="text-xs uppercase tracking-wide text-legal-muted">Selected Similar Case</p>
          <p className="mt-2 text-sm font-semibold text-legal-text">{selectedCase.title}</p>
          <p className="mt-2 text-sm text-legal-muted">{selectedCase.summary}</p>
          <p className="mt-2 text-xs text-legal-muted">
            Court: {selectedCase.court || 'Court not available'} · Year: {selectedCase.year || 'N/A'}
          </p>
        </article>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-700 bg-legal-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Matched Factors</p>
          <div className="mt-3 space-y-2 text-sm text-legal-muted">
            {selectedCase.matched_factors.map((factor) => (
              <p key={factor}>{factor}</p>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-700 bg-legal-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Differences</p>
          <div className="mt-3 space-y-2 text-sm text-legal-muted">
            {selectedCase.differences.map((difference) => (
              <p key={difference}>{difference}</p>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
