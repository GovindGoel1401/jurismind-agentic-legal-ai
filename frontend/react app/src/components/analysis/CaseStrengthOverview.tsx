import InfoCard from '../shared/InfoCard'

interface CaseStrengthOverviewProps {
  caseStrengthScore: number
  supportCount: number
  weaknessCount: number
  contradictionCount: number
  readinessStatus?: string
}

function getStrengthLabel(score: number) {
  if (score >= 0.72) return 'Strong foundation'
  if (score >= 0.48) return 'Developing / partial'
  return 'Weak foundation'
}

export default function CaseStrengthOverview({
  caseStrengthScore,
  supportCount,
  weaknessCount,
  contradictionCount,
  readinessStatus,
}: CaseStrengthOverviewProps) {
  return (
    <section className="panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-legal-text">Case Strength Overview</h2>
          <p className="mt-1 text-sm text-legal-muted">
            Intake-stage view of how well the current case package is supported before verdict work begins.
          </p>
        </div>
        <div className="rounded-full border border-legal-gold/30 bg-legal-card px-4 py-2 text-sm font-semibold text-legal-gold">
          {Math.round(caseStrengthScore * 100)}% · {getStrengthLabel(caseStrengthScore)}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <InfoCard label="Support Points" value={supportCount} />
        <InfoCard label="Weakness Points" value={weaknessCount} />
        <InfoCard label="Contradictions" value={contradictionCount} />
        <InfoCard label="Readiness Status" value={readinessStatus || 'Unknown'} />
      </div>
    </section>
  )
}
