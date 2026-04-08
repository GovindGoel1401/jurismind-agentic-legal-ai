interface EvidenceAnalysisItem {
  evidence_id: string
  type: string
  file_name: string
  category: string
  reliability_score: number
  reliability_label: string
  reliability_reason: string
  role: string
  usable_for_analysis: boolean
}

interface EvidenceReliabilityPanelProps {
  evidenceAnalysis: EvidenceAnalysisItem[]
}

function toneClass(label: string) {
  if (label === 'high') return 'text-emerald-300'
  if (label === 'medium') return 'text-amber-300'
  return 'text-red-300'
}

export default function EvidenceReliabilityPanel({ evidenceAnalysis }: EvidenceReliabilityPanelProps) {
  return (
    <section className="panel">
      <h2 className="text-xl font-semibold text-legal-text">Evidence Reliability</h2>
      <p className="mt-1 text-sm text-legal-muted">
        File-by-file assessment of how reliable each submitted item appears at the intake stage.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {evidenceAnalysis.map((item) => (
          <article key={item.evidence_id} className="rounded-xl border border-slate-700 bg-legal-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-legal-text">{item.file_name}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-legal-muted">
                  {item.type} · {item.category}
                </p>
              </div>
              <div className={`text-sm font-semibold ${toneClass(item.reliability_label)}`}>
                {Math.round(item.reliability_score * 100)}% {item.reliability_label}
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-legal-muted">
              <p>
                <span className="font-medium text-legal-text">Role:</span> {item.role}
              </p>
              <p>
                <span className="font-medium text-legal-text">Reason:</span> {item.reliability_reason}
              </p>
              <p>
                <span className="font-medium text-legal-text">Usable for analysis:</span>{' '}
                {item.usable_for_analysis ? 'Yes' : 'Limited'}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
