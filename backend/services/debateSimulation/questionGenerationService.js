import { runDebateQuestionGeneratorAgent } from '../../agents/debateQuestionGeneratorAgent.js'
import { env } from '../../config/envConfig.js'
import { buildQuestionSets, flattenQuestionSets } from './debateStateService.js'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getPriority(issueType = '') {
  const normalized = String(issueType || '').trim().toLowerCase()
  if (['missing_document', 'contradiction', 'risk_exposure'].includes(normalized)) return 'high'
  if (['weak_evidence', 'opposing_attack', 'prosecution_attack', 'similar_case_gap'].includes(normalized)) return 'medium'
  return 'medium'
}

function buildQuestion({
  prefix,
  index,
  role,
  question,
  whyThisQuestionMatters,
  linkedIssueOrEvidence,
  issueType,
  issueReference,
  impactAxis,
  issueCategory,
  issueSubtype,
  strategicSide,
  severity,
  followupMode,
  dependencyOnPreviousTurn,
}) {
  const reference = issueReference || question
  const text = String(question || '').trim()
  const normalizedRole = role === 'prosecution' ? 'prosecution' : 'defense'
  return {
    question_id: `${prefix}-${index + 1}-${slugify(reference).slice(0, 28) || 'issue'}`,
    role: normalizedRole,
    side: normalizedRole === 'defense' ? 'supporting' : 'opposing',
    priority: getPriority(issueType),
    text,
    question: text,
    rationale: whyThisQuestionMatters,
    why_this_question_matters: whyThisQuestionMatters,
    linked_issue_or_evidence: linkedIssueOrEvidence,
    issue_type: issueType,
    issue_reference: issueReference,
    impact_axis: impactAxis,
    issue_category: issueCategory || issueType || 'general',
    issue_subtype: issueSubtype || issueReference || issueType || 'general',
    strategic_side: strategicSide || normalizedRole,
    severity: severity || getPriority(issueType),
    followup_mode: followupMode || 'clarify_and_test',
    dependency_on_previous_turn: dependencyOnPreviousTurn || '',
  }
}

function buildDefenseQuestions(caseAssessment, verdict, similarCaseIntelligence) {
  const questions = []
  const missingDocuments = asArray(caseAssessment?.missing_document_impact)
  const weakPoints = asArray(caseAssessment?.weakness_points)
  const improvementActions = asArray(verdict?.improvement_actions)
  const caseGaps = asArray(similarCaseIntelligence?.case_gap_analysis)

  missingDocuments.slice(0, 2).forEach((item, index) => {
    questions.push(
      buildQuestion({
        prefix: 'defense',
        index,
        role: 'defense',
        question: `Can you produce ${item.label.toLowerCase()} or explain exactly how the same point can be proved another way?`,
        whyThisQuestionMatters: item.impact_reason,
        linkedIssueOrEvidence: item.label,
        issueType: 'missing_document',
        issueReference: item.label,
        impactAxis: 'document_support',
        issueCategory: item.type === 'payment-proof' ? 'payment_proof' : 'document_support',
        issueSubtype: item.type,
        strategicSide: 'defense',
        severity: 'high',
        followupMode: 'evidence_probe',
      }),
    )
  })

  weakPoints.slice(0, 2).forEach((item, index) => {
    questions.push(
      buildQuestion({
        prefix: 'defense',
        index: questions.length + index,
        role: 'defense',
        question: `How would you strengthen this weak point: ${item.detail}`,
        whyThisQuestionMatters:
          'A stronger answer here can reduce uncertainty and improve the case package before the opposing side attacks it.',
        linkedIssueOrEvidence: item.title || 'Weak evidence point',
        issueType: 'weak_evidence',
        issueReference: item.detail,
        impactAxis: 'evidence_reliability',
        issueCategory: 'evidence_weakness',
        issueSubtype: item.title || 'weak_evidence',
        strategicSide: 'defense',
        severity: 'medium',
        followupMode: 'strengthen_support',
      }),
    )
  })

  improvementActions.slice(0, 2).forEach((item, index) => {
    questions.push(
      buildQuestion({
        prefix: 'defense',
        index: questions.length + index,
        role: 'defense',
        question: `If asked, how would you support this improvement step: ${item.action}?`,
        whyThisQuestionMatters: item.reason,
        linkedIssueOrEvidence: item.action,
        issueType: 'improvement_action',
        issueReference: item.action,
        impactAxis: 'strategy',
        issueCategory: 'strategy',
        issueSubtype: item.action,
        strategicSide: 'defense',
        severity: 'medium',
        followupMode: 'follow_through',
      }),
    )
  })

  caseGaps.slice(0, 1).forEach((item, index) => {
    questions.push(
      buildQuestion({
        prefix: 'defense',
        index: questions.length + index,
        role: 'defense',
        question: 'What additional proof or explanation can you add to close the gap seen in comparable cases?',
        whyThisQuestionMatters: item,
        linkedIssueOrEvidence: 'Similar-case evidence gap',
        issueType: 'similar_case_gap',
        issueReference: item,
        impactAxis: 'comparative_strength',
        issueCategory: 'similar_case_gap',
        issueSubtype: 'precedent_alignment',
        strategicSide: 'defense',
        severity: 'medium',
        followupMode: 'compare_and_close',
      }),
    )
  })

  return questions.slice(0, 6)
}

function buildProsecutionQuestions(caseAssessment, verdict) {
  const questions = []
  const contradictions = asArray(caseAssessment?.contradiction_points)
  const weaknessPoints = asArray(caseAssessment?.weakness_points)
  const riskLayer = asArray(verdict?.verdict_layers).find((layer) => layer.layer_name === 'Risk Layer')

  contradictions.slice(0, 2).forEach((item, index) => {
    questions.push(
      buildQuestion({
        prefix: 'prosecution',
        index,
        role: 'prosecution',
        question: `How would you answer if the other side presses on this contradiction: ${item.detail}?`,
        whyThisQuestionMatters:
          'An unresolved contradiction can materially weaken credibility and reduce confidence in the case theory.',
        linkedIssueOrEvidence: item.title || 'Contradiction signal',
        issueType: 'contradiction',
        issueReference: item.detail,
        impactAxis: 'contradiction_risk',
        issueCategory: 'timeline_contradiction',
        issueSubtype: item.title || 'contradiction',
        strategicSide: 'prosecution',
        severity: 'high',
        followupMode: 'pressure_probe',
      }),
    )
  })

  weaknessPoints.slice(0, 2).forEach((item, index) => {
    questions.push(
      buildQuestion({
        prefix: 'prosecution',
        index: questions.length + index,
        role: 'prosecution',
        question: `If the other side says "${item.detail}", what is your best answer?`,
        whyThisQuestionMatters:
          'This exposes whether the current record can survive challenge on weak facts or unclear evidence.',
        linkedIssueOrEvidence: item.title || 'Weakness point',
        issueType: 'opposing_attack',
        issueReference: item.detail,
        impactAxis: 'adversarial_pressure',
        issueCategory: 'credibility_attack',
        issueSubtype: item.title || 'weakness_point',
        strategicSide: 'prosecution',
        severity: 'medium',
        followupMode: 'challenge',
      }),
    )
  })

  if (riskLayer?.summary) {
    questions.push(
      buildQuestion({
        prefix: 'prosecution',
        index: questions.length,
        role: 'prosecution',
        question: 'Which answer from you would most reduce the current risk layer if challenged directly?',
        whyThisQuestionMatters: riskLayer.summary,
        linkedIssueOrEvidence: 'Risk Layer',
        issueType: 'risk_exposure',
        issueReference: riskLayer.summary,
        impactAxis: 'risk_flags',
        issueCategory: 'risk_exposure',
        issueSubtype: 'verdict_risk',
        strategicSide: 'prosecution',
        severity: 'high',
        followupMode: 'pressure_probe',
      }),
    )
  }

  return questions.slice(0, 6)
}

export function buildGeneratedQuestions({ caseAssessment = {}, verdict = {}, similarCaseIntelligence = {} }) {
  const defense = buildDefenseQuestions(caseAssessment, verdict, similarCaseIntelligence)
  const prosecution = buildProsecutionQuestions(caseAssessment, verdict)

  return {
    defense,
    prosecution,
  }
}

function buildGraphDrivenQuestions(graphContext = {}, existing = { defense: [], prosecution: [] }) {
  const unresolved = asArray(graphContext?.graph_issue_map).filter((item) => item.weakness_signal).slice(0, 2)
  const contradictions = asArray(graphContext?.graph_contradiction_summary).slice(0, 2)
  const missing = asArray(graphContext?.graph_missing_evidence_summary).slice(0, 2)

  const defense = [...asArray(existing.defense)]
  const prosecution = [...asArray(existing.prosecution)]

  unresolved.forEach((item, index) => {
    defense.push(
      buildQuestion({
        prefix: 'defense',
        index: defense.length + index,
        role: 'defense',
        question: `How will you resolve this unresolved issue: ${item.title}?`,
        whyThisQuestionMatters: item.summary || 'Graph indicates this issue remains weakly supported.',
        linkedIssueOrEvidence: item.title,
        issueType: 'graph_unresolved_issue',
        issueReference: item.title,
        impactAxis: 'graph_issue_support',
        issueCategory: 'graph_unresolved',
        issueSubtype: item.key || item.title,
        strategicSide: 'defense',
        severity: 'high',
        followupMode: 'evidence_probe',
      }),
    )
  })

  contradictions.forEach((item, index) => {
    prosecution.push(
      buildQuestion({
        prefix: 'prosecution',
        index: prosecution.length + index,
        role: 'prosecution',
        question: `What is your direct answer to this contradiction hotspot: ${item.label || item.summary}?`,
        whyThisQuestionMatters: item.summary || 'Graph contradiction path indicates a persistent weakness.',
        linkedIssueOrEvidence: item.label || 'Graph contradiction',
        issueType: 'graph_contradiction',
        issueReference: item.label || item.summary,
        impactAxis: 'graph_contradiction_risk',
        issueCategory: 'timeline_contradiction',
        issueSubtype: item.contradiction_key || 'graph_contradiction',
        strategicSide: 'prosecution',
        severity: 'high',
        followupMode: 'pressure_probe',
      }),
    )
  })

  missing.forEach((item, index) => {
    defense.push(
      buildQuestion({
        prefix: 'defense',
        index: defense.length + index,
        role: 'defense',
        question: `How will you address this missing-evidence chain: ${item.missing_label || 'missing evidence'}?`,
        whyThisQuestionMatters: `Graph cluster ${item.issue_cluster || 'unknown'} repeatedly shows this gap.`,
        linkedIssueOrEvidence: item.missing_label || 'Missing evidence cluster',
        issueType: 'graph_missing_evidence',
        issueReference: item.missing_label || item.issue_cluster || 'missing_evidence',
        impactAxis: 'graph_evidence_gap',
        issueCategory: 'document_support',
        issueSubtype: item.issue_cluster || 'graph_missing_evidence',
        strategicSide: 'defense',
        severity: 'high',
        followupMode: 'evidence_probe',
      }),
    )
  })

  return {
    defense: defense.slice(0, 6),
    prosecution: prosecution.slice(0, 6),
  }
}

function buildQuestionId(prefix, index, reference) {
  return `${prefix}-${index + 1}-${slugify(reference).slice(0, 28) || 'issue'}`
}

function normalizeGeneratedQuestion(item = {}, index = 0, role = 'defense') {
  const reference =
    item.issue_reference ||
    item.linked_issue_or_evidence ||
    item.question ||
    `${role}-issue-${index + 1}`
  const normalizedRole = role === 'prosecution' ? 'prosecution' : 'defense'
  const text = String(item.question || item.text || `Clarify the next ${normalizedRole} issue.`).trim()

  return {
    question_id: buildQuestionId(normalizedRole, index, reference),
    role: normalizedRole,
    side: normalizedRole === 'defense' ? 'supporting' : 'opposing',
    priority: String(item.priority || getPriority(item.issue_type)).trim(),
    text,
    question: text,
    rationale: String(
      item.rationale || item.why_this_question_matters || 'This question can materially affect the current case assessment.',
    ).trim(),
    why_this_question_matters: String(
      item.why_this_question_matters || item.rationale || 'This question can materially affect the current case assessment.',
    ).trim(),
    linked_issue_or_evidence: String(item.linked_issue_or_evidence || 'Current case issue').trim(),
    issue_type: String(item.issue_type || 'general').trim(),
    issue_reference: String(reference).trim(),
    impact_axis: String(item.impact_axis || 'credibility').trim(),
    issue_category: String(item.issue_category || item.issue_type || 'general').trim(),
    issue_subtype: String(item.issue_subtype || reference || item.issue_type || 'general').trim(),
    strategic_side: String(item.strategic_side || normalizedRole).trim(),
    severity: String(item.severity || item.priority || 'medium').trim(),
    followup_mode: String(item.followup_mode || 'clarify_and_test').trim(),
    dependency_on_previous_turn: String(item.dependency_on_previous_turn || '').trim(),
    suggested_answer: String(
      item.suggested_answer || 'Provide a concise, fact-supported answer tied to the present record.',
    ).trim(),
    answer_reasoning: String(
      item.answer_reasoning || 'A strong answer should be concrete, credible, and consistent with the current record.',
    ).trim(),
    risk_note: String(
      item.risk_note || 'Avoid unsupported statements or any answer that contradicts the current case facts.',
    ).trim(),
  }
}

function normalizeGroupedQuestions(grouped = {}) {
  const defense = asArray(grouped.defense_questions).map((item, index) =>
    normalizeGeneratedQuestion(item, index, 'defense'),
  )
  const prosecution = asArray(grouped.prosecution_questions).map((item, index) =>
    normalizeGeneratedQuestion(item, index, 'prosecution'),
  )

  return {
    defense,
    prosecution,
  }
}

function normalizeCluster(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function scoreQuestionForState(question = {}, sessionMemory = {}, latestAnswerRecord = null) {
  const unresolvedIssues = asArray(sessionMemory?.unresolved_issues)
  const currentFocus = String(sessionMemory?.current_focus || '').toLowerCase()
  const recentClusters = asArray(sessionMemory?.feedback_memory?.cluster_history).slice(-6)
  const graphIssueMap = asArray(sessionMemory?.graph_context?.graph_issue_map)
  const questionCluster = normalizeCluster(
    question.issue_category || question.issue_type || question.impact_axis,
  )
  const latestCluster = normalizeCluster(
    latestAnswerRecord?.question?.issue_category ||
      latestAnswerRecord?.question?.issue_type ||
      latestAnswerRecord?.question?.impact_axis,
  )
  const latestImpact = String(latestAnswerRecord?.answer_analysis?.strength_impact || '').toLowerCase()

  let score = 0

  if (questionCluster && currentFocus.includes(questionCluster.replace(/_/g, ' '))) score += 2
  if (unresolvedIssues.some((item) => normalizeCluster(item.issue).includes(questionCluster))) score += 1.5
  if (graphIssueMap.some((item) => normalizeCluster(item.title || item.key).includes(questionCluster))) score += 1.1
  if (recentClusters.some((item) => normalizeCluster(item.cluster_key) === questionCluster)) score -= 0.6
  if (latestCluster && latestCluster === questionCluster) {
    score += latestImpact === 'weakened' ? 2.2 : latestImpact === 'strengthened' ? -1.2 : 0.4
  }
  if (question.followup_mode === 'pressure_probe' && latestImpact === 'weakened') score += 0.8
  if (question.followup_mode === 'shift_to_next_gap' && latestImpact === 'strengthened') score += 1.1

  return score
}

export function rankQuestionsByState(questions = [], sessionMemory = {}, latestAnswerRecord = null) {
  return [...questions].sort(
    (left, right) =>
      scoreQuestionForState(right, sessionMemory, latestAnswerRecord) -
      scoreQuestionForState(left, sessionMemory, latestAnswerRecord),
  )
}

export async function generateDebateQuestions({
  caseInput = {},
  analysis = {},
  verdict = {},
  similarCaseIntelligence = {},
  sessionMemory = {},
  graphContext = {},
  latestAnswerRecord = null,
}) {
  const fallbackQuestionSetsBase = buildGeneratedQuestions({
    caseAssessment: analysis?.caseAssessment || {},
    verdict,
    similarCaseIntelligence,
  })
  const fallbackQuestionSets = buildGraphDrivenQuestions(
    graphContext,
    fallbackQuestionSetsBase,
  )
  const fallbackQuestions = flattenQuestionSets(fallbackQuestionSets)

  if (env.DEBATE_GENERATOR_FORCE_FALLBACK) {
    return {
      generatedQuestions: fallbackQuestions,
      questionSets: buildQuestionSets(fallbackQuestions),
      generationMeta: {
        source: 'forced_fallback',
        strategyNote: 'Fallback debate questions were forced by configuration.',
      },
    }
  }

  try {
    const generated = await runDebateQuestionGeneratorAgent({
      caseInput,
      analysis,
      verdict,
      similarCaseIntelligence,
      sessionMemory,
      latestAnswerRecord,
    })

    const grouped = normalizeGroupedQuestions(generated || {})
    const mergedWithGraph = buildGraphDrivenQuestions(graphContext, grouped)
    const merged = rankQuestionsByState(flattenQuestionSets(mergedWithGraph), sessionMemory, latestAnswerRecord)

    return {
      generatedQuestions: merged.length ? merged : fallbackQuestions,
      questionSets: {
        defense: rankQuestionsByState(
          mergedWithGraph.defense.length ? mergedWithGraph.defense : fallbackQuestionSets.defense,
          sessionMemory,
          latestAnswerRecord,
        ),
        prosecution: rankQuestionsByState(
          mergedWithGraph.prosecution.length ? mergedWithGraph.prosecution : fallbackQuestionSets.prosecution,
          sessionMemory,
          latestAnswerRecord,
        ),
      },
      generationMeta: {
        source: generated?.debateQuestionMeta?.source || 'llm',
        strategyNote: String(generated?.session_strategy_note || '').trim(),
        currentFocus:
          String(sessionMemory?.current_focus || '').trim() ||
          String(sessionMemory?.last_answer_review?.summary || '').trim() ||
          'pressure-test the highest unresolved issue',
      },
    }
  } catch (error) {
    return {
      generatedQuestions: fallbackQuestions,
      questionSets: buildQuestionSets(fallbackQuestions),
      generationMeta: {
        source: 'fallback',
        strategyNote: 'Fallback debate questions were used because dynamic generation was unavailable.',
        error: error?.message || String(error),
      },
    }
  }
}
