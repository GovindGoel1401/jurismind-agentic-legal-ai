import { buildRetrievalLayerSummary } from './retrieval/retrievalLayers.js'

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value) {
  return normalizeText(value).split(' ').filter(Boolean)
}

function lexicalOverlap(a, b) {
  const aTokens = new Set(tokenize(a))
  const bTokens = new Set(tokenize(b))
  if (!aTokens.size || !bTokens.size) return 0

  let overlap = 0
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1
  }
  return overlap / aTokens.size
}

function unique(values = []) {
  return Array.from(new Set((values || []).filter(Boolean)))
}

function inferOutcomeSummary(candidate) {
  return {
    outcome: candidate.outcome || candidate.result || 'Outcome uncertain from available case metadata.',
    timeline_range: candidate.timeline_range || candidate.timeline || 'Timeline uncertain',
    cost_pattern: candidate.cost_pattern || candidate.cost || 'Cost pattern uncertain',
    confidence_note:
      candidate.outcome || candidate.result
        ? 'Outcome summary is based on retrieved case metadata.'
        : 'Outcome metadata is limited for this retrieved case.',
  }
}

function buildMatchedFactors(currentCase, candidate, lexicalScore, baseScore) {
  const factors = []

  if (currentCase.category && normalizeText(candidate.case_category || candidate.category).includes(normalizeText(currentCase.category))) {
    factors.push(`matched case category: ${currentCase.category}`)
  }
  if (currentCase.jurisdiction && normalizeText(candidate.court || candidate.jurisdiction).includes(normalizeText(currentCase.jurisdiction))) {
    factors.push(`matched jurisdiction context: ${currentCase.jurisdiction}`)
  }
  if (lexicalScore >= 0.22) {
    factors.push('overlapping factual keywords and issue pattern')
  }
  if (baseScore >= 0.7) {
    factors.push('strong retrieval similarity score from similar-case retrieval layer')
  }
  if (candidate.relevant_section || candidate.section || candidate.law || candidate.matched_section) {
    factors.push(`matched legal issue signal: ${candidate.relevant_section || candidate.section || candidate.law || candidate.matched_section}`)
  }

  return factors
}

function buildDifferences(currentCase, candidate, currentDocTypes) {
  const differences = []
  const titleText = normalizeText(`${candidate.title || ''} ${candidate.summary || ''}`)

  if (currentCase.jurisdiction && candidate.court && !normalizeText(candidate.court).includes(normalizeText(currentCase.jurisdiction))) {
    differences.push(`different court/jurisdiction context: ${candidate.court}`)
  }
  if (!titleText.includes('agreement') && currentDocTypes.has('contract-copy')) {
    differences.push('retrieved case appears less contract-document centric than the current case package')
  }
  if (titleText.includes('agreement') && !currentDocTypes.has('contract-copy') && !currentDocTypes.has('lease-agreement')) {
    differences.push('similar case appears to include agreement-backed support that the current case may lack')
  }
  if (titleText.includes('payment') && !currentDocTypes.has('payment-proof') && !currentDocTypes.has('salary-record')) {
    differences.push('similar case appears to reference stronger financial trail evidence')
  }
  if (!differences.length) {
    differences.push('differences are limited from currently available metadata')
  }

  return differences
}

function buildSimilarityReasons(matchedFactors, differences) {
  const reasons = [...matchedFactors.slice(0, 3)]
  if (differences[0]) {
    reasons.push(`key difference: ${differences[0]}`)
  }
  return reasons
}

function buildCaseGapAnalysis(similarCases, currentDocTypes) {
  const suggestions = []
  const allDifferences = similarCases.flatMap((item) => item.differences || [])

  if (allDifferences.some((item) => item.includes('agreement-backed'))) {
    suggestions.push('Similar cases often included a signed agreement or equivalent documentary anchor that the current case may lack.')
  }
  if (allDifferences.some((item) => item.includes('financial trail'))) {
    suggestions.push('Compared to similar cases, the current case may need stronger payment or financial trail evidence.')
  }
  if (!currentDocTypes.has('complaint-record') && !currentDocTypes.has('notice-letter')) {
    suggestions.push('The current case may need clearer complaint/notice documentation compared with similar disputes.')
  }
  if (!suggestions.length) {
    suggestions.push('Current case coverage looks broadly comparable to the retrieved similar cases, but detailed precedent review is still recommended.')
  }

  return suggestions
}

function buildPatternInsights(similarCases) {
  const outcomes = similarCases
    .map((item) => item.outcome_summary?.outcome)
    .filter((value) => value && !String(value).toLowerCase().includes('uncertain'))
  const timelines = similarCases
    .map((item) => item.outcome_summary?.timeline_range)
    .filter((value) => value && !String(value).toLowerCase().includes('uncertain'))
  const costs = similarCases
    .map((item) => item.outcome_summary?.cost_pattern)
    .filter((value) => value && !String(value).toLowerCase().includes('uncertain'))

  return {
    outcome_trend: outcomes.length
      ? `Retrieved similar cases most often mention outcomes like: ${outcomes.slice(0, 3).join('; ')}.`
      : 'Outcome trend is uncertain because retrieved case metadata is limited.',
    timeline_trend: timelines.length
      ? `Observed timeline signals: ${timelines.slice(0, 3).join('; ')}.`
      : 'Timeline trend is uncertain from the available similar-case metadata.',
    cost_pattern: costs.length
      ? `Observed cost/fine pattern signals: ${costs.slice(0, 3).join('; ')}.`
      : 'Cost pattern is uncertain from the available similar-case metadata.',
    confidence_note:
      similarCases.length >= 3
        ? 'Pattern insights are derived from the current similar-case set and should be treated as indicative, not definitive.'
        : 'Pattern insights have low confidence because only a small number of comparable cases were retrieved.',
  }
}

export function buildSimilarCaseIntelligence({
  currentCase,
  documentIntelligence,
  caseAssessment,
  retrievedCases,
  graphInsights = null,
}) {
  const currentDocTypes = new Set((documentIntelligence?.detected_documents || []).map((item) => item.detectedType))
  const currentDescription = currentCase?.description || currentCase?.query || ''

  const similarCases = (retrievedCases || []).map((candidate, index) => {
    const baseScore = Number(candidate.score || 0)
    const lexicalScore = lexicalOverlap(currentDescription, `${candidate.title || ''} ${candidate.summary || ''}`)
    const categoryBoost =
      currentCase?.category &&
      normalizeText(candidate.case_category || candidate.category).includes(normalizeText(currentCase.category))
        ? 0.12
        : 0
    const jurisdictionBoost =
      currentCase?.jurisdiction &&
      normalizeText(candidate.court || candidate.jurisdiction).includes(normalizeText(currentCase.jurisdiction))
        ? 0.08
        : 0
    const similarityScore = Math.min(0.97, Math.max(0.12, Number((baseScore * 0.65 + lexicalScore * 0.15 + categoryBoost + jurisdictionBoost).toFixed(3))))

    const matchedFactors = buildMatchedFactors(currentCase, candidate, lexicalScore, baseScore)
    const differences = buildDifferences(currentCase, candidate, currentDocTypes)

    return {
      case_id: candidate.caseId || candidate.id || `similar-case-${index}`,
      title: candidate.title || 'Untitled similar case',
      summary: candidate.summary || 'No summary available for this similar case.',
      similarity_score: similarityScore,
      similarity_reasons: buildSimilarityReasons(matchedFactors, differences),
      matched_factors: matchedFactors,
      differences,
      outcome_summary: inferOutcomeSummary(candidate),
      court: candidate.court || candidate.jurisdiction || 'Court not available',
      year: candidate.year || 'N/A',
    }
  })

  return {
    similar_cases: similarCases,
    case_gap_analysis: buildCaseGapAnalysis(similarCases, currentDocTypes, caseAssessment),
    pattern_insights: buildPatternInsights(similarCases),
    alignment_profile: {
      strongest_match: similarCases[0] || null,
      mismatch_signals: unique([
        ...similarCases.flatMap((item) => item.differences || []),
      ]).slice(0, 6),
      legal_fit_summary:
        similarCases.length > 0
          ? 'Similar-case alignment exists, but the verdict should treat mismatches as materially important.'
          : 'No strong similar-case anchor was retrieved.',
      similarity_density: similarCases.length ? Number((similarCases.reduce((sum, item) => sum + Number(item.similarity_score || 0), 0) / similarCases.length).toFixed(3)) : 0,
    },
    retrieval_layers: buildRetrievalLayerSummary(),
    graph_insights: graphInsights || {
      available: false,
      similar_cases: [],
      arguments: [],
      reasoning_paths: [],
    },
  }
}
