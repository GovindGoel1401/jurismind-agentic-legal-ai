function toPercent(value, fallback = 0) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.round(n * 100)
}

function inferStrengthLabel(userWin, evidenceScore) {
  const combined = (userWin * 10 + evidenceScore) / 2
  if (combined >= 7.5) return 'Strong'
  if (combined >= 5.5) return 'Moderate'
  return 'Weak'
}

function buildSettlementPosture(graphResult) {
  const settlement = Number(graphResult?.settlement_probability ?? graphResult?.probability?.settlement ?? 0)
  if (settlement >= 0.5) {
    return 'Settlement appears highly viable before full litigation.'
  }
  if (settlement >= 0.3) {
    return 'A negotiated settlement is plausible and worth exploring early.'
  }
  return 'Litigation positioning appears more important than immediate settlement.'
}

function buildRiskNarrative(graphResult) {
  const riskScore = Number(graphResult?.riskScore ?? 0.5)
  if (riskScore >= 0.65) {
    return 'Risk is elevated. More documentation and legal grounding are needed before escalation.'
  }
  if (riskScore >= 0.4) {
    return 'Risk is moderate. The case may proceed, but evidence gaps still matter.'
  }
  return 'Risk is relatively contained based on the current analysis.'
}

export function buildLegalAdvisory(graphResult) {
  const evidenceScore = Number(graphResult?.evidence_score ?? 0)
  const userWin = Number(graphResult?.win_probability_user ?? graphResult?.probability?.userWin ?? 0)
  const missingEvidence = graphResult?.missing_evidence || []
  const contradictions = graphResult?.contradictions || []

  return {
    caseStrength: {
      label: inferStrengthLabel(userWin, evidenceScore),
      userWinProbabilityPercent: toPercent(userWin),
      evidenceScore,
      summary: `Current case outlook is ${inferStrengthLabel(userWin, evidenceScore).toLowerCase()} based on evidence score ${evidenceScore}/10 and estimated user win probability ${toPercent(userWin)}%.`,
    },
    evidenceGuidance: {
      missingEvidence,
      contradictions,
      nextBestAction:
        missingEvidence[0] ||
        contradictions[0] ||
        'Current evidence set does not show a single urgent missing item.',
    },
    settlementPosture: buildSettlementPosture(graphResult),
    litigationRisk: buildRiskNarrative(graphResult),
  }
}
