import { debateQuestionGenerationSchema } from './contracts/legalAgentSchemas.js'
import { buildDebateQuestionGenerationPrompt } from './prompts/debateQuestionGenerationPrompt.js'
import { createStructuredLegalAgent } from './shared/createStructuredLegalAgent.js'

function normalizeQuestionItem(item = {}, index = 0, side = 'supporting') {
  return {
    question: String(item.question || `Clarify the next ${side} issue.`).trim(),
    why_this_question_matters: String(
      item.why_this_question_matters || 'This question can materially affect the current case assessment.',
    ).trim(),
    linked_issue_or_evidence: String(item.linked_issue_or_evidence || 'Current case issue').trim(),
    issue_type: String(item.issue_type || 'general').trim(),
    issue_reference: String(item.issue_reference || item.linked_issue_or_evidence || `issue-${index + 1}`).trim(),
    impact_axis: String(item.impact_axis || 'credibility').trim(),
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

function buildFallback(input = {}) {
  const category = String(input?.caseInput?.category || 'case').trim()
  const latestQuestion = input?.latestAnswerRecord?.question || `the latest ${category} issue`
  const latestAnswer = input?.latestAnswerRecord?.answer_text || 'the latest user answer'

  return {
    defense_questions: [
      normalizeQuestionItem({
        question: `What fact, document, or witness support can you add to strengthen ${latestQuestion}?`,
        why_this_question_matters:
          'A realistic defense answer should add corroboration and make the record harder to attack.',
        linked_issue_or_evidence: 'Case support',
        issue_type: 'defense_support',
        issue_reference: latestQuestion,
        impact_axis: 'support',
        suggested_answer:
          'State the strongest specific supporting fact or document you can actually produce, with dates or chronology if possible.',
        answer_reasoning:
          'Specific corroboration is usually more persuasive than general explanation.',
      }, 0, 'supporting'),
    ],
    prosecution_questions: [
      normalizeQuestionItem({
        question: `If the other side challenges "${latestAnswer}" as incomplete or unsupported, what is your best direct answer?`,
        why_this_question_matters:
          'A realistic prosecution-style challenge should pressure weak support, contradictions, and credibility.',
        linked_issue_or_evidence: 'Adversarial challenge',
        issue_type: 'prosecution_attack',
        issue_reference: latestQuestion,
        impact_axis: 'pressure',
        suggested_answer:
          'Respond with the narrowest truthful answer that stays consistent with the case record and points to support.',
        answer_reasoning:
          'Overbroad answers create avoidable vulnerability under follow-up questioning.',
      }, 0, 'opposing'),
    ],
    session_strategy_note:
      'Use the latest answer to drive the next round while preserving continuity with the current case only.',
  }
}

export const runDebateQuestionGeneratorAgent = createStructuredLegalAgent({
  agentName: 'Debate Question Generator',
  schema: debateQuestionGenerationSchema,
  buildPrompt: buildDebateQuestionGenerationPrompt,
  buildFallback,
  transformValidated: (validated) => ({
    defense_questions: validated.defense_questions.map((item, index) =>
      normalizeQuestionItem(item, index, 'supporting')),
    prosecution_questions: validated.prosecution_questions.map((item, index) =>
      normalizeQuestionItem(item, index, 'opposing')),
    session_strategy_note: String(
      validated.session_strategy_note ||
        'Use the latest answer to drive the next round while preserving continuity with the current case only.',
    ).trim(),
  }),
  buildResult: ({ data, meta }) => ({
    ...data,
    debateQuestionMeta: meta,
  }),
})
