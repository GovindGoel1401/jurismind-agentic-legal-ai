interface ChecklistItem {
  type: string
  label: string
  description: string
}

interface OptionalChecklistItem extends ChecklistItem {
  status?: string
}

interface DocumentChecklistPanelProps {
  availableDocuments: ChecklistItem[]
  missingDocuments: ChecklistItem[]
  optionalDocuments: OptionalChecklistItem[]
}

export default function DocumentChecklistPanel({
  availableDocuments,
  missingDocuments,
  optionalDocuments,
}: DocumentChecklistPanelProps) {
  return (
    <section className="card-legal space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-legal-text">Documentation Checklist</h2>
        <p className="mt-1 text-sm text-legal-muted">
          Case-type-aware view of the likely required and supporting records for this intake.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
            Available Documents
          </p>
          <div className="mt-3 space-y-3">
            {availableDocuments.length ? (
              availableDocuments.map((item) => (
                <div key={item.type}>
                  <p className="text-sm font-medium text-legal-text">{item.label}</p>
                  <p className="text-xs text-legal-muted">{item.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-legal-muted">No required documents detected yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            Missing Documents
          </p>
          <div className="mt-3 space-y-3">
            {missingDocuments.length ? (
              missingDocuments.map((item) => (
                <div key={item.type}>
                  <p className="text-sm font-medium text-legal-text">{item.label}</p>
                  <p className="text-xs text-legal-muted">{item.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-legal-muted">No obvious required gaps detected.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-legal-panel p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-legal-gold">
            Optional Support
          </p>
          <div className="mt-3 space-y-3">
            {optionalDocuments.map((item) => (
              <div key={item.type}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-legal-text">{item.label}</p>
                  <span className="text-[11px] uppercase tracking-wide text-legal-muted">
                    {item.status === 'available' ? 'available' : 'optional'}
                  </span>
                </div>
                <p className="text-xs text-legal-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
