interface ReadinessSummaryCardProps {
  completenessScore: number
  readinessStatus: string
  fileCount: number
  availableCount: number
  missingCount: number
  reliabilityNotes: string[]
}

function getReadinessTone(readinessStatus: string) {
  if (readinessStatus === 'DESCRIPTION_ONLY') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-300'
  }
  if (readinessStatus === 'READY') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  }
  if (readinessStatus === 'PARTIAL') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  }
  return 'border-red-500/25 bg-red-500/10 text-red-300'
}

export default function ReadinessSummaryCard({
  completenessScore,
  readinessStatus,
  fileCount,
  availableCount,
  missingCount,
  reliabilityNotes,
}: ReadinessSummaryCardProps) {
  return (
    <section className="card-legal">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-legal-text">Initial Readiness</h2>
          <p className="mt-1 text-sm text-legal-muted">
            Intake-level view of how complete and usable the current case package appears.
          </p>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getReadinessTone(readinessStatus)}`}
        >
          {readinessStatus.replace('_', ' ')}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-700 bg-legal-panel px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-legal-muted">Completeness</p>
          <p className="mt-1 text-2xl font-semibold text-legal-gold">{completenessScore}%</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-legal-panel px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-legal-muted">Uploaded Files</p>
          <p className="mt-1 text-2xl font-semibold text-legal-text">{fileCount}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-legal-panel px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-legal-muted">Available Docs</p>
          <p className="mt-1 text-2xl font-semibold text-legal-text">{availableCount}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-legal-panel px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-legal-muted">Missing Docs</p>
          <p className="mt-1 text-2xl font-semibold text-legal-text">{missingCount}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-700 bg-legal-panel px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-legal-muted">Initial Reliability Notes</p>
        <div className="mt-2 space-y-2 text-sm text-legal-muted">
          {reliabilityNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      </div>
    </section>
  )
}
