interface MissingDocumentImpactItem {
  type: string
  label: string
  impact_reason: string
  risk_introduced: string
}

interface MissingDocumentImpactPanelProps {
  items: MissingDocumentImpactItem[]
}

export default function MissingDocumentImpactPanel({ items }: MissingDocumentImpactPanelProps) {
  return (
    <section className="panel">
      <h2 className="text-xl font-semibold text-legal-text">Missing Documents Impact</h2>
      <p className="mt-1 text-sm text-legal-muted">
        Why missing records matter and what risk they introduce into the present case package.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {items.length ? (
          items.map((item) => (
            <article key={item.type} className="rounded-xl border border-slate-700 bg-legal-card p-4">
              <h3 className="text-base font-semibold text-legal-text">{item.label}</h3>
              <p className="mt-2 text-sm text-legal-muted">
                <span className="font-medium text-legal-text">Why it matters:</span> {item.impact_reason}
              </p>
              <p className="mt-2 text-sm text-legal-muted">
                <span className="font-medium text-legal-text">Risk introduced:</span> {item.risk_introduced}
              </p>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-slate-700 bg-legal-card p-4 text-sm text-legal-muted">
            No major missing-document impact items are currently flagged.
          </div>
        )}
      </div>
    </section>
  )
}
