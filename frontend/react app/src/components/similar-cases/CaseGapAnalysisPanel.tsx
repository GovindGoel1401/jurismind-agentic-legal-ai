interface CaseGapAnalysisPanelProps {
  items: string[]
}

export default function CaseGapAnalysisPanel({ items }: CaseGapAnalysisPanelProps) {
  return (
    <section className="panel">
      <h2 className="text-xl font-semibold text-legal-text">Gap Analysis</h2>
      <p className="mt-1 text-sm text-legal-muted">
        What similar cases appear to have that the current case may still be missing.
      </p>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-slate-700 bg-legal-card p-4 text-sm text-legal-muted">
            {item}
          </div>
        ))}
      </div>
    </section>
  )
}
