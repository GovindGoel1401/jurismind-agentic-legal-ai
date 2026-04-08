interface FindingPoint {
  title: string
  detail: string
}

interface FindingsPanelsProps {
  supportPoints: FindingPoint[]
  weaknessPoints: FindingPoint[]
  contradictionPoints: FindingPoint[]
}

function FindingsColumn({
  title,
  points,
  tone,
}: {
  title: string
  points: FindingPoint[]
  tone: string
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-legal-card p-4">
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>{title}</p>
      <div className="mt-3 space-y-3">
        {points.length ? (
          points.map((point) => (
            <div key={`${title}-${point.title}`}>
              <p className="text-sm font-medium text-legal-text">{point.title}</p>
              <p className="mt-1 text-sm text-legal-muted">{point.detail}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-legal-muted">No major items flagged here yet.</p>
        )}
      </div>
    </div>
  )
}

export default function FindingsPanels({
  supportPoints,
  weaknessPoints,
  contradictionPoints,
}: FindingsPanelsProps) {
  return (
    <section className="panel">
      <h2 className="text-xl font-semibold text-legal-text">Support vs Weakness</h2>
      <p className="mt-1 text-sm text-legal-muted">
        Transparent breakdown of what currently helps the case, what weakens it, and where factual conflict may exist.
      </p>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <FindingsColumn title="Support Points" points={supportPoints} tone="text-emerald-300" />
        <FindingsColumn title="Weakness Points" points={weaknessPoints} tone="text-amber-300" />
        <FindingsColumn title="Contradictions" points={contradictionPoints} tone="text-red-300" />
      </div>
    </section>
  )
}
