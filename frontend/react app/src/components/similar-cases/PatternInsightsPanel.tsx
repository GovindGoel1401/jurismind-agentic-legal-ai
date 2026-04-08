interface PatternInsights {
  outcome_trend: string
  timeline_trend: string
  cost_pattern: string
  confidence_note: string
}

interface PatternInsightsPanelProps {
  insights: PatternInsights | null
}

export default function PatternInsightsPanel({ insights }: PatternInsightsPanelProps) {
  if (!insights) {
    return null
  }

  return (
    <section className="panel">
      <h2 className="text-xl font-semibold text-legal-text">Pattern Insights</h2>
      <p className="mt-1 text-sm text-legal-muted">
        High-level trends inferred from the currently retrieved similar-case set.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-700 bg-legal-card p-4">
          <p className="text-xs uppercase tracking-wide text-legal-gold">Outcome Trend</p>
          <p className="mt-2 text-sm text-legal-muted">{insights.outcome_trend}</p>
        </article>
        <article className="rounded-xl border border-slate-700 bg-legal-card p-4">
          <p className="text-xs uppercase tracking-wide text-legal-gold">Timeline Trend</p>
          <p className="mt-2 text-sm text-legal-muted">{insights.timeline_trend}</p>
        </article>
        <article className="rounded-xl border border-slate-700 bg-legal-card p-4">
          <p className="text-xs uppercase tracking-wide text-legal-gold">Cost / Fine Pattern</p>
          <p className="mt-2 text-sm text-legal-muted">{insights.cost_pattern}</p>
        </article>
        <article className="rounded-xl border border-slate-700 bg-legal-card p-4">
          <p className="text-xs uppercase tracking-wide text-legal-gold">Confidence Note</p>
          <p className="mt-2 text-sm text-legal-muted">{insights.confidence_note}</p>
        </article>
      </div>
    </section>
  )
}
