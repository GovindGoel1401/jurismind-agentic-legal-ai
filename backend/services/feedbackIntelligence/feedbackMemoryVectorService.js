import { env } from '../../config/envConfig.js'
import { embedCaseText } from '../../rag/embeddingService.js'
import { queryFaissDocuments, upsertFaissDocuments } from '../../rag/faissClient.js'
import { logger } from '../../utils/logger.js'

function normalizeCategory(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function buildFilter({ lessonCategory = '', linkedFeatureOrAgent = '' } = {}) {
  const must = []
  const category = normalizeCategory(lessonCategory)

  if (category) {
    must.push({
      key: 'lesson_category',
      match: { value: category },
    })
  }

  if (linkedFeatureOrAgent) {
    must.push({
      key: 'linked_feature_or_agent',
      match: { value: linkedFeatureOrAgent },
    })
  }

  return must.length ? { must } : null
}

function buildLessonDocument(document = {}, index = 0) {
  return {
    feedback_id: String(document?.metadata?.feedback_id || document?.id || `feedback-memory-${index + 1}`),
    lesson_summary: String(document?.metadata?.lesson_summary || document?.summary || '').trim(),
    lesson_category: normalizeCategory(document?.metadata?.lesson_category || ''),
    missing_factor: String(document?.metadata?.missing_factor || '').trim(),
    actual_outcome: String(document?.metadata?.actual_outcome || '').trim(),
    trust_score: Number(document?.metadata?.trust_score || 0.5),
    relevance_score: Number(document?.score || 0),
    linked_feature_or_agent: String(document?.metadata?.linked_feature_or_agent || ''),
    supporting_feedback_refs: [String(document?.metadata?.feedback_id || document?.id || '')].filter(Boolean),
  }
}

export async function storeFeedbackMemoryVector({
  feedback_id,
  lesson_summary,
  lesson_category = '',
  missing_factor = '',
  actual_outcome = '',
  trust_score = 0.5,
  case_id = '',
  session_id = '',
  linked_feature_or_agent = '',
  feedback_type = '',
  phase_context = '',
  metadata = {},
}) {
  // Feedback memory stays in its own FAISS index so user corrections do not contaminate
  // the main legal/similar-case retrieval collections.
  if (!env.FEEDBACK_MEMORY_ENABLED) {
    return {
      success: false,
      reason: 'feedback_memory_disabled',
      indexed_count: 0,
    }
  }

  if (!String(lesson_summary || '').trim()) {
    return {
      success: false,
      reason: 'empty_lesson_summary',
      indexed_count: 0,
    }
  }

  const vector = await embedCaseText(lesson_summary, {
    provider: env.EMBEDDING_PROVIDER,
    modality: 'text',
  })
  if (!Array.isArray(vector) || !vector.length) {
    return {
      success: false,
      reason: 'embedding_unavailable',
      indexed_count: 0,
    }
  }

  const result = await upsertFaissDocuments({
    indexName: env.FAISS_FEEDBACK_MEMORY_INDEX,
    records: [
      {
        id: feedback_id,
        vector,
        metadata: {
          feedback_id,
          lesson_summary,
          lesson_category: normalizeCategory(lesson_category),
          missing_factor,
          actual_outcome,
          trust_score,
          case_id,
          session_id,
          linked_feature_or_agent,
          feedback_type,
          phase_context,
          source: 'feedback_memory',
          ...metadata,
        },
      },
    ],
  })

  logger.info('Feedback memory vector upsert completed.', {
    feedback_id,
    indexName: env.FAISS_FEEDBACK_MEMORY_INDEX,
    success: result.success,
    reason: result.reason,
  })

  return result
}

export async function retrieveFeedbackMemoryLessons({
  queryText = '',
  lessonCategory = '',
  linkedFeatureOrAgent = '',
  topK = 3,
}) {
  // This retrieval path is secondary and opt-in. It should never become the default
  // source of truth for legal reasoning.
  if (!env.FEEDBACK_MEMORY_ENABLED) {
    return {
      lessons: [],
      meta: {
        available: false,
        reason: 'feedback_memory_disabled',
      },
    }
  }

  const normalizedQuery = String(queryText || '').trim()
  if (!normalizedQuery) {
    return {
      lessons: [],
      meta: {
        available: false,
        reason: 'missing_query_text',
      },
    }
  }

  const queryVector = await embedCaseText(normalizedQuery, {
    provider: env.EMBEDDING_PROVIDER,
    modality: 'text',
  })

  if (!Array.isArray(queryVector) || !queryVector.length) {
    return {
      lessons: [],
      meta: {
        available: false,
        reason: 'embedding_unavailable',
      },
    }
  }

  const result = await queryFaissDocuments({
    queryText: normalizedQuery,
    vector: queryVector,
    topK,
    indexName: env.FAISS_FEEDBACK_MEMORY_INDEX,
    filter: buildFilter({ lessonCategory, linkedFeatureOrAgent }),
  })

  return {
    lessons: (result.documents || [])
      .map((document, index) => buildLessonDocument(document, index))
      .filter((lesson) => lesson.lesson_summary),
    meta: {
      ...result.meta,
      lessonCategory: normalizeCategory(lessonCategory),
      linkedFeatureOrAgent,
    },
  }
}
