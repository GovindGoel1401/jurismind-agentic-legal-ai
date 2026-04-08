function normalizeCategory(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeCluster(value = '') {
  return normalizeCategory(value)
}

export function buildIssueClusterKey({ question = {}, answerEffect = {}, caseInput = {} } = {}) {
  const parts = [
    question?.issue_category,
    question?.issue_type,
    question?.impact_axis,
    question?.linked_issue_or_evidence,
    answerEffect?.category_hint,
    caseInput?.category,
  ]
    .filter(Boolean)
    .map((item) => normalizeCluster(item))

  return parts.slice(0, 2).filter(Boolean).join('::') || 'general'
}

export function buildSatisfactionGate() {
  return {
    question: 'Are you satisfied with this result?',
    options: ['yes', 'no'],
    default: 'yes',
  }
}

export function resolveFeedbackContinuityCategory({
  question = {},
  caseInput = {},
  answerEffect = {},
} = {}) {
  return (
    normalizeCategory(question?.issue_type) ||
    normalizeCategory(question?.impact_axis) ||
    normalizeCategory(question?.issue_reference) ||
    normalizeCategory(answerEffect?.category_hint) ||
    normalizeCategory(caseInput?.category) ||
    'general'
  )
}

export function updateContinuityTracker(previousTracker = {}, nextCategory = '') {
  const normalizedCategory = normalizeCategory(nextCategory)
  const previousCategory = normalizeCategory(previousTracker?.last_category)
  const consecutiveCount =
    normalizedCategory && previousCategory === normalizedCategory
      ? Number(previousTracker?.consecutive_count || 0) + 1
      : normalizedCategory
        ? 1
        : 0

  return {
    last_category: normalizedCategory,
    consecutive_count: consecutiveCount,
    should_retrieve: consecutiveCount >= 3 && Boolean(normalizedCategory),
    retrieval_trigger: consecutiveCount >= 3 ? 'three_consecutive_same_issue_cluster' : '',
  }
}

export function updateClusterWindow(previousWindow = [], nextCluster = '', limit = 10) {
  const normalized = normalizeCluster(nextCluster)
  const nextWindow = [...(Array.isArray(previousWindow) ? previousWindow : []), normalized].filter(Boolean)
  return nextWindow.slice(-Math.max(1, Number(limit) || 10))
}

function countClusterOccurrences(window = [], cluster = '') {
  const normalized = normalizeCluster(cluster)
  return (Array.isArray(window) ? window : []).filter((item) => normalizeCluster(item) === normalized).length
}

export function buildFeedbackMemoryRouteDecision({
  satisfactionStatus = 'unknown',
  continuityTracker = {},
  featureEnabled = true,
  recentClusterWindow = [],
  currentCluster = '',
  repeatedWeaknessOnCluster = false,
  unresolvedCriticalCluster = false,
}) {
  if (!featureEnabled) {
    return {
      should_store: false,
      should_retrieve: false,
      reason: 'feedback_memory_disabled',
    }
  }

  const normalizedSatisfaction = String(satisfactionStatus || 'unknown').toLowerCase()
  if (normalizedSatisfaction === 'no') {
    return {
      should_store: true,
      should_retrieve: true,
      reason: 'user_not_satisfied',
    }
  }

  const clusterOccurrences = countClusterOccurrences(recentClusterWindow, currentCluster)
  if (clusterOccurrences >= 5) {
    return {
      should_store: true,
      should_retrieve: true,
      reason: 'five_total_same_issue_cluster_recent_window',
    }
  }

  if (repeatedWeaknessOnCluster) {
    return {
      should_store: true,
      should_retrieve: true,
      reason: 'repeated_weakness_same_issue_cluster',
    }
  }

  if (unresolvedCriticalCluster) {
    return {
      should_store: false,
      should_retrieve: true,
      reason: 'unresolved_critical_issue_cluster_persists',
    }
  }

  if (continuityTracker?.should_retrieve) {
    return {
      should_store: false,
      should_retrieve: true,
      reason: continuityTracker.retrieval_trigger || 'three_consecutive_same_issue_cluster',
    }
  }

  return {
    should_store: false,
    should_retrieve: false,
    reason: 'no_feedback_memory_trigger',
  }
}

export function compressFeedbackLessons(lessons = [], limit = 3) {
  return lessons.slice(0, limit).map((lesson) => ({
    feedback_id: lesson.feedback_id,
    lesson_category: lesson.lesson_category,
    lesson_summary: lesson.lesson_summary,
    missing_factor: lesson.missing_factor,
    actual_outcome: lesson.actual_outcome,
    trust_score: lesson.trust_score,
    relevance_score: lesson.relevance_score,
  }))
}
