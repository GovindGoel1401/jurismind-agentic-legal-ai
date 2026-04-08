function asArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeRole(value = '') {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'prosecution' || normalized === 'opposing') return 'prosecution'
  return 'defense'
}

function toPriority(issueType = '') {
  const normalized = String(issueType || '').trim().toLowerCase()
  if (['missing_document', 'contradiction', 'risk_exposure'].includes(normalized)) return 'high'
  if (['weak_evidence', 'opposing_attack', 'prosecution_attack'].includes(normalized)) return 'medium'
  return 'medium'
}

function normalizeQuestion(question = {}) {
  const role = normalizeRole(question.role || question.side)
  return {
    ...question,
    role,
    side: role === 'defense' ? 'supporting' : 'opposing',
    priority: question.priority || toPriority(question.issue_type),
    text: String(question.text || question.question || '').trim(),
    question: String(question.question || question.text || '').trim(),
    rationale: String(question.rationale || question.why_this_question_matters || '').trim(),
    why_this_question_matters: String(
      question.why_this_question_matters || question.rationale || '',
    ).trim(),
  }
}

export function buildQuestionSets(questions = []) {
  const normalized = asArray(questions).map((question) => normalizeQuestion(question))
  return {
    defense: normalized.filter((question) => question.role === 'defense'),
    prosecution: normalized.filter((question) => question.role === 'prosecution'),
  }
}

export function flattenQuestionSets(questionSets = {}) {
  return [...asArray(questionSets.defense), ...asArray(questionSets.prosecution)]
}

export function findQuestionById(questionSets = {}, questionId = '', fallback = null) {
  if (!questionId) return fallback
  return flattenQuestionSets(questionSets).find((item) => item.question_id === questionId) || fallback
}

function pushIssue(target, item = {}) {
  const issue = String(item.issue || '').trim()
  if (!issue) return
  const key = `${issue.toLowerCase()}::${item.source || 'analysis'}`
  if (!target.some((existing) => existing._key === key)) {
    target.push({
      _key: key,
      issue,
      priority: item.priority || 'medium',
      source: item.source || 'analysis',
    })
  }
}

export function deriveUnresolvedIssues({
  analysis = {},
  verdict = {},
  latestAnswerReview = null,
}) {
  const issues = []
  const caseAssessment = analysis?.caseAssessment || {}

  asArray(caseAssessment?.missing_document_impact).slice(0, 3).forEach((item) => {
    pushIssue(issues, {
      issue: item?.label || item?.impact_reason || '',
      priority: 'high',
      source: 'evidence',
    })
  })

  asArray(caseAssessment?.contradiction_points).slice(0, 2).forEach((item) => {
    pushIssue(issues, {
      issue: item?.detail || item?.title || '',
      priority: 'high',
      source: 'analysis',
    })
  })

  asArray(caseAssessment?.weakness_points).slice(0, 2).forEach((item) => {
    pushIssue(issues, {
      issue: item?.detail || item?.title || '',
      priority: 'medium',
      source: 'analysis',
    })
  })

  asArray(verdict?.uncertainty_flags).slice(0, 2).forEach((item) => {
    pushIssue(issues, {
      issue: item,
      priority: 'medium',
      source: 'verdict',
    })
  })

  asArray(latestAnswerReview?.contradictions).forEach((item) => {
    pushIssue(issues, {
      issue: item,
      priority: 'high',
      source: 'debate',
    })
  })

  asArray(latestAnswerReview?.missing_evidence_signals).forEach((item) => {
    pushIssue(issues, {
      issue: item,
      priority: 'high',
      source: 'debate',
    })
  })

  return issues.slice(0, 8).map(({ _key, ...item }) => item)
}

export function deriveCurrentFocus(unresolvedIssues = [], latestAnswerReview = null) {
  if (latestAnswerReview?.missing_evidence_signals?.length) {
    return `Clarify and close the latest evidence gap: ${latestAnswerReview.missing_evidence_signals[0]}.`
  }
  if (latestAnswerReview?.contradictions?.length) {
    return `Resolve the latest contradiction: ${latestAnswerReview.contradictions[0]}.`
  }

  const highestPriority =
    unresolvedIssues.find((item) => item.priority === 'high') ||
    unresolvedIssues[0] ||
    null

  if (highestPriority) {
    return `Current focus: ${highestPriority.issue}`
  }

  return 'Current focus: pressure-test the strongest remaining issue in the case.'
}

export function buildRetrievalTrace({
  caseInput = {},
  analysis = {},
  verdict = {},
  similarCaseIntelligence = {},
  sessionMemory = {},
  generationMeta = {},
}) {
  return [
    {
      source: 'case_state',
      triggered: Boolean(caseInput?.description || caseInput?.caseText),
      note: 'Case facts are always included in debate generation.',
    },
    {
      source: 'analysis',
      triggered: Boolean(analysis?.caseAssessment || analysis?.pipelineTrace?.length),
      note: 'Analysis findings are used to derive unresolved issues and stress points.',
    },
    {
      source: 'verdict',
      triggered: Boolean(verdict && Object.keys(verdict).length),
      note: 'Verdict posture influences question framing and scenario updates.',
    },
    {
      source: 'similar_cases',
      triggered: Boolean(similarCaseIntelligence?.similar_cases?.length),
      note: 'Similar-case gaps can shape follow-up questions when useful.',
    },
    {
      source: 'feedback_memory',
      triggered: Boolean(sessionMemory?.feedback_memory?.auto_retrieval_triggered),
      note:
        sessionMemory?.feedback_memory?.last_route_reason ||
        'Feedback memory remains secondary and only triggers selectively.',
      lesson_count: asArray(sessionMemory?.feedback_memory?.retrieved_lessons).length,
    },
    {
      source: 'generation',
      triggered: true,
      note:
        generationMeta?.strategyNote ||
        'Question generation uses current case state and prior turns.',
      mode: generationMeta?.source || 'llm',
    },
  ]
}

export function buildPublicQuestion(question = null) {
  if (!question) return null
  const normalized = normalizeQuestion(question)
  return {
    id: normalized.question_id,
    question_id: normalized.question_id,
    role: normalized.role,
    side: normalized.side,
    text: normalized.text || normalized.question,
    question: normalized.question || normalized.text,
    priority: normalized.priority || 'medium',
    rationale: normalized.rationale || normalized.why_this_question_matters,
    why_this_question_matters: normalized.why_this_question_matters || normalized.rationale,
    linked_issue_or_evidence: normalized.linked_issue_or_evidence || 'Current case issue',
    issue_type: normalized.issue_type || 'general',
    issue_reference: normalized.issue_reference || normalized.linked_issue_or_evidence || '',
    impact_axis: normalized.impact_axis || 'credibility',
    issue_category: normalized.issue_category || normalized.issue_type || 'general',
    issue_subtype: normalized.issue_subtype || normalized.issue_reference || normalized.issue_type || 'general',
    strategic_side: normalized.strategic_side || normalized.role,
    severity: normalized.severity || normalized.priority || 'medium',
    followup_mode: normalized.followup_mode || 'clarify_and_test',
    dependency_on_previous_turn: normalized.dependency_on_previous_turn || '',
  }
}

export function buildDebateSummary({
  currentFocus = '',
  unresolvedIssues = [],
  turns = [],
}) {
  if (asArray(turns).length) {
    return `Debate is active with ${turns.length} answered turn(s). ${currentFocus || 'Keep testing unresolved issues.'}`
  }

  if (unresolvedIssues.length) {
    return `Debate opened with ${unresolvedIssues.length} unresolved issue(s). ${currentFocus || ''}`.trim()
  }

  return 'Debate opened. Start with the highest-priority question and answer it as specifically as possible.'
}
