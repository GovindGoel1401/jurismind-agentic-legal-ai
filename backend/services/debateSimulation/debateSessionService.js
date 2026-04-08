import {
  buildAnswerAnalysis,
  buildAnswerReview,
  buildSelectedAnswerAnalysis,
  evaluateCustomAnswer,
} from './answerAnalysisService.js'
import { generateDebateQuestions } from './questionGenerationService.js'
import { buildScenarioUpdate } from './scenarioUpdateService.js'
import {
  buildDebateSummary,
  buildPublicQuestion,
  buildQuestionSets,
  buildRetrievalTrace,
  deriveCurrentFocus,
  deriveUnresolvedIssues,
  findQuestionById,
  flattenQuestionSets,
} from './debateStateService.js'
import {
  buildFeedbackMemoryRouteDecision,
  buildSatisfactionGate,
  compressFeedbackLessons,
  resolveFeedbackContinuityCategory,
  updateContinuityTracker,
  buildIssueClusterKey,
  updateClusterWindow,
} from '../feedbackIntelligence/feedbackMemoryRoutingService.js'
import { retrieveFeedbackMemoryContext } from '../feedbackIntelligence/feedbackMemoryService.js'
import { env } from '../../config/envConfig.js'
import { buildDebateIssueCluster } from '../legalSignalSynthesisService.js'
import { buildGraphContext } from '../graphContextBuilderService.js'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeText(value) {
  return String(value || '').trim()
}

function buildInitialWorkingState(caseAssessment = {}, verdict = {}) {
  return {
    case_strength_score: Number(
      caseAssessment?.case_strength_score || verdict?.supporting_context?.case_strength_score || 0.5,
    ),
    win_probability: Number(verdict?.win_probability || verdict?.probability?.userWin || 0.5),
    confidence_score: Number(verdict?.confidence_score || verdict?.confidence || 0.5),
    risk_flags: asArray(verdict?.uncertainty_flags),
    recommendations: asArray(verdict?.improvement_actions).map((item) => item.action),
    debate_posture: {
      supporting_side: 'The supporting side starts from the current verdict and evidence package.',
      opposing_side: 'The opposing side starts from the current risk and contradiction signals.',
    },
  }
}

function buildInitialFeedbackMemoryState(caseInput = {}) {
  return {
    satisfaction_gate: buildSatisfactionGate(),
    continuity_tracker: {
      last_category: '',
      consecutive_count: 0,
      should_retrieve: false,
      retrieval_trigger: '',
    },
    retrieved_lessons: [],
    auto_retrieval_triggered: false,
    last_route_reason: 'not_triggered',
    cluster_history: [],
    recent_cluster_window: [],
    case_context: {
      category: String(caseInput?.category || '').trim(),
      jurisdiction: String(caseInput?.jurisdiction || '').trim(),
    },
  }
}

function countClusterOccurrences(clusterHistory = [], clusterKey = '') {
  const normalized = String(clusterKey || '').trim().toLowerCase()
  if (!normalized) return 0
  return (Array.isArray(clusterHistory) ? clusterHistory : []).filter(
    (item) => String(item?.cluster_key || '').trim().toLowerCase() === normalized,
  ).length
}

function buildClusterRiskFlags(clusterHistory = [], currentCluster = '', unresolvedIssues = []) {
  const clusterCount = countClusterOccurrences(clusterHistory, currentCluster.cluster_key)
  const unresolvedText = unresolvedIssues.map((item) => `${item.issue}`.toLowerCase()).join(' ')
  const repeatedCritical = clusterCount >= 5 || clusterCount >= 3
  const unresolvedCriticalCluster = currentCluster?.issue_category
    ? unresolvedText.includes(String(currentCluster.issue_category).replace(/_/g, ' '))
    : false

  return {
    repeatedWeaknessOnCluster: repeatedCritical,
    unresolvedCriticalCluster,
  }
}

function buildDebateContext(caseInput = {}, analysis = {}, verdict = {}, similarCaseIntelligence = {}) {
  return {
    case_input: caseInput,
    analysis,
    verdict,
    similar_case_intelligence: similarCaseIntelligence,
  }
}

function attachAnswerAnalyses(generatedQuestions = []) {
  return generatedQuestions.map((question) => ({
    ...question,
    answer_analysis: buildAnswerAnalysis(question),
  }))
}

function buildSessionId(caseInput = {}, caseId = '') {
  if (caseId) return `debate-${caseId}`
  const category = String(caseInput?.category || 'general').toLowerCase().replace(/\s+/g, '-')
  const jurisdiction = String(caseInput?.jurisdiction || 'unknown').toLowerCase().replace(/\s+/g, '-')
  return `debate-${category}-${jurisdiction}`
}

function normalizeQuestionBank(questionBank = []) {
  return attachAnswerAnalyses(
    asArray(questionBank).map((question) => ({
      ...question,
      question: normalizeText(question?.question || question?.text),
      text: normalizeText(question?.text || question?.question),
    })),
  )
}

function buildLegacyTurns(answerHistory = []) {
  return asArray(answerHistory).map((record, index) => ({
    turn_id: `turn-${index + 1}`,
    question_id: String(record?.question_id || ''),
    role: record?.side === 'opposing' ? 'prosecution' : 'defense',
    question: normalizeText(record?.question),
    user_answer: normalizeText(record?.answer_text),
    answer_analysis: {
      summary: normalizeText(record?.answer_effect?.reasoning || 'The answer updated the debate scenario.'),
      new_facts: [],
      contradictions: [],
      missing_evidence_signals: [],
      strength_impact:
        record?.answer_effect?.impact === 'strengthens'
          ? 'strengthened'
          : record?.answer_effect?.impact === 'weakens'
            ? 'weakened'
            : 'neutral',
      notes: normalizeText(record?.answer_effect?.risk_note),
    },
    agent_comment: normalizeText(record?.scenario_update?.scenario_delta_summary),
    scenario_update: record?.scenario_update || null,
    timestamp: record?.timestamp || new Date().toISOString(),
  }))
}

function chooseNextQuestion(questionSets = {}, latestQuestion = null, latestAnswerReview = null) {
  const defenseQuestions = asArray(questionSets?.defense)
  const prosecutionQuestions = asArray(questionSets?.prosecution)
  const preferredRole =
    latestQuestion?.role === 'defense'
      ? 'prosecution'
      : latestQuestion?.role === 'prosecution'
        ? 'defense'
        : latestAnswerReview?.strength_impact === 'weakened'
          ? 'defense'
          : 'prosecution'

  if (preferredRole === 'prosecution' && prosecutionQuestions.length) return prosecutionQuestions[0]
  if (preferredRole === 'defense' && defenseQuestions.length) return defenseQuestions[0]
  return defenseQuestions[0] || prosecutionQuestions[0] || null
}

function buildStatus({ analysis = {}, verdict = {}, turns = [] }) {
  if (asArray(turns).length) return 'active'
  if (analysis && Object.keys(analysis).length) return 'active'
  if (verdict && Object.keys(verdict).length) return 'active'
  return 'fallback'
}

function hydrateSessionMemory({
  caseId = '',
  caseInput = {},
  analysis = {},
  verdict = {},
  similarCaseIntelligence = {},
  sessionMemory = null,
}) {
  const baseContext = buildDebateContext(caseInput, analysis, verdict, similarCaseIntelligence)
  const debateSessionId =
    normalizeText(sessionMemory?.debate_session_id || sessionMemory?.session_id) ||
    buildSessionId(caseInput, caseId)

  const legacyQuestionBank =
    asArray(sessionMemory?.question_bank).length
      ? sessionMemory.question_bank
      : asArray(sessionMemory?.generated_questions)
  const questionBank = normalizeQuestionBank(legacyQuestionBank)
  const questionSets =
    sessionMemory?.question_sets && Object.keys(sessionMemory.question_sets).length
      ? {
          defense: normalizeQuestionBank(sessionMemory.question_sets.defense),
          prosecution: normalizeQuestionBank(sessionMemory.question_sets.prosecution),
        }
      : buildQuestionSets(questionBank)

  const turns = asArray(sessionMemory?.turns).length
    ? asArray(sessionMemory.turns)
    : buildLegacyTurns(sessionMemory?.answer_history)

  const selectedQuestionId = normalizeText(
    sessionMemory?.current_question_id ||
      sessionMemory?.selected_question_id ||
      sessionMemory?.current_question?.question_id,
  )
  const currentQuestion =
    findQuestionById(questionSets, selectedQuestionId, questionBank[0] || null) || null
  const lastAnswerReview = sessionMemory?.last_answer_review || null
  const unresolvedIssues =
    asArray(sessionMemory?.unresolved_issues).length
      ? asArray(sessionMemory.unresolved_issues)
      : deriveUnresolvedIssues({
          analysis,
          verdict,
          latestAnswerReview: lastAnswerReview,
        })
  const currentFocus =
    normalizeText(sessionMemory?.current_focus) ||
    deriveCurrentFocus(unresolvedIssues, lastAnswerReview)

  return {
    debate_session_id: debateSessionId,
    session_id: debateSessionId,
    case_id: String(caseId || sessionMemory?.case_id || '').trim(),
    status: sessionMemory?.status || buildStatus({ analysis, verdict, turns }),
    current_focus: currentFocus,
    unresolved_issues: unresolvedIssues,
    current_question_id: currentQuestion?.question_id || selectedQuestionId || '',
    selected_question_id: currentQuestion?.question_id || selectedQuestionId || '',
    current_question: currentQuestion,
    question_sets: questionSets,
    generated_questions: questionBank,
    question_bank: questionBank,
    turns,
    answer_history: turns,
    scenario_changes: asArray(sessionMemory?.scenario_changes),
    last_answer_review: lastAnswerReview,
    latest_answer_analysis: sessionMemory?.latest_answer_analysis || null,
    working_state:
      sessionMemory?.working_state ||
      buildInitialWorkingState(analysis?.caseAssessment || {}, verdict || {}),
    feedback_memory: {
      ...buildInitialFeedbackMemoryState(caseInput),
      ...(sessionMemory?.feedback_memory || {}),
      case_context: {
        category:
          sessionMemory?.feedback_memory?.case_context?.category ||
          String(caseInput?.category || '').trim(),
        jurisdiction:
          sessionMemory?.feedback_memory?.case_context?.jurisdiction ||
          String(caseInput?.jurisdiction || '').trim(),
      },
    },
    debate_context: sessionMemory?.debate_context || baseContext,
    graph_context: sessionMemory?.graph_context || null,
    retrieval_trace: asArray(sessionMemory?.retrieval_trace),
    debate_summary: normalizeText(sessionMemory?.debate_summary),
    updated_at: sessionMemory?.updated_at || new Date().toISOString(),
  }
}

function buildSessionResponse(sessionMemory = {}, generationMeta = null, extras = {}) {
  return {
    debate_session_id: sessionMemory.debate_session_id,
    case_id: sessionMemory.case_id || '',
    status: sessionMemory.status || 'active',
    current_focus: sessionMemory.current_focus || '',
    debate_summary: sessionMemory.debate_summary || '',
    current_question: buildPublicQuestion(sessionMemory.current_question),
    question_sets: {
      defense: asArray(sessionMemory.question_sets?.defense).map((question) => buildPublicQuestion(question)),
      prosecution: asArray(sessionMemory.question_sets?.prosecution).map((question) =>
        buildPublicQuestion(question),
      ),
    },
    generated_questions: asArray(sessionMemory.generated_questions).map((question) =>
      buildPublicQuestion(question),
    ),
    question_bank: asArray(sessionMemory.question_bank),
    turns: asArray(sessionMemory.turns),
    timeline: asArray(sessionMemory.turns),
    unresolved_issues: asArray(sessionMemory.unresolved_issues),
    last_answer_review: sessionMemory.last_answer_review || null,
    retrieval_trace: asArray(sessionMemory.retrieval_trace),
    session_memory: sessionMemory,
    generation_meta: generationMeta,
    ...extras,
  }
}

export async function initializeDebateSession({
  caseId = '',
  caseInput = {},
  analysis = {},
  verdict = {},
  similarCaseIntelligence = {},
  sessionMemory = null,
}) {
  const baseSessionMemory = hydrateSessionMemory({
    caseId,
    caseInput,
    analysis,
    verdict,
    similarCaseIntelligence,
    sessionMemory,
  })

  const latestTurn = asArray(baseSessionMemory.turns).slice(-1)[0] || null
  const graphContext = await buildGraphContext({ caseId, limit: 6 })
  const unresolvedFromGraph = asArray(graphContext?.graph_issue_map)
    .filter((item) => item?.weakness_signal)
    .slice(0, 4)
    .map((item) => ({ issue: item.title || item.key || '', priority: 'high', source: 'graph' }))
  const questionGeneration = await generateDebateQuestions({
    caseInput,
    analysis,
    verdict,
    similarCaseIntelligence,
    sessionMemory: baseSessionMemory,
    graphContext,
    latestAnswerRecord: latestTurn,
  })

  const questionsWithAnalyses = attachAnswerAnalyses(questionGeneration.generatedQuestions)
  const questionSets = buildQuestionSets(questionsWithAnalyses)
  const unresolvedIssues = deriveUnresolvedIssues({
    analysis,
    verdict,
    latestAnswerReview: baseSessionMemory.last_answer_review,
  })
  const mergedUnresolved = [...unresolvedIssues, ...unresolvedFromGraph]
    .filter((item) => String(item?.issue || '').trim())
    .slice(0, 10)
  const currentFocus = deriveCurrentFocus(unresolvedIssues, baseSessionMemory.last_answer_review)
  const currentQuestion =
    findQuestionById(
      questionSets,
      baseSessionMemory.current_question_id || baseSessionMemory.selected_question_id,
      questionsWithAnalyses[0] || null,
    ) ||
    questionsWithAnalyses[0] ||
    null
  const nextSessionMemory = {
    ...baseSessionMemory,
    question_sets: questionSets,
    generated_questions: questionsWithAnalyses,
    question_bank: questionsWithAnalyses,
    current_question_id: currentQuestion?.question_id || '',
    selected_question_id: currentQuestion?.question_id || '',
    current_question: currentQuestion,
    unresolved_issues: mergedUnresolved,
    graph_context: graphContext,
    current_focus: currentFocus,
    retrieval_trace: buildRetrievalTrace({
      caseInput,
      analysis,
      verdict,
      similarCaseIntelligence,
      sessionMemory: baseSessionMemory,
      generationMeta: questionGeneration.generationMeta,
    }),
    debate_summary: buildDebateSummary({
      currentFocus,
      unresolvedIssues,
      turns: baseSessionMemory.turns,
    }),
    updated_at: new Date().toISOString(),
  }

  return buildSessionResponse(nextSessionMemory, questionGeneration.generationMeta)
}

export async function selectDebateQuestion({
  caseId = '',
  questionId,
  caseInput = {},
  analysis = {},
  verdict = {},
  similarCaseIntelligence = {},
  sessionMemory = {},
}) {
  const hydrated = hydrateSessionMemory({
    caseId,
    caseInput,
    analysis,
    verdict,
    similarCaseIntelligence,
    sessionMemory,
  })
  const selectedQuestion =
    findQuestionById(hydrated.question_sets, questionId, null) ||
    hydrated.question_bank.find((question) => question.question_id === questionId) ||
    null

  if (!selectedQuestion) {
    return {
      error: 'Question not found in the current debate session.',
    }
  }

  const nextSessionMemory = {
    ...hydrated,
    current_question_id: selectedQuestion.question_id,
    selected_question_id: selectedQuestion.question_id,
    current_question: selectedQuestion,
    updated_at: new Date().toISOString(),
  }

  return buildSessionResponse(nextSessionMemory, null)
}

export async function applyDebateAnswer({
  caseId = '',
  questionId,
  selectedAnswerOptionId,
  customAnswer = '',
  caseInput = {},
  analysis = {},
  verdict = {},
  similarCaseIntelligence = {},
  sessionMemory = {},
}) {
  const hydrated = hydrateSessionMemory({
    caseId,
    caseInput,
    analysis,
    verdict,
    similarCaseIntelligence,
    sessionMemory,
  })
  const selectedQuestion =
    findQuestionById(hydrated.question_sets, questionId, null) ||
    hydrated.question_bank.find((item) => item.question_id === questionId) ||
    null

  if (!selectedQuestion) {
    return {
      error: 'Question not found in the current debate session.',
    }
  }

  const answerAnalysis = selectedQuestion.answer_analysis || buildAnswerAnalysis(selectedQuestion)
  const selectedOption = asArray(answerAnalysis.answer_options).find(
    (option) => option.option_id === selectedAnswerOptionId,
  )
  const customAnswerText = normalizeText(customAnswer)

  const answerEffect = customAnswerText
    ? evaluateCustomAnswer(selectedQuestion, customAnswerText)
    : {
        impact: selectedOption?.impact || 'neutral',
        score:
          selectedOption?.impact === 'strengthens'
            ? 0.08
            : selectedOption?.impact === 'weakens'
              ? -0.07
              : 0.02,
        reasoning: selectedOption?.reasoning || answerAnalysis.answer_reasoning,
        risk_note: answerAnalysis.risk_note,
      }

  const chosenAnswerText = customAnswerText || selectedOption?.text || answerAnalysis.best_fit_answer
  const answerReview = buildAnswerReview({
    question: selectedQuestion,
    answerText: chosenAnswerText,
    answerEffect,
    selectedOption,
  })
  const currentCluster = buildDebateIssueCluster(selectedQuestion, answerReview)
  const selectedAnswerAnalysis = buildSelectedAnswerAnalysis(
    answerAnalysis,
    chosenAnswerText,
    customAnswerText ? 'custom' : 'suggested',
    customAnswerText ? answerEffect : null,
  )

  const { scenario_update, next_working_state } = buildScenarioUpdate({
    question: selectedQuestion,
    answerEffect,
    sessionMemory: hydrated,
    answerText: chosenAnswerText,
  })

  const previousClusterHistory = asArray(hydrated?.feedback_memory?.cluster_history)
  const nextClusterHistory = [
    ...previousClusterHistory,
    {
      ...currentCluster,
      turn_id: `turn-${hydrated.turns.length + 1}`,
      question_id: selectedQuestion.question_id,
      strength_impact: answerReview.strength_impact,
      timestamp: new Date().toISOString(),
    },
  ].slice(-20)
  const recentClusterWindow = updateClusterWindow(
    hydrated?.feedback_memory?.recent_cluster_window || previousClusterHistory.map((item) => item.cluster_key),
    currentCluster.cluster_key,
    10,
  )
  const clusterRisk = buildClusterRiskFlags(nextClusterHistory, currentCluster, hydrated?.unresolved_issues || [])

  const turnRecord = {
    turn_id: `turn-${hydrated.turns.length + 1}`,
    question_id: selectedQuestion.question_id,
    role: selectedQuestion.role,
    side: selectedQuestion.side,
    question: selectedQuestion.question,
    user_answer: chosenAnswerText,
    answer_source: customAnswerText ? 'custom' : 'suggested',
    answer_text: chosenAnswerText,
    answer_effect: answerEffect,
    answer_analysis: answerReview,
    agent_comment: scenario_update?.scenario_delta_summary || answerReview.summary,
    scenario_update,
    timestamp: new Date().toISOString(),
  }

  const caseContext = hydrated?.feedback_memory?.case_context || {}
  const continuityCategory = resolveFeedbackContinuityCategory({
    question: selectedQuestion,
    caseInput: caseContext,
    answerEffect,
  })
  const continuityTracker = updateContinuityTracker(
    hydrated?.feedback_memory?.continuity_tracker || {},
    continuityCategory,
  )
  const feedbackRoute = buildFeedbackMemoryRouteDecision({
    satisfactionStatus: 'unknown',
    continuityTracker,
    featureEnabled: env.FEEDBACK_MEMORY_ENABLED,
    recentClusterWindow,
    currentCluster: currentCluster.cluster_key,
    repeatedWeaknessOnCluster: clusterRisk.repeatedWeaknessOnCluster && answerReview.strength_impact === 'weakened',
    unresolvedCriticalCluster: clusterRisk.unresolvedCriticalCluster,
  })
  let retrievedLessons = compressFeedbackLessons(
    asArray(hydrated?.feedback_memory?.retrieved_lessons),
  )

  if (feedbackRoute.should_retrieve) {
    const retrieval = await retrieveFeedbackMemoryContext({
      queryText: [selectedQuestion.question, chosenAnswerText, answerEffect.reasoning].filter(Boolean).join(' '),
      lessonCategory: continuityCategory,
      linkedFeatureOrAgent: 'debate_simulation',
      topK: 3,
    })

    if (retrieval.compressed_lessons.length) {
      retrievedLessons = retrieval.compressed_lessons
    }
  }

  const nextSessionMemoryBase = {
    ...hydrated,
    turns: [...asArray(hydrated.turns), turnRecord],
    answer_history: [...asArray(hydrated.turns), turnRecord],
    scenario_changes: [...asArray(hydrated.scenario_changes), scenario_update],
    latest_answer_analysis: selectedAnswerAnalysis,
    last_answer_review: answerReview,
    working_state: next_working_state,
    feedback_memory: {
      ...buildInitialFeedbackMemoryState(caseContext),
      ...(hydrated?.feedback_memory || {}),
      continuity_tracker: continuityTracker,
      retrieved_lessons: retrievedLessons,
      auto_retrieval_triggered: feedbackRoute.should_retrieve,
      last_route_reason: feedbackRoute.reason,
      cluster_history: nextClusterHistory,
      recent_cluster_window: recentClusterWindow,
    },
    graph_context: hydrated?.graph_context || (await buildGraphContext({ caseId, limit: 6 })),
    updated_at: new Date().toISOString(),
  }

  const debateContext = nextSessionMemoryBase.debate_context || {}
  const regeneratedQuestions = await generateDebateQuestions({
    caseInput: debateContext.case_input || caseInput,
    analysis: debateContext.analysis || analysis || {},
    verdict: debateContext.verdict || verdict || {},
    similarCaseIntelligence:
      debateContext.similar_case_intelligence || similarCaseIntelligence || {},
    sessionMemory: nextSessionMemoryBase,
    graphContext: nextSessionMemoryBase.graph_context || {},
    latestAnswerRecord: turnRecord,
  })
  const refreshedQuestionBank = attachAnswerAnalyses(regeneratedQuestions.generatedQuestions)
  const refreshedQuestionSets = buildQuestionSets(refreshedQuestionBank)
  const unresolvedIssues = deriveUnresolvedIssues({
    analysis: debateContext.analysis || analysis || {},
    verdict: debateContext.verdict || verdict || {},
    latestAnswerReview: answerReview,
  })
  const graphUnresolved = asArray(nextSessionMemoryBase.graph_context?.graph_issue_map)
    .filter((item) => item?.weakness_signal)
    .slice(0, 4)
    .map((item) => ({ issue: item.title || item.key || '', priority: 'high', source: 'graph' }))
  const mergedUnresolved = [...unresolvedIssues, ...graphUnresolved]
    .filter((item) => String(item?.issue || '').trim())
    .slice(0, 10)
  const currentFocus = deriveCurrentFocus(unresolvedIssues, answerReview)
  const currentQuestion = chooseNextQuestion(
    refreshedQuestionSets,
    selectedQuestion,
    answerReview,
  )

  const nextSessionMemory = {
    ...nextSessionMemoryBase,
    question_sets: refreshedQuestionSets,
    generated_questions: refreshedQuestionBank,
    question_bank: refreshedQuestionBank,
    current_question_id: currentQuestion?.question_id || '',
    selected_question_id: currentQuestion?.question_id || '',
    current_question: currentQuestion,
    unresolved_issues: mergedUnresolved,
    current_focus: currentFocus,
    status: 'active',
    retrieval_trace: buildRetrievalTrace({
      caseInput: debateContext.case_input || caseInput,
      analysis: debateContext.analysis || analysis || {},
      verdict: debateContext.verdict || verdict || {},
      similarCaseIntelligence:
        debateContext.similar_case_intelligence || similarCaseIntelligence || {},
      sessionMemory: nextSessionMemoryBase,
      generationMeta: regeneratedQuestions.generationMeta,
    }),
    debate_summary: buildDebateSummary({
      currentFocus,
      unresolvedIssues,
      turns: [...asArray(nextSessionMemoryBase.turns)],
    }),
    updated_at: new Date().toISOString(),
  }

  return buildSessionResponse(nextSessionMemory, regeneratedQuestions.generationMeta, {
    answer_analysis: selectedAnswerAnalysis,
    last_answer_review: answerReview,
    scenario_update,
    feedback_memory: nextSessionMemory.feedback_memory,
  })
}
