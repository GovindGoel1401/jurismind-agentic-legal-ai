interface RecommendationItem {
  action: string
  reason: string
  expected_impact: string
}

interface RecommendationPanelProps {
  recommendations: RecommendationItem[]
}

export default function RecommendationPanel({ recommendations }: RecommendationPanelProps) {
  return (
    <section className="panel">
      <h2 className="text-xl font-semibold text-legal-text">Recommendations</h2>
      <p className="mt-1 text-sm text-legal-muted">
        Concrete next steps to strengthen the case package before deeper legal reasoning or verdict stages.
      </p>

      <div className="mt-4 space-y-4">
        {recommendations.map((recommendation, index) => (
          <article key={`${recommendation.action}-${index}`} className="rounded-xl border border-slate-700 bg-legal-card p-4">
            <p className="text-sm font-semibold text-legal-text">{recommendation.action}</p>
            <p className="mt-2 text-sm text-legal-muted">
              <span className="font-medium text-legal-text">Reason:</span> {recommendation.reason}
            </p>
            <p className="mt-2 text-sm text-legal-muted">
              <span className="font-medium text-legal-text">Expected impact:</span> {recommendation.expected_impact}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
