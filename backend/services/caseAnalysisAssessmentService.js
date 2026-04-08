function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function roundTwo(value) {
  return Math.round(value * 100) / 100
}

function toDocumentMap(documentIntelligence) {
  const documents = documentIntelligence?.detected_documents || []
  return new Map(documents.map((document) => [document.id, document]))
}

function inferEvidenceRole(document, requiredTypes, contradictions = []) {
  if (!document?.usableForAnalysis) return 'weak'
  if (contradictions.length > 0 && document.detectedCategory === 'communication') return 'neutral'
  if (requiredTypes.has(document.detectedType)) return 'support'
  if (document.detectedType === 'unclassified-document') return 'weak'
  return 'neutral'
}

function buildReliabilityReason(document, requiredTypes) {
  const reasons = []

  if (requiredTypes.has(document.detectedType)) {
    reasons.push('matches a likely required case document')
  }
  if (document.reliabilityLabel === 'document-backed') {
    reasons.push('comes from a document-backed source')
  }
  if (document.reliabilityLabel === 'visual-support') {
    reasons.push('provides visual support but may need corroborating records')
  }
  if (!document.usableForAnalysis) {
    reasons.push('has limited analytical value in its current form')
  }
  if (document.inventoryStatus === 'unclassified') {
    reasons.push('could not be mapped confidently to a known legal document type')
  }

  return reasons.length ? reasons.join('; ') : 'provides general supporting context'
}

function buildEvidenceAnalysis(documentIntelligence, evidenceAnalysisFromGraph) {
  const contradictions = evidenceAnalysisFromGraph?.contradictions || []
  const detectedDocuments = documentIntelligence?.detected_documents || []
  const requiredTypes = new Set((documentIntelligence?.checklist?.required || []).map((item) => item.type))

  return detectedDocuments.map((document) => {
    let score = Number(document.confidence || 0)

    if (requiredTypes.has(document.detectedType)) score += 0.12
    if (document.reliabilityLabel === 'document-backed') score += 0.08
    if (document.reliabilityLabel === 'visual-support') score -= 0.05
    if (!document.usableForAnalysis) score -= 0.18
    if (document.inventoryStatus === 'unclassified') score -= 0.12
    if (contradictions.length && document.detectedCategory === 'communication') score -= 0.05

    const reliabilityScore = roundTwo(clamp(score, 0.12, 0.96))

    return {
      evidence_id: document.id,
      type: document.detectedType,
      file_name: document.originalName,
      category: document.detectedCategory,
      reliability_score: reliabilityScore,
      reliability_label:
        reliabilityScore >= 0.72 ? 'high' : reliabilityScore >= 0.45 ? 'medium' : 'low',
      reliability_reason: buildReliabilityReason(document, requiredTypes),
      role: inferEvidenceRole(document, requiredTypes, contradictions),
      usable_for_analysis: Boolean(document.usableForAnalysis),
    }
  })
}

function buildSupportPoints(documentIntelligence, evidenceAnalysis, caseInput, graphResult) {
  const points = []
  const availableDocuments = documentIntelligence?.available_documents || []
  const highReliabilitySupport = evidenceAnalysis.filter(
    (item) => item.role === 'support' && item.reliability_score >= 0.65,
  )

  if (availableDocuments.length) {
    points.push({
      title: 'Document coverage exists',
      detail: `${availableDocuments.length} likely required document(s) are already present in the intake package.`,
      evidence_ids: highReliabilitySupport.slice(0, 3).map((item) => item.evidence_id),
    })
  }

  if (highReliabilitySupport.length) {
    points.push({
      title: 'Some evidence looks dependable',
      detail: `${highReliabilitySupport.length} evidence item(s) currently score as medium-to-high reliability and directly support the case package.`,
      evidence_ids: highReliabilitySupport.map((item) => item.evidence_id),
    })
  }

  if (Number(graphResult?.evidence_score || 0) >= 6) {
    points.push({
      title: 'Evidence analyzer sees usable support',
      detail: `The current evidence score is ${graphResult.evidence_score}/10, which suggests the intake package is already analytically useful.`,
      evidence_ids: [],
    })
  }

  if (String(caseInput?.description || '').trim().length >= 120) {
    points.push({
      title: 'Case facts are reasonably described',
      detail: 'The narrative description contains enough detail to support structured downstream analysis.',
      evidence_ids: [],
    })
  }

  return points
}

function buildWeaknessPoints(documentIntelligence, evidenceAnalysis, graphResult) {
  const points = []
  const missingDocuments = documentIntelligence?.missing_documents || []
  const weakEvidence = evidenceAnalysis.filter((item) => item.reliability_score < 0.45)

  if (missingDocuments.length) {
    points.push({
      title: 'Required documents are still missing',
      detail: `${missingDocuments.length} likely required document(s) are missing, which limits case support and transparency.`,
      related_documents: missingDocuments.map((item) => item.type),
    })
  }

  if (weakEvidence.length) {
    points.push({
      title: 'Some uploaded material is weak or unclear',
      detail: `${weakEvidence.length} uploaded evidence item(s) currently look weak, unclear, or only partially usable for analysis.`,
      related_evidence: weakEvidence.map((item) => item.evidence_id),
    })
  }

  if ((graphResult?.missing_evidence || []).length) {
    points.push({
      title: 'The evidence analyzer still sees gaps',
      detail: `Key missing support items identified: ${(graphResult.missing_evidence || []).join(', ')}.`,
      related_documents: [],
    })
  }

  return points
}

function buildContradictionPoints(graphResult) {
  return (graphResult?.contradictions || []).map((item) => ({
    title: 'Potential contradiction detected',
    detail: item,
  }))
}

function buildMissingDocumentImpact(documentIntelligence) {
  return (documentIntelligence?.missing_documents || []).map((item) => ({
    type: item.type,
    label: item.label,
    impact_reason: `${item.label} matters because it helps verify a core part of the case package.`,
    risk_introduced: `Without ${item.label.toLowerCase()}, the current submission has weaker documentary coverage and less verifiable support.`,
  }))
}

function buildRecommendations(documentIntelligence, evidenceAnalysis, graphResult) {
  const recommendations = []
  const missingDocuments = documentIntelligence?.missing_documents || []
  const weakEvidence = evidenceAnalysis.filter((item) => item.reliability_score < 0.45)
  const contradictions = graphResult?.contradictions || []

  for (const item of missingDocuments.slice(0, 3)) {
    recommendations.push({
      action: `Add ${item.label}`,
      reason: `${item.label} is part of the likely required documentation for this case package.`,
      expected_impact: 'Improves completeness and strengthens documentary support for deeper analysis.',
    })
  }

  for (const item of weakEvidence.slice(0, 2)) {
    recommendations.push({
      action: `Strengthen or clarify ${item.file_name}`,
      reason: item.reliability_reason,
      expected_impact: 'Improves evidence usability and reduces uncertainty in downstream analysis.',
    })
  }

  for (const contradiction of contradictions.slice(0, 2)) {
    recommendations.push({
      action: 'Clarify a factual inconsistency',
      reason: contradiction,
      expected_impact: 'Reduces contradiction risk and makes the case narrative more coherent.',
    })
  }

  if (!recommendations.length) {
    recommendations.push({
      action: 'Maintain the current evidence package and continue adding corroboration where possible',
      reason: 'No single urgent weakness dominates the intake analysis.',
      expected_impact: 'Keeps the case package stable while improving reliability incrementally.',
    })
  }

  return recommendations
}

function buildReasoningTraceSummary(documentIntelligence, evidenceAnalysis, graphResult, caseStrengthScore) {
  const missingCount = (documentIntelligence?.missing_documents || []).length
  const supportCount = evidenceAnalysis.filter((item) => item.role === 'support').length
  const weakCount = evidenceAnalysis.filter((item) => item.role === 'weak').length
  const contradictionCount = (graphResult?.contradictions || []).length

  return `Case strength was derived from document completeness, evidence reliability, contradiction checks, and current evidence coverage. ${supportCount} evidence item(s) currently support the case package, ${weakCount} item(s) remain weak or unclear, ${missingCount} likely required document(s) are missing, and ${contradictionCount} contradiction signal(s) were detected. The resulting intake-stage case strength score is ${Math.round(caseStrengthScore * 100)}%.`
}

function buildSignalTextSources(documentIntelligence = {}, graphResult = {}, caseInput = {}) {
  return [
    caseInput?.description,
    caseInput?.caseText,
    documentIntelligence?.completeness_explanation,
    documentIntelligence?.readiness_assessment?.summary,
    ...(documentIntelligence?.missing_documents || []).map((item) => item?.label || item?.description),
    ...(documentIntelligence?.available_documents || []).map((item) => item?.label || item?.description),
    ...(graphResult?.support_points || []).map((item) => item?.detail),
    ...(graphResult?.weakness_points || []).map((item) => item?.detail),
    ...(graphResult?.contradictions || []),
  ].filter(Boolean)
}

function buildHumanFactorsFromSignals(signals = []) {
  const strongest = signals.slice(0, 4)
  const hasHardship = strongest.some((item) => /hardship|family|pressure|trust|urgent|coerc|reput|unfair/i.test(item))
  return {
    signals: strongest,
    settlement_likelihood_effect: hasHardship
      ? 'Human-factor narrative may strengthen settlement leverage if corroborated.'
      : 'No strong human-factor effect detected from the available narrative.',
    credibility_pressure_effect: hasHardship
      ? 'Human-context statements may increase perceived pressure, but they do not establish legal proof by themselves.'
      : 'No separate credibility pressure beyond the documentary record.',
  }
}

export function buildCaseAnalysisAssessment(graphResult, documentIntelligence, caseInput = {}) {
  const evidenceAnalysis = buildEvidenceAnalysis(documentIntelligence, graphResult)
  const supportPoints = buildSupportPoints(documentIntelligence, evidenceAnalysis, caseInput, graphResult)
  const weaknessPoints = buildWeaknessPoints(documentIntelligence, evidenceAnalysis, graphResult)
  const contradictionPoints = buildContradictionPoints(graphResult)
  const missingDocumentImpact = buildMissingDocumentImpact(documentIntelligence)
  const recommendations = buildRecommendations(documentIntelligence, evidenceAnalysis, graphResult)
  const signalTextSources = buildSignalTextSources(documentIntelligence, graphResult, caseInput)
  const structuredSignals = signalTextSources.map((item) => String(item).trim()).filter(Boolean)
  const emotionalSignals = structuredSignals.filter((item) => /hardship|unfair|betray|pressure|urgent|family|trust|remorse|coerc|reput|sympathy|fear/i.test(item))

  const completeness = Number(documentIntelligence?.completeness_score || 0) / 100
  const evidenceScore = clamp(Number(graphResult?.evidence_score || 0) / 10, 0, 1)
  const contradictionPenalty = contradictionPoints.length ? Math.min(0.18, contradictionPoints.length * 0.06) : 0
  const missingPenalty = missingDocumentImpact.length ? Math.min(0.2, missingDocumentImpact.length * 0.04) : 0
  const caseStrengthScore = roundTwo(clamp(completeness * 0.55 + evidenceScore * 0.45 - contradictionPenalty - missingPenalty, 0.08, 0.94))

  return {
    evidence_analysis: evidenceAnalysis,
    support_points: supportPoints,
    weakness_points: weaknessPoints,
    contradiction_points: contradictionPoints,
    missing_document_impact: missingDocumentImpact,
    recommendations: recommendations,
    emotional_signal_findings: emotionalSignals.slice(0, 6).map((item, index) => ({
      signal_type: /hardship/i.test(item)
        ? 'hardship'
        : /pressure|coerc|fear/i.test(item)
          ? 'coercion_pressure'
          : /trust|betray|unfair/i.test(item)
            ? 'trust_breakdown'
            : 'sympathy_context',
      source_text: item,
      intensity: index === 0 ? 0.82 : 0.64,
      relevance_to_case: 0.68,
      likely_effect_area: ['settlement likelihood', 'narrative coherence', 'strategy recommendation'],
    })),
    human_factors: buildHumanFactorsFromSignals(emotionalSignals),
    reasoning_trace_summary: buildReasoningTraceSummary(
      documentIntelligence,
      evidenceAnalysis,
      graphResult,
      caseStrengthScore,
    ),
    case_strength_score: caseStrengthScore,
    structured_signal_sources: structuredSignals.slice(0, 12),
  }
}
