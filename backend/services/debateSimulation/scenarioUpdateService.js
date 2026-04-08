function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function round(value, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeText(value) {
  return String(value || '').trim()
}

function toTextList(value) {
  return asArray(value)
    .map((item) => {
      if (typeof item === 'string') return normalizeText(item)
      if (item && typeof item === 'object') {
        return normalizeText(item.action || item.label || item.text)
      }
      return normalizeText(item)
    })
    .filter(Boolean)
}

function getBaseAdjustment(question, answerEffect) {
  const effect = answerEffect?.impact || 'neutral'

  const issueWeights = {
    missing_document: 0.08,
    contradiction: 0.09,
    weak_evidence: 0.06,
    opposing_attack: 0.05,
    similar_case_gap: 0.05,
    improvement_action: 0.04,
    risk_exposure: 0.05,
    general: 0.04,
  }

  const issueWeight = issueWeights[question?.issue_type] || issueWeights.general
  const direction = effect === 'strengthens' ? 1 : effect === 'weakens' ? -1 : 0.35
  const sideModifier = question?.side === 'opposing' ? 1.05 : 1

  return round(issueWeight * direction * sideModifier + (answerEffect?.score || 0), 3)
}

function buildChangedFactors(question, answerEffect, adjustment) {
  const factors = []

  factors.push(
    adjustment > 0
      ? `The answer improved the linked issue: ${question.linked_issue_or_evidence}.`
      : adjustment < 0
        ? `The answer increased pressure on the linked issue: ${question.linked_issue_or_evidence}.`
        : `The answer only partially moved the linked issue: ${question.linked_issue_or_evidence}.`,
  )

  if (question.issue_type === 'contradiction') {
    factors.push(
      adjustment > 0
        ? 'Contradiction pressure was reduced because the answer adds clarification.'
        : 'Contradiction pressure remains live because the answer does not fully reconcile the issue.',
    )
  }

  if (question.issue_type === 'missing_document') {
    factors.push(
      adjustment > 0
        ? 'Document-support readiness improved because the answer suggests proof can be produced or substituted.'
        : 'Document-support readiness remains weak because the gap is still not clearly closed.',
    )
  }

  if (answerEffect?.impact === 'weakens') {
    factors.push('The answer adds vulnerability under cross-questioning.')
  }

  return factors
}

function updateRiskFlags(previousRiskFlags, question, answerEffect, adjustment) {
  const flags = new Set(toTextList(previousRiskFlags))

  if (question.issue_type === 'contradiction') {
    if (adjustment > 0) {
      flags.delete('Active contradiction pressure')
    } else {
      flags.add('Active contradiction pressure')
    }
  }

  if (question.issue_type === 'missing_document') {
    if (adjustment > 0) {
      flags.delete('Document support gap remains material')
    } else {
      flags.add('Document support gap remains material')
    }
  }

  if (answerEffect?.impact === 'weakens') {
    flags.add('Answer may create adversarial leverage')
  }

  if (answerEffect?.impact === 'strengthens') {
    flags.delete('Answer may create adversarial leverage')
  }

  return Array.from(flags)
}

function updateRecommendations(previousRecommendations, question, adjustment) {
  const recommendations = toTextList(previousRecommendations)

  if (question.issue_type === 'missing_document' && adjustment <= 0) {
    recommendations.unshift(
      `Prioritize obtaining or substituting proof for ${question.linked_issue_or_evidence}.`,
    )
  }

  if (question.issue_type === 'contradiction' && adjustment <= 0) {
    recommendations.unshift('Prepare a cleaner factual clarification before answering this issue again.')
  }

  if (adjustment > 0) {
    recommendations.unshift(`Preserve this answer framing for future questions on ${question.linked_issue_or_evidence}.`)
  }

  return Array.from(new Set(recommendations)).slice(0, 6)
}

function buildDebatePosture(question, adjustment) {
  if (adjustment > 0) {
    return {
      supporting_side: `The supporting side can now answer ${question.linked_issue_or_evidence} with more confidence.`,
      opposing_side: 'The opposing side loses some leverage on this issue and may need to pivot to other weaknesses.',
    }
  }

  if (adjustment < 0) {
    return {
      supporting_side: `The supporting side remains exposed on ${question.linked_issue_or_evidence}.`,
      opposing_side: 'The opposing side gains a stronger line of challenge from this answer.',
    }
  }

  return {
    supporting_side: `The issue ${question.linked_issue_or_evidence} remains only partially stabilized.`,
    opposing_side: 'The opposing side can still test this answer for clarity and support.',
  }
}

export function buildScenarioUpdate({ question, answerEffect, sessionMemory = {}, answerText = '' }) {
  const workingState = sessionMemory?.working_state || {}
  const previousWin = Number(workingState?.win_probability ?? 0.5)
  const previousConfidence = Number(workingState?.confidence_score ?? 0.5)
  const previousCaseStrength = Number(workingState?.case_strength_score ?? 0.5)
  const adjustment = getBaseAdjustment(question, answerEffect)

  const nextWin = clamp(round(previousWin + adjustment * 0.65, 3), 0.05, 0.95)
  const nextConfidence = clamp(round(previousConfidence + adjustment * 0.45, 3), 0.08, 0.96)
  const nextCaseStrength = clamp(round(previousCaseStrength + adjustment * 0.8, 3), 0.08, 0.96)
  const riskFlags = updateRiskFlags(workingState?.risk_flags, question, answerEffect, adjustment)
  const recommendations = updateRecommendations(workingState?.recommendations, question, adjustment)
  const changedFactors = buildChangedFactors(question, answerEffect, adjustment)
  const debatePosture = buildDebatePosture(question, adjustment)

  const scenario_update = {
    scenario_delta_summary:
      adjustment > 0
        ? `This answer improved the scenario by strengthening ${question.linked_issue_or_evidence}.`
        : adjustment < 0
          ? `This answer weakened the scenario by increasing pressure on ${question.linked_issue_or_evidence}.`
          : `This answer only partly changed the scenario for ${question.linked_issue_or_evidence}.`,
    changed_factors: changedFactors,
    updated_risk_flags: riskFlags,
    updated_recommendations: recommendations,
    updated_outcome_shift: {
      previous_win_probability: previousWin,
      new_win_probability: nextWin,
      win_probability_delta: round(nextWin - previousWin, 3),
      previous_confidence_score: previousConfidence,
      new_confidence_score: nextConfidence,
      confidence_delta: round(nextConfidence - previousConfidence, 3),
      previous_case_strength_score: previousCaseStrength,
      new_case_strength_score: nextCaseStrength,
      case_strength_delta: round(nextCaseStrength - previousCaseStrength, 3),
    },
    answer_effect: {
      impact: answerEffect?.impact || 'neutral',
      reasoning: answerEffect?.reasoning || 'The answer produced a limited scenario effect.',
      answer_text: answerText,
    },
    debate_posture: debatePosture,
  }

  return {
    scenario_update,
    next_working_state: {
      ...workingState,
      case_strength_score: nextCaseStrength,
      win_probability: nextWin,
      confidence_score: nextConfidence,
      risk_flags: riskFlags,
      recommendations,
      debate_posture: debatePosture,
    },
  }
}
