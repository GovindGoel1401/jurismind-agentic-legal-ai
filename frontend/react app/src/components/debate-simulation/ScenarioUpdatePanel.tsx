import type { DebateScenarioUpdate, DebateSessionMemory } from '../../services/caseService'

interface ScenarioUpdatePanelProps {
  scenarioUpdate: DebateScenarioUpdate | null
  sessionMemory: DebateSessionMemory | null
}

function percent(value?: number) {
  if (value == null) return 'Unavailable'
  return `${Math.round(value * 100)}%`
}

function toTextList(items?: Array<unknown>) {
  return (items || [])
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>
        return String(record.action || record.label || record.text || '').trim()
      }
      return String(item || '').trim()
    })
    .filter(Boolean)
}

export default function ScenarioUpdatePanel({
  scenarioUpdate,
  sessionMemory,
}: ScenarioUpdatePanelProps) {
  const workingState = sessionMemory?.working_state
  const changedFactors = toTextList(scenarioUpdate?.changed_factors as Array<unknown> | undefined)
  const updatedRiskFlags = toTextList(scenarioUpdate?.updated_risk_flags as Array<unknown> | undefined)
  const updatedRecommendations = toTextList(scenarioUpdate?.updated_recommendations as Array<unknown> | undefined)

  return (
    <section className="panel">
      <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">Scenario Update Panel</p>
      <h2 className="mt-1 text-xl font-semibold text-legal-text">Live case evolution</h2>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-legal-muted">Working Win Probability</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{percent(workingState?.win_probability)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-legal-muted">Working Confidence</p>
          <p className="mt-2 text-2xl font-semibold text-amber-200">{percent(workingState?.confidence_score)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-legal-muted">Working Case Strength</p>
          <p className="mt-2 text-2xl font-semibold text-sky-300">{percent(workingState?.case_strength_score)}</p>
        </div>
      </div>

      {scenarioUpdate ? (
        <>
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-sm font-medium text-amber-100">{scenarioUpdate.scenario_delta_summary}</p>
            <p className="mt-2 text-sm leading-6 text-amber-50/90">{scenarioUpdate.answer_effect.reasoning}</p>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-legal-muted">What Changed</p>
              <div className="mt-3 space-y-2">
                {changedFactors.map((item) => (
                  <p key={item} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-legal-text">
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-legal-muted">Updated Risk Flags</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {updatedRiskFlags.map((item) => (
                  <span key={item} className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs text-rose-100">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-legal-muted">Updated Recommendations</p>
              <div className="mt-3 space-y-2">
                {updatedRecommendations.map((item) => (
                  <p key={item} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-legal-text">
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-legal-muted">Outcome Shift</p>
              <div className="mt-3 space-y-2 text-sm text-legal-muted">
                <p>Win probability delta: {percent(scenarioUpdate.updated_outcome_shift.win_probability_delta)}</p>
                <p>Confidence delta: {percent(scenarioUpdate.updated_outcome_shift.confidence_delta)}</p>
                <p>Case strength delta: {percent(scenarioUpdate.updated_outcome_shift.case_strength_delta)}</p>
              </div>
              <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">
                <p>{scenarioUpdate.debate_posture.supporting_side}</p>
                <p className="mt-2">{scenarioUpdate.debate_posture.opposing_side}</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-legal-muted">
          Apply a suggested or custom answer to see a scoped scenario update.
        </div>
      )}
    </section>
  )
}
