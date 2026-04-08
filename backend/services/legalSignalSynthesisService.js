function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function round(value, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function truncateText(value, maxChars = 220) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text
}

function buildFinding({ title, detail, source_basis, effect_on_outcome, confidence = 0.5 }) {
  return {
    title,
    detail,
    source_basis,
    effect_on_outcome,
    confidence: round(clamp(confidence, 0, 1), 3),
  }
}

const emotionalSignalCatalog = [
  {
    signal_type: 'hardship',
    effect_area: ['settlement likelihood', 'strategy recommendation', 'uncertainty note'],
    patterns: ['hardship', 'distress', 'financial pressure', 'loss of livelihood', 'family burden'],
  },
  {
    signal_type: 'betrayal_unfairness',
    effect_area: ['negotiation leverage', 'sympathy/harshness risk', 'narrative coherence'],
    patterns: ['unfair', 'betray', 'breach of trust', 'misled', 'taken advantage'],
  },
  {
    signal_type: 'dependency_family_pressure',
    effect_area: ['settlement likelihood', 'strategy recommendation', 'narrative coherence'],
    patterns: ['family', 'dependent', 'children', 'medical', 'support', 'caregiver'],
  },
  {
    signal_type: 'urgency_distress',
    effect_area: ['settlement likelihood', 'perceived credibility pressure'],
    patterns: ['urgent', 'immediately', 'cannot wait', 'distress', 'crisis', 'stress'],
  },
  {
    signal_type: 'reputational_harm',
    effect_area: ['negotiation leverage', 'reputational/relationship impact', 'strategy recommendation'],
    patterns: ['reputation', 'embarrass', 'public', 'defame', 'market reputation', 'professional standing'],
  },
  {
    signal_type: 'trust_breakdown',
    effect_area: ['narrative coherence', 'settlement likelihood', 'perceived credibility pressure'],
    patterns: ['trust', 'betray', 'faith', 'confidence broken', 'relationship breakdown'],
  },
  {
    signal_type: 'coercion_pressure',
    effect_area: ['perceived credibility pressure', 'sympathy/harshness risk', 'uncertainty note'],
    patterns: ['forced', 'coerced', 'pressure', 'threat', 'intimidat', 'fear'],
  },
  {
    signal_type: 'apology_remorse',
    effect_area: ['settlement likelihood', 'strategy recommendation', 'narrative coherence'],
    patterns: ['sorry', 'apolog', 'regret', 'mistake', 'acknowledge'],
  },
  {
    signal_type: 'adversarial_tone',
    effect_area: ['sympathy/harshness risk', 'uncertainty note'],
    patterns: ['angry', 'threaten', 'refuse', 'hostile', 'shout', 'blame'],
  },
  {
    signal_type: 'sympathy_context',
    effect_area: ['settlement likelihood', 'negotiation leverage'],
    patterns: ['illness', 'hospital', 'child', 'school', 'job loss', 'rent', 'emergency'],
  },
]

function pickIntensity(text, hitCount) {
  const base = text.length > 180 ? 0.55 : 0.4
  const intensity = base + hitCount * 0.18
  return round(clamp(intensity, 0.2, 0.95), 3)
}

function inferRelevance(text, caseInput = {}) {
  const caseSignals = [caseInput.category, caseInput.jurisdiction, caseInput.description, caseInput.caseText]
    .filter(Boolean)
    .map((value) => normalizeText(value))
    .join(' ')
  return round(clamp(0.35 + lexicalOverlap(text, caseSignals) * 0.8, 0.2, 0.96), 3)
}

function lexicalOverlap(left, right) {
  const leftTokens = new Set(normalizeText(left).split(' ').filter(Boolean))
  const rightTokens = new Set(normalizeText(right).split(' ').filter(Boolean))
  if (!leftTokens.size || !rightTokens.size) return 0

  let overlap = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1
  }
  return overlap / leftTokens.size
}

function buildSourceTextSet({ caseInput = {}, documentIntelligence = {}, similarCaseIntelligence = {}, feedbackLearning = {}, debateState = {}, legalResearch = {}, caseAssessment = {} }) {
  return [
    caseInput.description,
    caseInput.caseText,
    caseInput.category,
    caseInput.jurisdiction,
    documentIntelligence?.completeness_explanation,
    documentIntelligence?.readiness_assessment?.summary,
    ...(documentIntelligence?.missing_documents || []).map((item) => item?.label || item?.description),
    ...(documentIntelligence?.available_documents || []).map((item) => item?.label || item?.description),
    ...(caseAssessment?.support_points || []).map((item) => item?.detail),
    ...(caseAssessment?.weakness_points || []).map((item) => item?.detail),
    ...(caseAssessment?.contradiction_points || []).map((item) => item?.detail),
    ...(caseAssessment?.missing_document_impact || []).map((item) => item?.risk_introduced || item?.impact_reason),
    legalResearch?.similar_cases?.map((item) => item?.summary),
    legalResearch?.related_cases || [],
    similarCaseIntelligence?.case_gap_analysis || [],
    similarCaseIntelligence?.pattern_insights?.outcome_trend,
    similarCaseIntelligence?.pattern_insights?.timeline_trend,
    similarCaseIntelligence?.pattern_insights?.cost_pattern,
    feedbackLearning?.summary,
    feedbackLearning?.recommendedAdjustments || [],
    debateState?.current_focus,
    debateState?.debate_summary,
    ...(debateState?.turns || []).slice(-5).flatMap((turn) => [turn?.question, turn?.user_answer, turn?.agent_comment]),
    ...(debateState?.unresolved_issues || []).map((item) => item?.issue),
    debateState?.last_answer_review?.summary,
    debateState?.last_answer_review?.notes,
    debateState?.last_answer_review?.contradictions || [],
    debateState?.last_answer_review?.missing_evidence_signals || [],
    legalResearch?.retrieval_context?.evidence_text_block,
    legalResearch?.retrieval_context?.rules_text_block,
  ]
    .flat()
    .filter(Boolean)
    .map((value) => String(value).trim())
}

function extractEmotionalSignals(textSources = [], caseInput = {}) {
  const findings = []

  for (const sourceText of textSources) {
    const normalized = normalizeText(sourceText)
    if (!normalized) continue

    for (const signal of emotionalSignalCatalog) {
      const hits = signal.patterns.filter((pattern) => normalized.includes(pattern)).length
      if (!hits) continue

      findings.push({
        signal_type: signal.signal_type,
        source_text: truncateText(sourceText),
        intensity: pickIntensity(normalized, hits),
        relevance_to_case: inferRelevance(sourceText, caseInput),
        likely_effect_area: signal.effect_area,
      })
    }
  }

  return findings
}

function rankRetrievalFinding({ source_type, title, detail, relevance = 0.5, evidentiary_usefulness = 0.5, legal_usefulness = 0.5, emotional_usefulness = 0.2, jurisdiction_fit = 0.5, duplicated = false }) {
  const score = clamp(
    relevance * 0.35 + evidentiary_usefulness * 0.25 + legal_usefulness * 0.2 + emotional_usefulness * 0.08 + jurisdiction_fit * 0.12 - (duplicated ? 0.15 : 0),
    0,
    1,
  )

  return {
    source_type,
    title,
    detail: truncateText(detail, 240),
    relevance: round(relevance, 3),
    evidentiary_usefulness: round(evidentiary_usefulness, 3),
    legal_usefulness: round(legal_usefulness, 3),
    emotional_usefulness: round(emotional_usefulness, 3),
    jurisdiction_fit: round(jurisdiction_fit, 3),
    duplicated,
    score: round(score, 3),
  }
}

export function buildRetrievalFindings({ documentIntelligence = {}, legalResearch = {}, similarCaseIntelligence = {}, caseAssessment = {}, caseInput = {} }) {
  const ruleDocuments = legalResearch?.knowledge_bundle?.retrieved_rules || legalResearch?.retrieval_context?.rules_documents || []
  const evidenceDocuments = legalResearch?.knowledge_bundle?.retrieved_evidence || legalResearch?.retrieval_context?.evidence_documents || []
  const similarCases = similarCaseIntelligence?.similar_cases || []

  const legal_rule_points = asArray(ruleDocuments).slice(0, 6).map((doc, index) =>
    rankRetrievalFinding({
      source_type: 'legal_rule',
      title: doc.label || doc.title || `Rule ${index + 1}`,
      detail: doc.summary || doc.text_block || doc.metadata?.text || '',
      relevance: 0.55 + Math.min(0.35, index * 0.03),
      legal_usefulness: 0.8,
      jurisdiction_fit: caseInput.jurisdiction ? 0.7 : 0.45,
    }),
  )

  const evidence_pattern_points = asArray(evidenceDocuments).slice(0, 6).map((doc, index) =>
    rankRetrievalFinding({
      source_type: 'evidence',
      title: doc.title || doc.file_name || `Evidence ${index + 1}`,
      detail: doc.summary || doc.metadata?.text || doc.basic_description || '',
      relevance: 0.58 + Math.min(0.3, index * 0.02),
      evidentiary_usefulness: 0.88,
      emotional_usefulness: 0.45,
      jurisdiction_fit: caseInput.jurisdiction ? 0.68 : 0.4,
    }),
  )

  const similar_case_pattern_points = similarCases.slice(0, 6).map((candidate, index) =>
    rankRetrievalFinding({
      source_type: 'similar_case',
      title: candidate.title || candidate.case_id || `Similar case ${index + 1}`,
      detail:
        candidate.summary || candidate.differences?.[0] || candidate.similarity_reasons?.[0] || '',
      relevance: Number(candidate.similarity_score || 0.5),
      evidentiary_usefulness: 0.45,
      legal_usefulness: 0.72,
      jurisdiction_fit: candidate.court && caseInput.jurisdiction ? (normalizeText(candidate.court).includes(normalizeText(caseInput.jurisdiction)) ? 0.8 : 0.35) : 0.45,
      duplicated: index > 0 && normalizeText(candidate.title) === normalizeText(similarCases[0]?.title),
    }),
  )

  const contradiction_points = asArray(caseAssessment?.contradiction_points || documentIntelligence?.contradictions || []).map((item, index) =>
    rankRetrievalFinding({
      source_type: 'contradiction',
      title: item.title || `Contradiction ${index + 1}`,
      detail: item.detail || item,
      relevance: 0.78,
      evidentiary_usefulness: 0.5,
      legal_usefulness: 0.4,
      emotional_usefulness: 0.15,
    }),
  )

  const missing_document_findings = asArray(caseAssessment?.missing_document_impact || documentIntelligence?.missing_documents || []).map((item, index) =>
    rankRetrievalFinding({
      source_type: 'missing_document',
      title: item.label || item.type || `Missing document ${index + 1}`,
      detail: item.risk_introduced || item.impact_reason || item.description || '',
      relevance: 0.75,
      evidentiary_usefulness: 0.9,
      legal_usefulness: 0.5,
    }),
  )

  const risk_findings = [...contradiction_points, ...missing_document_findings]
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)

  return {
    legal_rule_points,
    evidence_pattern_points,
    similar_case_pattern_points,
    contradiction_points,
    missing_document_findings,
    risk_findings,
  }
}

function buildSupportAndWeaknessSummary(caseAssessment = {}, retrievalFindings = {}, emotionalSignals = []) {
  const topSupportingFacts = asArray(caseAssessment?.support_points).slice(0, 4).map((item) =>
    buildFinding({
      title: item.title || 'Support point',
      detail: item.detail || '',
      source_basis: 'case_assessment.support_points',
      effect_on_outcome: 'supports case posture',
      confidence: 0.78,
    }),
  )

  const topWeaknesses = [
    ...asArray(caseAssessment?.weakness_points).slice(0, 4).map((item) =>
      buildFinding({
        title: item.title || 'Weakness point',
        detail: item.detail || '',
        source_basis: 'case_assessment.weakness_points',
        effect_on_outcome: 'weakens case posture',
        confidence: 0.72,
      }),
    ),
    ...retrievalFindings.missing_document_findings.slice(0, 2).map((item) =>
      buildFinding({
        title: item.title,
        detail: item.detail,
        source_basis: 'retrieval.missing_documents',
        effect_on_outcome: 'reduces evidence readiness',
        confidence: item.score,
      }),
    ),
  ].slice(0, 6)

  const uncertaintyDrivers = [
    ...topWeaknesses.slice(0, 2).map((item) => `Weakness signal: ${item.title}`),
    ...(emotionalSignals.length ? [`${emotionalSignals.length} emotional/human-factor signal(s) identified`] : []),
    ...(retrievalFindings.similar_case_pattern_points.length ? [] : ['Similar-case coverage is limited']),
  ]

  return {
    top_supporting_facts: topSupportingFacts,
    top_weaknesses: topWeaknesses,
    uncertainty_drivers: uncertaintyDrivers,
  }
}

function buildStrategyFindings(caseAssessment = {}, retrievalFindings = {}, emotionalSignals = []) {
  const strategies = []

  for (const action of asArray(caseAssessment?.recommendations).slice(0, 5)) {
    strategies.push(
      buildFinding({
        title: action.action,
        detail: action.reason || action.expected_impact || '',
        source_basis: 'case_assessment.recommendations',
        effect_on_outcome: action.expected_impact || 'improves readiness',
        confidence: 0.8,
      }),
    )
  }

  if (retrievalFindings.similar_case_pattern_points.length) {
    strategies.push(
      buildFinding({
        title: 'Align with similar-case pattern gaps',
        detail: retrievalFindings.similar_case_pattern_points[0].detail,
        source_basis: 'similar_case_patterns',
        effect_on_outcome: 'improves precedent alignment',
        confidence: retrievalFindings.similar_case_pattern_points[0].score,
      }),
    )
  }

  if (emotionalSignals.length) {
    strategies.push(
      buildFinding({
        title: 'Use hardship signals carefully',
        detail: 'Emotional context may strengthen settlement leverage or perceived urgency, but it should be backed by documents or communications.',
        source_basis: 'emotional_signals',
        effect_on_outcome: 'improves negotiation posture without changing legal merit',
        confidence: 0.67,
      }),
    )
  }

  return strategies.slice(0, 6)
}

function buildHumanFactorsAssessment(emotionalSignals = [], caseAssessment = {}) {
  const strongest = emotionalSignals
    .slice()
    .sort((left, right) => right.intensity - left.intensity)
    .slice(0, 4)

  const settlementImpact = strongest.some((item) => ['hardship', 'urgency_distress', 'dependency_family_pressure', 'reputational_harm', 'trust_breakdown', 'coercion_pressure'].includes(item.signal_type))
    ? 'May improve settlement leverage and urgency framing if corroborated.'
    : 'No strong emotional-pressure signal materially changes the posture.'

  return {
    signals: strongest,
    settlement_likelihood_effect: settlementImpact,
    credibility_pressure_effect: strongest.some((item) => item.signal_type === 'coercion_pressure')
      ? 'Potential credibility pressure exists if coercion is not timeline-consistent.'
      : 'No coercion-specific credibility pressure identified.',
    narrative_coherence: caseAssessment?.reasoning_trace_summary || 'Narrative coherence depends on the case assessment and retrieval evidence.',
  }
}

export function buildStructuredLegalSynthesis({
  caseInput = {},
  documentIntelligence = {},
  caseAssessment = {},
  legalResearch = {},
  similarCaseIntelligence = {},
  feedbackLearning = {},
  debateState = {},
  verdict = {},
} = {}) {
  const textSources = buildSourceTextSet({
    caseInput,
    documentIntelligence,
    similarCaseIntelligence,
    feedbackLearning,
    debateState,
    legalResearch,
    caseAssessment,
  })
  const emotionalSignals = extractEmotionalSignals(textSources, caseInput)
  const retrievalFindings = buildRetrievalFindings({
    documentIntelligence,
    legalResearch,
    similarCaseIntelligence,
    caseAssessment,
    caseInput,
  })
  const summary = buildSupportAndWeaknessSummary(caseAssessment, retrievalFindings, emotionalSignals)
  const strategyFindings = buildStrategyFindings(caseAssessment, retrievalFindings, emotionalSignals)
  const humanFactors = buildHumanFactorsAssessment(emotionalSignals, caseAssessment)

  return {
    evidence_findings: retrievalFindings.evidence_pattern_points,
    rule_findings: retrievalFindings.legal_rule_points,
    similar_case_findings: retrievalFindings.similar_case_pattern_points,
    emotional_signal_findings: emotionalSignals,
    contradiction_findings: retrievalFindings.contradiction_points,
    missing_document_findings: retrievalFindings.missing_document_findings,
    risk_findings: retrievalFindings.risk_findings,
    strategy_findings: strategyFindings,
    feedback_insight_findings: asArray(feedbackLearning?.recommendedAdjustments).map((item, index) =>
      buildFinding({
        title: typeof item === 'string' ? item : item.action || `Feedback insight ${index + 1}`,
        detail: typeof item === 'string' ? item : item.reason || '',
        source_basis: 'feedback_learning',
        effect_on_outcome: 'practice caution and workflow improvement',
        confidence: 0.6,
      }),
    ),
    human_factors: humanFactors,
    top_supporting_facts: summary.top_supporting_facts,
    top_weaknesses: summary.top_weaknesses,
    uncertainty_drivers: summary.uncertainty_drivers,
    probability_support_profile: {
      evidence_support: round(clamp((summary.top_supporting_facts.length || 0) / 5, 0, 1), 3),
      contradiction_exposure: round(clamp((retrievalFindings.contradiction_points.length || 0) / 5, 0, 1), 3),
      missing_documents: round(clamp((retrievalFindings.missing_document_findings.length || 0) / 5, 0, 1), 3),
      legal_fit: round(clamp((retrievalFindings.legal_rule_points.length || 0) / 5, 0, 1), 3),
      similar_case_support: round(clamp((retrievalFindings.similar_case_pattern_points.length || 0) / 5, 0, 1), 3),
      emotional_narrative_leverage: round(clamp((emotionalSignals.length || 0) / 6, 0, 1), 3),
      uncertainty_level: round(clamp((summary.uncertainty_drivers.length || 0) / 5, 0, 1), 3),
    },
    verdict_summary: verdict?.verdict_summary || '',
  }
}

export function summarizeClusterKey(value = '') {
  return normalizeText(value)
    .replace(/\b(the|a|an|and|or|of|to|for|with|on|in)\b/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function buildDebateIssueCluster(question = {}, answerReview = null) {
  const category = summarizeClusterKey(
    question.issue_category || question.issue_type || question.impact_axis || question.linked_issue_or_evidence || 'general',
  )
  const subtype = summarizeClusterKey(question.issue_subtype || question.issue_reference || question.issue_type || 'general')
  const dependency = summarizeClusterKey(answerReview?.missing_evidence_signals?.[0] || answerReview?.contradictions?.[0] || '')

  return {
    issue_category: category || 'general',
    issue_subtype: subtype || 'general',
    strategic_side: question.side === 'opposing' ? 'prosecution' : 'defense',
    severity: question.priority || 'medium',
    followup_mode:
      answerReview?.strength_impact === 'weakened'
        ? 'pressure_probe'
        : answerReview?.strength_impact === 'strengthened'
          ? 'shift_to_next_gap'
          : 'clarify_and_test',
    dependency_on_previous_turn: dependency || summarizeClusterKey(question.dependency_on_previous_turn || ''),
    cluster_key: [category, subtype].filter(Boolean).join('::') || 'general',
  }
}
