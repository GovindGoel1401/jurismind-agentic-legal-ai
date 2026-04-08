import { runFeedbackMemoryExtractorAgent } from '../../agents/feedbackMemoryExtractorAgent.js'
import { env } from '../../config/envConfig.js'
import { logger } from '../../utils/logger.js'
import { storeFeedbackItem } from './feedbackStorageService.js'
import {
  buildFeedbackMemoryRouteDecision,
  compressFeedbackLessons,
} from './feedbackMemoryRoutingService.js'
import {
  retrieveFeedbackMemoryLessons,
  storeFeedbackMemoryVector,
} from './feedbackMemoryVectorService.js'

function extractFeedbackText(payload = {}) {
  const feedbackPayload = payload.payload || {}
  const issueTags = Array.isArray(payload.issue_tags) ? payload.issue_tags.join(', ') : ''
  const structuredSignals = [
    payload.comment,
    feedbackPayload.user_comment,
    feedbackPayload.correctness_concern,
    feedbackPayload.fact_update,
    feedbackPayload.missing_context,
    feedbackPayload.actual_outcome,
    feedbackPayload.outcome_summary,
    issueTags ? `Issue tags: ${issueTags}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  return String(structuredSignals).trim()
}

function buildFallbackLesson(payload = {}) {
  const feedbackPayload = payload.payload || {}
  const feedbackText = extractFeedbackText(payload)
  const issueTags = Array.isArray(payload.issue_tags) ? payload.issue_tags : []
  const stageSignals = [
    payload.analysis_helpful === false ? 'analysis was not helpful' : '',
    payload.verdict_helpful === false ? 'verdict was not helpful' : '',
    payload.debate_helpful === false ? 'debate follow-up was not helpful' : '',
    payload.document_guidance_helpful === false ? 'document guidance was not helpful' : '',
    payload.similar_cases_helpful === false ? 'similar cases were not helpful' : '',
  ]
    .filter(Boolean)
    .join('; ')
  return {
    lesson_summary:
      feedbackText ||
      stageSignals ||
      'User feedback highlighted a refinement opportunity.',
    lesson_category: String(
      issueTags[0] ||
        feedbackPayload.category ||
        payload?.metadata?.case_input?.category ||
        payload.feedback_type ||
        'general_feedback',
    )
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'general_feedback',
    missing_factor: String(
      feedbackPayload.missing_context ||
        feedbackPayload.fact_update ||
        issueTags.join(', ') ||
        '',
    ).trim(),
    actual_outcome: String(
      feedbackPayload.actual_outcome || feedbackPayload.outcome_summary || payload?.metadata?.actual_outcome || '',
    ).trim(),
    trust_score:
      payload.user_rating && Number(payload.user_rating) <= 2
        ? 0.78
        : feedbackText.length > 40 || stageSignals
          ? 0.67
          : 0.5,
    should_store: feedbackText || stageSignals ? 'YES' : 'NO',
    validation_status: 'pending',
  }
}

export async function retrieveFeedbackMemoryContext({
  queryText = '',
  lessonCategory = '',
  linkedFeatureOrAgent = '',
  topK = 3,
}) {
  const retrieval = await retrieveFeedbackMemoryLessons({
    queryText,
    lessonCategory,
    linkedFeatureOrAgent,
    topK,
  })

  return {
    lessons: retrieval.lessons || [],
    compressed_lessons: compressFeedbackLessons(retrieval.lessons || []),
    meta: retrieval.meta,
  }
}

export async function storeFeedbackEntryWithMemory(payload = {}) {
  const feedbackText = extractFeedbackText(payload)
  const routing = buildFeedbackMemoryRouteDecision({
    satisfactionStatus: payload.satisfaction_status,
    continuityTracker: {},
    featureEnabled: env.FEEDBACK_MEMORY_ENABLED,
  })

  let extractedLesson = buildFallbackLesson(payload)

  if (env.FEEDBACK_MEMORY_ENABLED && feedbackText) {
    try {
      extractedLesson = await runFeedbackMemoryExtractorAgent({
        caseInput: payload?.metadata?.case_input || {},
        aiVerdict: payload?.metadata?.ai_verdict || {},
        feedbackType: payload.feedback_type,
        satisfactionStatus: payload.satisfaction_status || 'unknown',
        feedbackPayload: payload.payload || {},
        feedbackText,
        metadata: payload.metadata || {},
      })
    } catch (error) {
      logger.warn('Feedback memory extraction failed. Using fallback lesson extraction.', {
        message: error?.message || String(error),
      })
    }
  }

  const enrichedPayload = {
    ...payload,
    lesson_summary: extractedLesson.lesson_summary,
    lesson_category: extractedLesson.lesson_category,
    missing_factor: extractedLesson.missing_factor,
    trust_score: extractedLesson.trust_score,
    validation_status: extractedLesson.validation_status,
    feedback_memory_indexed: false,
    metadata: {
      ...(payload.metadata || {}),
      actual_outcome:
        extractedLesson.actual_outcome ||
        payload?.metadata?.actual_outcome ||
        payload?.payload?.actual_outcome ||
        '',
    },
  }

  const feedback_item = await storeFeedbackItem(enrichedPayload)

  let feedback_memory = {
    route: routing.reason,
    stored: false,
    retrieved: false,
    related_lessons: [],
  }

  if (
    env.FEEDBACK_MEMORY_ENABLED &&
    routing.should_store &&
    extractedLesson.should_store === 'YES' &&
    extractedLesson.lesson_summary
  ) {
    const vectorResult = await storeFeedbackMemoryVector({
      feedback_id: feedback_item.feedback_id,
      lesson_summary: extractedLesson.lesson_summary,
      lesson_category: extractedLesson.lesson_category,
      missing_factor: extractedLesson.missing_factor,
      actual_outcome: enrichedPayload.metadata.actual_outcome,
      trust_score: extractedLesson.trust_score,
      case_id: feedback_item.case_id,
      session_id: feedback_item.session_id,
      linked_feature_or_agent: feedback_item.linked_feature_or_agent,
      feedback_type: feedback_item.feedback_type,
      phase_context: feedback_item.phase_context,
      metadata: {
        satisfaction_status: feedback_item.satisfaction_status,
        user_rating: feedback_item.user_rating,
        issue_tags: feedback_item.issue_tags || [],
        case_signature: feedback_item.case_signature || {},
      },
    })

    feedback_memory.stored = Boolean(vectorResult.success)
  }

  if (env.FEEDBACK_MEMORY_ENABLED && routing.should_retrieve) {
    const retrieval = await retrieveFeedbackMemoryContext({
      queryText:
        extractedLesson.lesson_summary ||
        feedbackText ||
        JSON.stringify(payload?.metadata?.case_input || {}),
      lessonCategory: extractedLesson.lesson_category,
      linkedFeatureOrAgent: payload.linked_feature_or_agent,
      topK: 3,
    })

    feedback_memory = {
      ...feedback_memory,
      retrieved: Boolean(retrieval.compressed_lessons.length),
      related_lessons: retrieval.compressed_lessons,
      retrieval_meta: retrieval.meta,
    }
  }

  return {
    ...feedback_item,
    feedback_memory,
  }
}
