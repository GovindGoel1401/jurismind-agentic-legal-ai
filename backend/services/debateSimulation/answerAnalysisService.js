function normalizeText(value) {
  return String(value || '').trim()
}

function lower(value) {
  return normalizeText(value).toLowerCase()
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function buildOptions(question) {
  switch (question?.issue_type) {
    case 'missing_document':
      return [
        {
          option_id: `${question.question_id}-opt-1`,
          text: 'I can provide the document or a closely equivalent record that proves the same point.',
          impact: 'strengthens',
          reasoning: 'Direct documentary proof closes a known evidence gap and improves case support.',
        },
        {
          option_id: `${question.question_id}-opt-2`,
          text: 'I cannot provide the document now, but I can explain where it can be obtained and provide supporting secondary proof.',
          impact: 'mixed',
          reasoning: 'This helps, but the case remains somewhat exposed until the document or equivalent proof is actually available.',
        },
        {
          option_id: `${question.question_id}-opt-3`,
          text: 'I do not have the document and there is no clear substitute.',
          impact: 'weakens',
          reasoning: 'This keeps the evidence gap open and may reduce confidence in the case theory.',
        },
      ]
    case 'contradiction':
      return [
        {
          option_id: `${question.question_id}-opt-1`,
          text: 'I can clarify the timeline or facts and reconcile the apparent inconsistency with specific details.',
          impact: 'strengthens',
          reasoning: 'A precise clarification reduces contradiction risk and improves credibility.',
        },
        {
          option_id: `${question.question_id}-opt-2`,
          text: 'There may be partial inconsistency, but I can explain the context and supporting facts.',
          impact: 'mixed',
          reasoning: 'This can limit damage, though it still leaves some contestable ground.',
        },
        {
          option_id: `${question.question_id}-opt-3`,
          text: 'I am not sure how to reconcile the inconsistency.',
          impact: 'weakens',
          reasoning: 'An unresolved contradiction can directly weaken the position and lower confidence.',
        },
      ]
    case 'weak_evidence':
    case 'opposing_attack':
    case 'prosecution_attack':
      return [
        {
          option_id: `${question.question_id}-opt-1`,
          text: 'I can support this point with corroborating records, messages, payments, or witness-backed details.',
          impact: 'strengthens',
          reasoning: 'Corroboration improves reliability and makes the case harder to challenge.',
        },
        {
          option_id: `${question.question_id}-opt-2`,
          text: 'I can explain the fact clearly, but I have limited corroboration.',
          impact: 'mixed',
          reasoning: 'This may preserve coherence, but the fact remains vulnerable under challenge.',
        },
        {
          option_id: `${question.question_id}-opt-3`,
          text: 'I only have a general explanation and no reliable support.',
          impact: 'weakens',
          reasoning: 'Unsupported explanations are easier for the opposing side to attack.',
        },
      ]
    default:
      return [
        {
          option_id: `${question.question_id}-opt-1`,
          text: 'I can give a precise answer supported by facts or records.',
          impact: 'strengthens',
          reasoning: 'Specific supported answers improve preparedness and lower ambiguity.',
        },
        {
          option_id: `${question.question_id}-opt-2`,
          text: 'I can answer partially, but some details still need support.',
          impact: 'mixed',
          reasoning: 'Partially supported answers can help, but they do not fully stabilize the issue.',
        },
        {
          option_id: `${question.question_id}-opt-3`,
          text: 'I am uncertain and do not have clear support for this answer.',
          impact: 'weakens',
          reasoning: 'Uncertainty keeps risk live and may reduce confidence in the overall case.',
        },
      ]
  }
}

function buildRiskNote(question) {
  if (question?.issue_type === 'contradiction') {
    return 'Be careful not to repeat or deepen the inconsistency. A vague answer here can increase contradiction risk immediately.'
  }
  if (question?.issue_type === 'missing_document') {
    return 'Do not overstate availability of records you cannot actually produce. Unsupported claims may create a new credibility problem.'
  }
  return 'Avoid vague or absolute statements that cannot be supported by facts, documents, or prior case details.'
}

function extractNewFacts(answerText = '') {
  const text = normalizeText(answerText)
  if (!text) return []

  const sentences = text
    .split(/[\.\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)

  return sentences
    .filter((sentence) => /\b(i|we|he|she|they)\b/i.test(sentence) || /\b\d{1,2}\b/.test(sentence))
    .slice(0, 3)
}

function detectContradictions(question = {}, answerText = '', answerEffect = {}) {
  const signals = []
  const text = lower(answerText)

  if (question?.issue_type === 'contradiction' && answerEffect?.impact !== 'strengthens') {
    signals.push(
      `The answer does not fully resolve the contradiction linked to ${question.linked_issue_or_evidence}.`,
    )
  }

  if (text.includes('not sure') || text.includes('unclear')) {
    signals.push('The answer remains vague and may invite a contradiction challenge.')
  }

  return signals
}

function detectMissingEvidenceSignals(question = {}, answerText = '', answerEffect = {}) {
  const signals = []
  const text = lower(answerText)

  if (question?.issue_type === 'missing_document' && answerEffect?.impact !== 'strengthens') {
    signals.push(String(question.linked_issue_or_evidence || 'Required supporting document').trim())
  }

  if (
    text.includes('no proof') ||
    text.includes("don't have") ||
    text.includes('do not have') ||
    text.includes('no document') ||
    text.includes('no receipt')
  ) {
    signals.push('The answer suggests a missing proof or document remains unresolved.')
  }

  return Array.from(new Set(signals))
}

export function buildAnswerAnalysis(question) {
  const answer_options = buildOptions(question)
  const bestOption = answer_options.find((option) => option.impact === 'strengthens') || answer_options[0]
  const preferredAnswer = normalizeText(question?.suggested_answer)
  const preferredReasoning = normalizeText(question?.answer_reasoning)
  const preferredRisk = normalizeText(question?.risk_note)

  return {
    answer_options,
    best_fit_answer: preferredAnswer || bestOption?.text || '',
    answer_reasoning:
      preferredReasoning || bestOption?.reasoning || 'A specific and supportable answer is preferred.',
    risk_note: preferredRisk || buildRiskNote(question),
  }
}

export function evaluateCustomAnswer(question, customAnswer) {
  const text = lower(customAnswer)
  const positiveSignals = ['provide', 'proof', 'record', 'receipt', 'agreement', 'bank', 'message', 'witness', 'timeline', 'clarify', 'document']
  const negativeSignals = ['not have', "don't have", 'no proof', 'unsure', 'maybe', 'not sure', 'forgot', 'lost', 'deleted', 'unclear']
  const admissionSignals = ['late', 'delay', 'damaged', 'missed', 'failed', 'owed', 'admit', 'inconsistent']

  const positiveCount = positiveSignals.filter((signal) => text.includes(signal)).length
  const negativeCount = negativeSignals.filter((signal) => text.includes(signal)).length
  const admissionCount = admissionSignals.filter((signal) => text.includes(signal)).length

  let impact = 'neutral'
  let score = 0

  if (positiveCount >= 2 && negativeCount === 0 && admissionCount === 0) {
    impact = 'strengthens'
    score = 0.1
  } else if (negativeCount >= 1 || admissionCount >= 1) {
    impact = 'weakens'
    score = -0.08 - admissionCount * 0.02
  } else if (positiveCount >= 1) {
    impact = 'mixed'
    score = 0.03
  }

  const reasoning =
    impact === 'strengthens'
      ? 'The custom answer adds concrete support signals and does not obviously introduce a new contradiction.'
      : impact === 'weakens'
        ? 'The custom answer appears to add uncertainty, admissions, or unsupported statements that can be challenged.'
        : 'The custom answer is partially useful but does not fully resolve the linked issue.'

  const risk_note =
    impact === 'weakens'
      ? 'This answer may create or deepen risk if repeated under challenge.'
      : 'Keep the answer consistent with existing facts and supporting records.'

  return {
    answer_text: normalizeText(customAnswer),
    impact,
    score,
    reasoning,
    risk_note,
    linked_issue_type: question?.issue_type || 'general',
  }
}

export function buildAnswerReview({
  question = {},
  answerText = '',
  answerEffect = {},
  selectedOption = null,
}) {
  const resolvedAnswerText = normalizeText(answerText || selectedOption?.text || '')
  const newFacts = extractNewFacts(resolvedAnswerText)
  const contradictions = detectContradictions(question, resolvedAnswerText, answerEffect)
  const missingEvidenceSignals = detectMissingEvidenceSignals(question, resolvedAnswerText, answerEffect)
  const impact =
    answerEffect?.impact === 'strengthens'
      ? 'strengthened'
      : answerEffect?.impact === 'weakens'
        ? 'weakened'
        : 'neutral'

  const summary =
    impact === 'strengthened'
      ? `The answer improves the user's position on ${question.linked_issue_or_evidence}.`
      : impact === 'weakened'
        ? `The answer leaves the case exposed on ${question.linked_issue_or_evidence}.`
        : `The answer only partially resolves ${question.linked_issue_or_evidence}.`

  const notes = [
    answerEffect?.reasoning || '',
    answerEffect?.risk_note || '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return {
    summary,
    new_facts: newFacts,
    contradictions,
    missing_evidence_signals: missingEvidenceSignals,
    strength_impact: impact,
    notes:
      notes ||
      'The answer was reviewed against the linked issue, current support, and expected adversarial pressure.',
  }
}

export function buildSelectedAnswerAnalysis(baseAnalysis = {}, chosenAnswerText = '', answerSource = 'suggested', customAnswerEvaluation = null) {
  return {
    ...baseAnalysis,
    selected_answer_text: chosenAnswerText,
    selected_answer_source: answerSource,
    custom_answer_evaluation: customAnswerEvaluation,
  }
}
