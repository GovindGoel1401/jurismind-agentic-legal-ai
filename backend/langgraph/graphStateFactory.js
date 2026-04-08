function asArray(value) {
  return Array.isArray(value) ? value : []
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function normalizeGraphStageResult(stageResult = {}) {
  const next = {
    ...stageResult,
  }

  if ('knowledge_bundle' in stageResult && !('retrievedKnowledge' in stageResult)) {
    next.retrievedKnowledge = asObject(stageResult.knowledge_bundle)
  }

  if ('retrieval_routing' in stageResult && !('retrievalRouting' in stageResult)) {
    next.retrievalRouting = asObject(stageResult.retrieval_routing)
  }

  if ('retrieval_context' in stageResult && !('retrievalContext' in stageResult)) {
    next.retrievalContext = asObject(stageResult.retrieval_context)
  }

  if ('defenseArguments' in stageResult && !('defense_arguments' in stageResult)) {
    next.defense_arguments = asArray(stageResult.defenseArguments)
  }

  if ('prosecutionArguments' in stageResult && !('prosecution_arguments' in stageResult)) {
    next.prosecution_arguments = asArray(stageResult.prosecutionArguments)
  }

  if ('rebuttal' in stageResult && !('rebuttal_points' in stageResult)) {
    next.rebuttal_points = asArray(stageResult.rebuttal)
  }

  if ('judgeReasoningObject' in stageResult) {
    const judgeReasoningObject = asObject(stageResult.judgeReasoningObject)
    if (!('reasoning' in stageResult) && judgeReasoningObject.reasoning) {
      next.reasoning = judgeReasoningObject.reasoning
    }
    if (!('judgeReasoning' in stageResult) && judgeReasoningObject.reasoning) {
      next.judgeReasoning = judgeReasoningObject.reasoning
    }
    if (!('win_probability_user' in stageResult) && judgeReasoningObject.win_probability_user != null) {
      next.win_probability_user = judgeReasoningObject.win_probability_user
    }
    if (!('win_probability_opponent' in stageResult) && judgeReasoningObject.win_probability_opponent != null) {
      next.win_probability_opponent = judgeReasoningObject.win_probability_opponent
    }
    if (!('settlement_probability' in stageResult) && judgeReasoningObject.settlement_probability != null) {
      next.settlement_probability = judgeReasoningObject.settlement_probability
    }
  }

  return next
}

export function normalizeGraphStateSnapshot(state = {}) {
  const normalized = normalizeGraphStageResult(state)

  return {
    caseInput: normalized.caseInput || {},
    feedbackLearning: normalized.feedbackLearning || {},
    structuredCase: asObject(normalized.structuredCase),
    evidenceAnalysis: asObject(normalized.evidenceAnalysis),
    retrievedKnowledge: asObject(normalized.retrievedKnowledge),
    retrievalRouting: asObject(normalized.retrievalRouting),
    retrievalContext: asObject(normalized.retrievalContext),
    defense_arguments: asArray(normalized.defense_arguments),
    prosecution_arguments: asArray(normalized.prosecution_arguments),
    rebuttal_points: asArray(normalized.rebuttal_points),
    verdict: asObject(normalized.verdict),
    reflection: asObject(normalized.reflection),
    ...normalized,
  }
}

function createBaseState(caseInput, feedbackLearning) {
  return normalizeGraphStateSnapshot({
    caseInput,
    feedbackLearning,
  })
}

export function createInitialGraphState(input) {
  const caseInput = input?.caseInput || {}
  const feedbackLearning = input?.feedbackLearning || {}

  return normalizeGraphStateSnapshot({
    ...createBaseState(caseInput, feedbackLearning),
    structuredCase: {},
    evidenceAnalysis: {},
    retrievedKnowledge: {},
    retrievalRouting: {},
    retrievalContext: {},
    defense_arguments: [],
    prosecution_arguments: [],
    rebuttal_points: [],
    verdict: {},
    reflection: {},
  })
}

export function mergeStageState(previousState, stageResult) {
  return normalizeGraphStateSnapshot({
    ...previousState,
    ...normalizeGraphStageResult(stageResult || {}),
  })
}
