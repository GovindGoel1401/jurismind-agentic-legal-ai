interface ReasoningTracePanelProps {
  summary: string
}

export default function ReasoningTracePanel({ summary }: ReasoningTracePanelProps) {
  return (
    <section className="panel">
      <h2 className="text-xl font-semibold text-legal-text">Transparency / Reasoning</h2>
      <p className="mt-1 text-sm text-legal-muted">
        Structured explanation of which intake factors influenced the current analysis.
      </p>
      <div className="mt-4 rounded-xl border border-slate-700 bg-legal-card p-4">
        <p className="text-sm leading-relaxed text-legal-muted">{summary}</p>
      </div>
    </section>
  )
}
