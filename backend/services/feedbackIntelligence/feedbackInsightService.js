import { listFeedbackItems } from './feedbackStorageService.js'
import { retrieveFeedbackMemoryContext } from './feedbackMemoryService.js'

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function overlapRatio(left, right) {
  const leftTokens = new Set(normalizeText(left).split(' ').filter(Boolean))
  const rightTokens = new Set(normalizeText(right).split(' ').filter(Boolean))
  if (!leftTokens.size || !rightTokens.size) return 0

  let overlap = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1
  }

  return overlap / leftTokens.size
}

function buildCaseFingerprint(caseInput = {}) {
  return [caseInput.category, caseInput.jurisdiction, caseInput.description, caseInput.caseText]
    .filter(Boolean)
    .join(' ')
}

function scoreFeedbackRelevance(entry, caseInput = {}, filters = {}) {
  const entryCaseInput = entry?.metadata?.case_input || {}
  const categoryMatch =
    normalizeText(entryCaseInput.category) === normalizeText(caseInput.category) ? 0.32 : 0
  const jurisdictionMatch =
    normalizeText(entryCaseInput.jurisdiction) === normalizeText(caseInput.jurisdiction) ? 0.2 : 0
  const featureMatch =
    filters.linked_feature_or_agent &&
    normalizeText(entry.linked_feature_or_agent) === normalizeText(filters.linked_feature_or_agent)
      ? 0.14
      : 0
  const contextMatch =
    filters.phase_context &&
    normalizeText(entry.phase_context) === normalizeText(filters.phase_context)
      ? 0.12
      : 0
  const textSimilarity = overlapRatio(
    buildCaseFingerprint(caseInput),
    buildCaseFingerprint(entryCaseInput),
  )

  return Number((categoryMatch + jurisdictionMatch + featureMatch + contextMatch + textSimilarity).toFixed(3))
}

function buildInsight(insightType, relatedPattern, relevanceScore, supportingFeedbackRefs) {
  return {
    insight_type: insightType,
    related_pattern: relatedPattern,
    relevance_score: relevanceScore,
    supporting_feedback_refs: supportingFeedbackRefs,
  }
}

function groupByFeedbackType(entries) {
  const grouped = new Map()

  for (const entry of entries) {
    const key = entry.feedback_type
    const current = grouped.get(key) || []
    current.push(entry)
    grouped.set(key, current)
  }

  return grouped
}

export async function buildFeedbackInsights({ caseInput = {}, filters = {}, limit = 40 }) {
  const feedbackItems = await listFeedbackItems(filters, limit)
  const lexicalInsights = []

  if (feedbackItems.length) {
    const scored = feedbackItems
      .map((entry) => ({
        entry,
        relevance: scoreFeedbackRelevance(entry, caseInput, filters),
      }))
      .filter((item) => item.relevance > 0.1)
      .sort((left, right) => right.relevance - left.relevance)

    if (scored.length) {
      const grouped = groupByFeedbackType(scored.map((item) => item.entry))

      for (const [feedbackType, entries] of grouped.entries()) {
        const supportingFeedbackRefs = entries.slice(0, 4).map((entry) => entry.feedback_id)
        const averageRelevance =
          scored
            .filter((item) => item.entry.feedback_type === feedbackType)
            .reduce((sum, item) => sum + item.relevance, 0) / entries.length

        if (feedbackType === 'advice_usefulness') {
          const usefulLabels = entries
            .map((entry) => entry.payload?.usefulness_label || entry.payload?.user_comment || '')
            .filter(Boolean)
          lexicalInsights.push(
            buildInsight(
              'useful_advice_pattern',
              usefulLabels[0] || 'Users reported useful advice patterns for similar case contexts.',
              Number(averageRelevance.toFixed(3)),
              supportingFeedbackRefs,
            ),
          )
          continue
        }

        if (feedbackType === 'updated_case_fact' || feedbackType === 'missing_context_provided_later') {
          const correction = entries
            .map((entry) => entry.payload?.fact_update || entry.payload?.missing_context || entry.payload?.user_comment || '')
            .filter(Boolean)[0]
          lexicalInsights.push(
            buildInsight(
              'common_correction_pattern',
              correction || 'Users often provide important missing or corrected context later in the process.',
              Number(averageRelevance.toFixed(3)),
              supportingFeedbackRefs,
            ),
          )
          continue
        }

        if (feedbackType === 'actual_case_outcome') {
          const actualOutcome = entries
            .map((entry) => entry.payload?.actual_outcome || entry.payload?.outcome_summary || '')
            .filter(Boolean)[0]
          lexicalInsights.push(
            buildInsight(
              'actual_outcome_signal',
              actualOutcome || 'Actual case outcomes were reported for related matters.',
              Number(averageRelevance.toFixed(3)),
              supportingFeedbackRefs,
            ),
          )
          continue
        }

        if (feedbackType === 'answer_correctness_concern') {
          const concern = entries
            .map((entry) => entry.payload?.correctness_concern || entry.payload?.user_comment || '')
            .filter(Boolean)[0]
          lexicalInsights.push(
            buildInsight(
              'correctness_risk_pattern',
              concern || 'Users raised correctness or assumption concerns in similar scenarios.',
              Number(averageRelevance.toFixed(3)),
              supportingFeedbackRefs,
            ),
          )
          continue
        }

        lexicalInsights.push(
          buildInsight(
            'general_feedback_pattern',
            entries[0]?.payload?.user_comment || 'General feedback pattern from related cases.',
            Number(averageRelevance.toFixed(3)),
            supportingFeedbackRefs,
          ),
        )
      }
    }
  }

  const feedbackMemory = await retrieveFeedbackMemoryContext({
    queryText: buildCaseFingerprint(caseInput),
    lessonCategory: caseInput?.category || '',
    linkedFeatureOrAgent: filters.linked_feature_or_agent || '',
    topK: 3,
  })

  const memoryInsights = (feedbackMemory.compressed_lessons || []).map((lesson) =>
    buildInsight(
      'feedback_memory_lesson',
      lesson.lesson_summary,
      Number((lesson.relevance_score || lesson.trust_score || 0.5).toFixed(3)),
      [lesson.feedback_id],
    ),
  )

  return [...lexicalInsights, ...memoryInsights].slice(0, 8)
}
