import { buildStructuredLegalSynthesis } from './legalSignalSynthesisService.js'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function round(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function normalizeProbability(value, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return clamp(numeric, 0, 1)
}

function normalizeProbabilityTriplet(userWin, opponentWin, settlement) {
  const user = normalizeProbability(userWin, 0.45)
  const opponent = normalizeProbability(opponentWin, 0.3)
  const settle = normalizeProbability(settlement, 0.25)
  const total = user + opponent + settle || 1

  return {
    userWin: round(user / total, 4),
    opponentWin: round(opponent / total, 4),
    settlement: round(settle / total, 4),
  }
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  )
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function inferVerdictLabel(probability) {
  if (probability.userWin >= 0.62) return 'Likely user-favorable outcome'
  if (probability.userWin >= 0.48) return 'User has a competitive but contested case'
  if (probability.settlement >= Math.max(probability.userWin, probability.opponentWin)) {
    return 'Negotiated settlement appears most likely'
  }
  return 'Opponent-favorable outcome risk remains material'
}

function inferDisposition(probability) {
  if (probability.userWin >= 0.65) return 'leans favorable'
  if (probability.userWin >= 0.48) return 'remains closely contested'
  if (probability.settlement >= 0.3) return 'may resolve through settlement'
  return 'leans unfavorable'
}

function summarizeOutcomePattern(similarCaseIntelligence) {
  const trend = similarCaseIntelligence?.pattern_insights?.outcome_trend || ''
  if (!trend || String(trend).toLowerCase().includes('uncertain')) return ''
  return trend
}

function buildJudgeStyleSummary({
  caseType,
  jurisdiction,
  probability,
  caseAssessment,
  similarCaseIntelligence,
}) {
  const supportCount = asArray(caseAssessment?.support_points).length
  const weaknessCount = asArray(caseAssessment?.weakness_points).length
  const contradictionCount = asArray(caseAssessment?.contradiction_points).length
  const disposition = inferDisposition(probability)
  const outcomePattern = summarizeOutcomePattern(similarCaseIntelligence)

  const summary = [
    `For this ${caseType || 'general legal'} matter in ${jurisdiction || 'the stated jurisdiction'}, the case currently ${disposition}.`,
    `The present record shows ${supportCount} support signal(s), ${weaknessCount} weakness signal(s), and ${contradictionCount} contradiction signal(s).`,
    outcomePattern,
  ]

  return summary.filter(Boolean).join(' ')
}

function computeEvidenceMomentum(caseAssessment) {
  const supportCount = asArray(caseAssessment?.support_points).length
  const weaknessCount = asArray(caseAssessment?.weakness_points).length
  const contradictionCount = asArray(caseAssessment?.contradiction_points).length
  const missingCount = asArray(caseAssessment?.missing_document_impact).length

  const raw =
    0.5 +
    supportCount * 0.035 -
    weaknessCount * 0.03 -
    contradictionCount * 0.04 -
    missingCount * 0.03

  return clamp(round(raw, 3), 0.15, 0.85)
}

function computeWinProbability(probability, caseAssessment) {
  const caseStrength = normalizeProbability(caseAssessment?.case_strength_score, 0.5)
  const evidenceMomentum = computeEvidenceMomentum(caseAssessment)
  const contradictionPenalty = Math.min(
    0.08,
    asArray(caseAssessment?.contradiction_points).length * 0.025,
  )

  return clamp(
    round(probability.userWin * 0.74 + caseStrength * 0.18 + evidenceMomentum * 0.08 - contradictionPenalty, 3),
    0.05,
    0.95,
  )
}

function computeConfidenceScore(caseAssessment, similarCaseIntelligence, probability) {
  const caseStrength = normalizeProbability(caseAssessment?.case_strength_score, 0.45)
  const similarCases = asArray(similarCaseIntelligence?.similar_cases)
  const averageSimilarity =
    similarCases.length > 0
      ? similarCases.reduce((sum, item) => sum + normalizeProbability(item.similarity_score, 0), 0) /
        similarCases.length
      : 0
  const contradictionPenalty = Math.min(
    0.18,
    asArray(caseAssessment?.contradiction_points).length * 0.05,
  )
  const margin = Math.max(probability.userWin, probability.opponentWin, probability.settlement)

  return clamp(
    round(caseStrength * 0.45 + averageSimilarity * 0.2 + margin * 0.25 + (similarCases.length >= 3 ? 0.08 : 0.02) - contradictionPenalty, 3),
    0.12,
    0.96,
  )
}

function buildMetric(value, label, certainty, reason) {
  return {
    value,
    label,
    certainty,
    reason,
  }
}

function inferBailApplicability(caseInput, graphResult) {
  const source = `${caseInput?.category || ''} ${caseInput?.description || ''} ${graphResult?.case_type || ''}`.toLowerCase()
  return ['bail', 'custody', 'arrest', 'criminal', 'fir'].some((keyword) => source.includes(keyword))
}

function pickFirstAvailable(items, selector, fallback = '') {
  for (const item of items || []) {
    const value = selector(item)
    if (value && !String(value).toLowerCase().includes('uncertain')) {
      return value
    }
  }
  return fallback
}

function deriveOutcomeIndicators({
  caseInput,
  graphResult,
  caseAssessment,
  similarCaseIntelligence,
  winProbability,
  confidenceScore,
}) {
  const similarCases = asArray(similarCaseIntelligence?.similar_cases)
  const contradictionCount = asArray(caseAssessment?.contradiction_points).length
  const closeCase = Math.abs(winProbability - normalizeProbability(graphResult?.probability?.opponentWin, 0.3)) < 0.14

  const timelineValue = pickFirstAvailable(
    similarCases,
    (item) => item?.outcome_summary?.timeline_range,
    '',
  )
  const costValue = pickFirstAvailable(
    similarCases,
    (item) => item?.outcome_summary?.cost_pattern,
    '',
  )

  const nextStageBase = clamp(
    round((1 - winProbability) * 0.32 + (closeCase ? 0.18 : 0.08) + contradictionCount * 0.03, 3),
    0.08,
    0.72,
  )

  const bailApplicable = inferBailApplicability(caseInput, graphResult)
  const bailProbability = bailApplicable
    ? buildMetric(
        clamp(round(winProbability * 0.55 + normalizeProbability(caseAssessment?.case_strength_score, 0.5) * 0.25, 3), 0.1, 0.9),
        'Derived from current case strength and judge-stage advantage signals.',
        confidenceScore >= 0.55 ? 'supported' : 'uncertain',
        'Bail probability is only estimated because no dedicated criminal-process dataset is available in this pipeline.',
      )
    : buildMetric(
        null,
        'Not applicable for the current case profile.',
        'not_applicable',
        'Bail metrics are only surfaced for criminal or custody-related matters.',
      )

  const expectedDuration = timelineValue
    ? buildMetric(
        timelineValue,
        'Observed from retrieved similar-case metadata.',
        similarCases.length >= 2 ? 'supported' : 'uncertain',
        similarCaseIntelligence?.pattern_insights?.confidence_note ||
          'Timeline estimate is based on limited similar-case metadata.',
      )
    : buildMetric(
        null,
        'Insufficient timeline signal',
        'uncertain',
        'The retrieved similar cases do not contain enough timeline metadata to estimate duration responsibly.',
      )

  const costEstimate = costValue
    ? buildMetric(
        costValue,
        'Observed from retrieved similar-case metadata.',
        similarCases.length >= 2 ? 'supported' : 'uncertain',
        similarCaseIntelligence?.pattern_insights?.confidence_note ||
          'Cost estimate is based on limited similar-case metadata.',
      )
    : buildMetric(
        null,
        'Insufficient cost signal',
        'uncertain',
        'Comparable case metadata does not provide enough cost or fine information.',
      )

  const nextStageProbability = buildMetric(
    nextStageBase,
    closeCase
      ? 'The matter looks contestable enough that appeal or escalation risk remains visible.'
      : 'Derived from opposition strength, contradiction load, and case closeness.',
    confidenceScore >= 0.5 ? 'supported' : 'uncertain',
    'This is a heuristic escalation signal, not a guarantee that an appeal or escalation will occur.',
  )

  return {
    bail_probability: bailProbability,
    expected_duration: expectedDuration,
    cost_estimate: costEstimate,
    fine_or_cost_estimate: costEstimate,
    next_stage_probability: nextStageProbability,
  }
}

function inferImpactDelta(action, missingCount, contradictionCount) {
  const normalized = String(action || '').toLowerCase()

  if (normalized.includes('add ') || normalized.includes('collect ') || normalized.includes('agreement')) {
    return clamp(round(0.08 + missingCount * 0.025, 3), 0.08, 0.22)
  }
  if (normalized.includes('clarify') || normalized.includes('inconsistency')) {
    return clamp(round(0.05 + contradictionCount * 0.02, 3), 0.05, 0.14)
  }
  if (normalized.includes('strengthen') || normalized.includes('payment') || normalized.includes('financial')) {
    return clamp(round(0.05 + missingCount * 0.015, 3), 0.05, 0.16)
  }

  return 0.04
}

function buildImprovementActions(caseAssessment, similarCaseIntelligence) {
  const recommendations = asArray(caseAssessment?.recommendations)
  const gapAnalysis = asArray(similarCaseIntelligence?.case_gap_analysis)
  const missingCount = asArray(caseAssessment?.missing_document_impact).length
  const contradictionCount = asArray(caseAssessment?.contradiction_points).length

  const fromRecommendations = recommendations.slice(0, 4).map((item) => {
    const delta = inferImpactDelta(item.action, missingCount, contradictionCount)
    return {
      action: item.action,
      reason: item.reason,
      expected_impact: `${Math.round(delta * 100)}% relative improvement potential if this weakness is resolved`,
      win_probability_delta: delta,
    }
  })

  const fromGaps = gapAnalysis.slice(0, 2).map((item, index) => {
    const delta = clamp(round(0.05 + index * 0.02, 3), 0.05, 0.12)
    return {
      action: index === 0 ? 'Close a similar-case evidence gap' : 'Add corroborating support seen in comparable cases',
      reason: item,
      expected_impact: `${Math.round(delta * 100)}% relative improvement potential based on similar-case comparison`,
      win_probability_delta: delta,
    }
  })

  const actions = [...fromRecommendations, ...fromGaps]
  if (actions.length > 0) {
    return actions.slice(0, 6)
  }

  return [
    {
      action: 'Preserve the current record and add corroboration where feasible',
      reason: 'No dominant structural weakness stands out in the current intake analysis.',
      expected_impact: 'Low-to-moderate improvement potential through incremental strengthening',
      win_probability_delta: 0.04,
    },
  ]
}

function buildEvidenceLayer(caseAssessment, documentIntelligence) {
  const evidenceAnalysis = asArray(caseAssessment?.evidence_analysis)
  const supportPoints = asArray(caseAssessment?.support_points)
  const weaknessPoints = asArray(caseAssessment?.weakness_points)
  const missingDocuments = asArray(documentIntelligence?.missing_documents)

  return {
    layer_name: 'Evidence Layer',
    summary:
      caseAssessment?.reasoning_trace_summary ||
      'Evidence quality was assessed from document coverage, reliability, and contradiction checks.',
    reasoning_points: uniqueStrings([
      supportPoints[0]?.detail,
      weaknessPoints[0]?.detail,
      evidenceAnalysis.find((item) => item.reliability_label === 'high')?.reliability_reason,
    ]),
    contributing_factors: uniqueStrings([
      `${evidenceAnalysis.filter((item) => item.role === 'support').length} supporting evidence item(s)`,
      `${evidenceAnalysis.filter((item) => item.reliability_label === 'low').length} low-reliability item(s)`,
      missingDocuments.length ? `${missingDocuments.length} likely required document(s) still missing` : '',
    ]),
  }
}

function buildLegalApplicabilityLayer(graphResult) {
  const laws = uniqueStrings([
    ...asArray(graphResult?.relevant_laws),
    ...asArray(graphResult?.relevant_sections),
  ])
  const precedents = asArray(graphResult?.legalResearch?.precedents)

  return {
    layer_name: 'Legal Applicability Layer',
    summary:
      laws.length > 0
        ? `The current fact pattern was matched against ${laws.length} legal signal(s) from the research layer.`
        : 'Legal applicability remains limited because explicit law or section matches were sparse.',
    reasoning_points: uniqueStrings([
      laws[0] ? `Primary legal signal: ${laws[0]}` : '',
      laws[1] ? `Additional legal signal: ${laws[1]}` : '',
      precedents[0]?.summary || precedents[0]?.title || '',
    ]),
    contributing_factors: uniqueStrings([
      laws[0],
      laws[1],
      graphResult?.legalResearchMeta?.strategy ? `Research strategy: ${graphResult.legalResearchMeta.strategy}` : '',
    ]),
  }
}

function buildRiskLayer(caseAssessment, graphResult) {
  const weaknessPoints = asArray(caseAssessment?.weakness_points)
  const contradictionPoints = asArray(caseAssessment?.contradiction_points)
  const opponentProbability = normalizeProbability(graphResult?.probability?.opponentWin, 0.3)
  const settlementProbability = normalizeProbability(graphResult?.probability?.settlement, 0.2)

  return {
    layer_name: 'Risk Layer',
    summary:
      contradictionPoints.length || weaknessPoints.length
        ? 'Risk is driven by evidence gaps, contradiction load, and the opponent-favorable portion of the judge-stage outcome.'
        : 'No dominant structural risk signal stands out, though litigation uncertainty still remains.',
    reasoning_points: uniqueStrings([
      contradictionPoints[0]?.detail,
      weaknessPoints[0]?.detail,
      `Opponent-favorable probability from the judge stage is ${Math.round(opponentProbability * 100)}%.`,
    ]),
    contributing_factors: uniqueStrings([
      contradictionPoints.length ? `${contradictionPoints.length} contradiction signal(s)` : '',
      weaknessPoints.length ? `${weaknessPoints.length} weakness signal(s)` : '',
      settlementProbability >= 0.25
        ? `Settlement remains a live branch at ${Math.round(settlementProbability * 100)}%`
        : '',
    ]),
  }
}

function buildStrategyLayer(improvementActions) {
  return {
    layer_name: 'Strategy Layer',
    summary: 'The strategy layer identifies the next actions most likely to improve case quality before any formal step is taken.',
    reasoning_points: uniqueStrings(improvementActions.slice(0, 3).map((item) => `${item.action}: ${item.reason}`)),
    contributing_factors: uniqueStrings(
      improvementActions.slice(0, 3).map((item) => item.expected_impact),
    ),
  }
}

function buildOutcomeProjectionLayer({
  winProbability,
  lossProbability,
  confidenceScore,
  outcomeIndicators,
  similarCaseIntelligence,
}) {
  return {
    layer_name: 'Outcome Projection Layer',
    summary:
      'Outcome projection blends judge-stage probabilities with intake strength and available similar-case metadata to show the most likely path forward.',
    reasoning_points: uniqueStrings([
      `Estimated win probability: ${Math.round(winProbability * 100)}%.`,
      `Estimated loss probability: ${Math.round(lossProbability * 100)}%.`,
      outcomeIndicators.expected_duration?.value
        ? `Observed duration signal: ${outcomeIndicators.expected_duration.value}.`
        : outcomeIndicators.expected_duration?.reason,
      similarCaseIntelligence?.pattern_insights?.confidence_note,
    ]),
    contributing_factors: uniqueStrings([
      `Confidence score: ${Math.round(confidenceScore * 100)}%`,
      outcomeIndicators.cost_estimate?.value
        ? `Cost pattern signal: ${outcomeIndicators.cost_estimate.value}`
        : '',
      outcomeIndicators.next_stage_probability?.value != null
        ? `Next-stage probability: ${Math.round(
            Number(outcomeIndicators.next_stage_probability.value) * 100,
          )}%`
        : '',
    ]),
  }
}

function buildReasoningPanel(verdictSummary, verdictLayers, confidenceScore) {
  return {
    summary: verdictSummary,
    key_points: verdictLayers.flatMap((layer) => layer.reasoning_points).slice(0, 6),
    uncertainty_note:
      confidenceScore >= 0.7
        ? 'The verdict is relatively stable, but it still depends on the accuracy and completeness of the submitted material.'
        : 'This verdict should be read cautiously because evidence quality, comparable-case coverage, or contradiction load materially reduces certainty.',
  }
}

function buildSectionSummary(items = [], fallback = 'Not enough structured evidence to summarize.') {
  const texts = items
    .map((item) => item?.detail || item?.summary || item?.title || '')
    .filter(Boolean)
  return texts.length ? texts.slice(0, 3).join(' ') : fallback
}

function buildLayerSummary(name, positives = [], negatives = [], unresolved = [], basis = '') {
  return {
    layer_name: name,
    summary: buildSectionSummary(positives.concat(negatives), `${name} could not be strongly populated from the current record.`),
    positive_signals: positives,
    negative_signals: negatives,
    unresolved_points: unresolved,
    effect_on_outcome:
      positives.length && !negatives.length
        ? 'supports outcome confidence'
        : negatives.length && !positives.length
          ? 'reduces outcome confidence'
          : 'mixed effect on outcome',
    source_basis: basis,
    reasoning_points: uniqueStrings([
      ...positives.map((item) => item.detail || item.title),
      ...negatives.map((item) => item.detail || item.title),
      ...unresolved,
    ]),
    contributing_factors: uniqueStrings([
      ...positives.map((item) => item.source_basis || basis),
      ...negatives.map((item) => item.source_basis || basis),
    ]),
  }
}

function buildNarrativeVerdictSummary({ caseType, jurisdiction, probability, synthesis, verdictLabel }) {
  const posture = inferDisposition(probability)
  const supportCount = synthesis?.top_supporting_facts?.length || 0
  const weaknessCount = synthesis?.top_weaknesses?.length || 0
  const humanFactorNote = synthesis?.human_factors?.settlement_likelihood_effect || ''
  const legalFit = synthesis?.rule_findings?.length
    ? `Legal applicability is anchored by ${synthesis.rule_findings.length} retrieved rule signal(s).`
    : 'Legal applicability remains limited because the retrieved rule layer is thin.'

  return [
    `For this ${caseType || 'general legal'} matter in ${jurisdiction || 'the stated jurisdiction'}, the posture currently ${posture}.`,
    `The record shows ${supportCount} support signal(s) against ${weaknessCount} material weakness signal(s).`,
    legalFit,
    humanFactorNote,
    `Overall verdict posture: ${verdictLabel}.`,
  ]
    .filter(Boolean)
    .join(' ')
}

function buildStrategyPanel(improvementActions, caseAssessment) {
  return {
    summary: 'These are the most leverage-heavy actions the current system can justify from the intake and similar-case comparison.',
    suggested_solutions: improvementActions,
    readiness_note:
      caseAssessment?.case_strength_score >= 0.65
        ? 'The case already shows a workable base, so strategy focuses on sharpening support rather than rebuilding the record.'
        : 'The case still needs material strengthening before the verdict can be treated as stable.',
  }
}

function buildGraphExplainabilityLayer(graphContext = {}) {
  const unresolved = asArray(graphContext?.graph_issue_map)
    .filter((item) => item.weakness_signal)
    .slice(0, 4)
  const contradictions = asArray(graphContext?.graph_contradiction_summary).slice(0, 4)
  const missingEvidence = asArray(graphContext?.graph_missing_evidence_summary).slice(0, 4)

  return buildLayerSummary(
    'Graph Explainability Layer',
    asArray(graphContext?.graph_issue_map).slice(0, 4).map((item) => ({
      title: item.title,
      detail: item.summary || `${item.title} from graph issue map`,
      source_basis: 'graph_issue_map',
    })),
    contradictions.map((item) => ({
      title: item.label || 'Contradiction',
      detail: item.summary || '',
      source_basis: 'graph_contradiction_summary',
    })),
    uniqueStrings([
      ...unresolved.map((item) => item.title),
      ...missingEvidence.map((item) => `${item.issue_cluster || 'issue'}: ${item.missing_label || 'missing evidence'}`),
    ]),
    'graph_context_builder',
  )
}

export function composeVerdictStudioResult({
  caseInput = {},
  graphResult = {},
  caseAssessment = {},
  documentIntelligence = {},
  similarCaseIntelligence = {},
  feedbackLearning = {},
}) {
  const graphContext = graphResult?.graph_context || graphResult?.legalResearchMeta?.graphContext || {}
  const synthesis = buildStructuredLegalSynthesis({
    caseInput,
    documentIntelligence,
    caseAssessment,
    legalResearch: graphResult?.legalResearch || {},
    similarCaseIntelligence,
    feedbackLearning,
    debateState: graphResult?.debate || graphResult?.sessionMemory || {},
    verdict: graphResult?.verdict || {},
  })
  const probability = normalizeProbabilityTriplet(
    graphResult?.win_probability_user ?? graphResult?.probability?.userWin,
    graphResult?.win_probability_opponent ?? graphResult?.probability?.opponentWin,
    graphResult?.settlement_probability ?? graphResult?.probability?.settlement,
  )
  const win_probability = computeWinProbability(probability, {
    ...caseAssessment,
    case_strength_score: caseAssessment?.case_strength_score,
    support_points: synthesis.top_supporting_facts,
    weakness_points: synthesis.top_weaknesses,
    contradiction_points: synthesis.contradiction_findings,
    missing_document_impact: synthesis.missing_document_findings,
  })
  const loss_probability = round(1 - win_probability, 3)
  const confidence_score = computeConfidenceScore(caseAssessment, similarCaseIntelligence, probability)
  const verdict_summary = buildNarrativeVerdictSummary({
    caseType: graphResult?.case_type || graphResult?.structuredCase?.case_type || caseInput?.category,
    jurisdiction: graphResult?.jurisdiction || graphResult?.structuredCase?.jurisdiction || caseInput?.jurisdiction,
    probability,
    synthesis,
    verdictLabel: inferVerdictLabel({
      userWin: win_probability,
      opponentWin: normalizeProbability(graphResult?.probability?.opponentWin, 0.3),
      settlement: probability.settlement,
    }),
  })
  const outcome_indicators = deriveOutcomeIndicators({
    caseInput,
    graphResult,
    caseAssessment,
    similarCaseIntelligence,
    winProbability: win_probability,
    confidenceScore: confidence_score,
  })
  const improvement_actions = buildImprovementActions(caseAssessment, similarCaseIntelligence)
  const verdict_layers = [
    buildLayerSummary(
      'Evidence Layer',
      synthesis.evidence_findings,
      synthesis.missing_document_findings,
      synthesis.uncertainty_drivers,
      'retrieval + evidence assessment',
    ),
    buildLayerSummary(
      'Legal Applicability Layer',
      synthesis.rule_findings,
      [],
      synthesis.uncertainty_drivers,
      'retrieval + legal research',
    ),
    buildLayerSummary(
      'Similar-Case Pattern Layer',
      synthesis.similar_case_findings,
      synthesis.similar_case_findings.filter((item) => /difference|gap|less|different/i.test(item.detail || item.title)),
      synthesis.uncertainty_drivers,
      'similar-case retrieval',
    ),
    buildLayerSummary(
      'Human Factors Layer',
      synthesis.emotional_signal_findings,
      [],
      synthesis.human_factors?.signals?.length ? [] : ['No strong human factors identified'],
      'emotional signal extraction from case narrative and retrieval context',
    ),
    buildLayerSummary(
      'Risk Layer',
      synthesis.risk_findings,
      synthesis.contradiction_findings,
      synthesis.uncertainty_drivers,
      'contradictions, missing documents, and retrieved pressure signals',
    ),
    buildLayerSummary(
      'Strategy Layer',
      synthesis.strategy_findings,
      [],
      [],
      'case assessment recommendations and retrieval gaps',
    ),
    buildGraphExplainabilityLayer(graphContext),
    buildOutcomeProjectionLayer({
      winProbability: win_probability,
      lossProbability: loss_probability,
      confidenceScore: confidence_score,
      outcomeIndicators: outcome_indicators,
      similarCaseIntelligence,
    }),
  ]

  const verdictLabel = inferVerdictLabel({
    userWin: win_probability,
    opponentWin: normalizeProbability(graphResult?.probability?.opponentWin, 0.3),
    settlement: probability.settlement,
  })

  return {
    verdict_summary,
    win_probability,
    loss_probability,
    settlement_probability: probability.settlement,
    confidence_score,
    structured_synthesis: synthesis,
    outcome_indicators,
    improvement_actions,
    verdict_layers,
    reasoning_panel: buildReasoningPanel(verdict_summary, verdict_layers, confidence_score),
    strategy_panel: buildStrategyPanel(improvement_actions, caseAssessment),
    uncertainty_flags: uniqueStrings([
      confidence_score < 0.55 ? 'Overall confidence is limited.' : '',
      outcome_indicators.expected_duration?.certainty !== 'supported'
        ? 'Duration estimate is weak or unavailable.'
        : '',
      outcome_indicators.cost_estimate?.certainty !== 'supported'
        ? 'Cost estimate is weak or unavailable.'
        : '',
    ]),
    supporting_context: {
      case_strength_score: normalizeProbability(caseAssessment?.case_strength_score, 0.5),
      similar_case_count: asArray(similarCaseIntelligence?.similar_cases).length,
      feedback_learning_summary: feedbackLearning?.summary || '',
      human_factors_summary: synthesis.human_factors?.settlement_likelihood_effect || '',
    },
    similar_case_intelligence: similarCaseIntelligence,
    human_factors: synthesis.human_factors,
    probability_support_profile: synthesis.probability_support_profile,
    graph_context: graphContext,

    case_summary:
      graphResult?.case_summary ||
      `Case type: ${graphResult?.case_type || graphResult?.structuredCase?.case_type || caseInput?.category || 'general'}. Jurisdiction: ${
        graphResult?.jurisdiction || graphResult?.structuredCase?.jurisdiction || caseInput?.jurisdiction || 'unknown'
      }.`,
    verdict: verdictLabel,
    verdict_text: verdictLabel,
    confidence: confidence_score,
    reasoning: graphResult?.reasoning || graphResult?.judgeReasoning || verdict_summary,
    learningSummary: feedbackLearning?.summary || '',
    suggested_actions: improvement_actions.map((item) => item.action),
    probability: {
      userWin: win_probability,
      opponentWin: normalizeProbability(graphResult?.probability?.opponentWin, probability.opponentWin),
      settlement: probability.settlement,
    },
    riskScore: round(1 - win_probability, 2),
    similarCases: asArray(similarCaseIntelligence?.similar_cases),
    verdictMeta: {
      source: 'phase4_verdict_studio',
      caseType:
        graphResult?.case_type || graphResult?.structuredCase?.case_type || caseInput?.category || 'unknown',
      suggestedActionCount: improvement_actions.length,
      layerCount: verdict_layers.length,
      similarCaseCount: asArray(similarCaseIntelligence?.similar_cases).length,
      structuredSynthesis: true,
    },
  }
}
