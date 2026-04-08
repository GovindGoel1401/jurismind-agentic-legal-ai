import { feedbackMemoryExtractionSchema } from './contracts/legalAgentSchemas.js'
import { buildFeedbackMemoryExtractionPrompt } from './prompts/feedbackMemoryPrompts.js'
import { createStructuredLegalAgent } from './shared/createStructuredLegalAgent.js'

function normalizeCategory(value = '') {
  return String(value || 'general_feedback')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'general_feedback'
}

function normalizeTrustScore(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0.55
  return Number(Math.max(0, Math.min(1, numeric)).toFixed(3))
}

function buildFallback(input = {}) {
  const feedbackPayload = input?.feedbackPayload || {}
  const text = String(
    input?.feedbackText ||
      feedbackPayload?.user_comment ||
      feedbackPayload?.correctness_concern ||
      feedbackPayload?.fact_update ||
      feedbackPayload?.missing_context ||
      feedbackPayload?.actual_outcome ||
      'User feedback highlighted a refinement opportunity.',
  ).trim()

  return {
    lesson_summary: text.slice(0, 280) || 'User feedback highlighted a refinement opportunity.',
    lesson_category: normalizeCategory(
      feedbackPayload?.category || input?.caseInput?.category || input?.feedbackType || 'general_feedback',
    ),
    missing_factor: String(feedbackPayload?.missing_context || feedbackPayload?.fact_update || '').trim(),
    actual_outcome: String(
      feedbackPayload?.actual_outcome || input?.metadata?.actual_outcome || '',
    ).trim(),
    trust_score: text.length > 40 ? 0.68 : 0.48,
    should_store: text ? 'YES' : 'NO',
    validation_status: 'pending',
  }
}

function transformValidated(validated) {
  return {
    lesson_summary: String(validated.lesson_summary || 'User feedback highlighted a refinement opportunity.').trim(),
    lesson_category: normalizeCategory(validated.lesson_category),
    missing_factor: String(validated.missing_factor || '').trim(),
    actual_outcome: String(validated.actual_outcome || '').trim(),
    trust_score: normalizeTrustScore(validated.trust_score),
    should_store: String(validated.should_store || 'YES').toUpperCase() === 'NO' ? 'NO' : 'YES',
    validation_status: ['pending', 'reviewed', 'validated'].includes(validated.validation_status)
      ? validated.validation_status
      : 'pending',
  }
}

export const runFeedbackMemoryExtractorAgent = createStructuredLegalAgent({
  agentName: 'Feedback Memory Extraction Agent',
  schema: feedbackMemoryExtractionSchema,
  buildPrompt: buildFeedbackMemoryExtractionPrompt,
  buildFallback,
  transformValidated,
  buildResult: ({ data, meta }) => ({
    ...data,
    extractorMeta: meta,
  }),
})
