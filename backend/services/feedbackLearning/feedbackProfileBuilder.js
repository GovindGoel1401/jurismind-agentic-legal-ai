import { scoreFeedbackEntry } from './feedbackSimilarity.js'

function inferAccuracy(entry) {
  const payload = entry?.payload || {}
  const explicit = payload?.verdict_accuracy || payload?.answer_correctness_concern
  if (explicit === 'accurate' || explicit === 'partially-accurate' || explicit === 'incorrect') {
    return explicit
  }
  if (payload?.advice_usefulness_rating >= 4) return 'accurate'
  if (payload?.advice_usefulness_rating === 3) return 'partially-accurate'
  return 'incorrect'
}

function extractHints(entry) {
  const payload = entry?.payload || {}
  return [payload?.missed_section, payload?.missed_law, payload?.correctness_concern]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[\n,;]+/))
    .map((value) => value.trim())
    .filter(Boolean)
}

export function buildDefaultFeedbackProfile() {
  return {
    feedbackCount: 0,
    relevantFeedbackCount: 0,
    averageRating: null,
    accuracyBreakdown: {
      accurate: 0,
      'partially-accurate': 0,
      incorrect: 0,
    },
    commonMissedSections: [],
    recommendedAdjustments: [],
    summary: 'No prior verdict feedback is available yet.',
    profileMeta: {
      source: 'empty',
      candidateCount: 0,
      selectedCount: 0,
    },
  }
}

function buildRecommendedAdjustments(accuracyBreakdown, commonMissedSections, averageRating) {
  const recommendations = []

  if (accuracyBreakdown.incorrect > accuracyBreakdown.accurate) {
    recommendations.push(
      'Use extra caution in verdict confidence and explain uncertainty more explicitly.',
    )
  }
  if (commonMissedSections.length) {
    recommendations.push(
      `Review these frequently missed laws/sections: ${commonMissedSections.join(', ')}.`,
    )
  }
  if ((averageRating ?? 0) < 3.5) {
    recommendations.push('Strengthen legal retrieval coverage before final verdict generation.')
  }

  if (!recommendations.length) {
    recommendations.push('Recent feedback is broadly positive; preserve current reasoning style.')
  }

  return recommendations
}

function summarizeProfile(relevantEntries, baselineEntries, averageRating) {
  return relevantEntries.length
    ? `Applied ${relevantEntries.length} relevant feedback memories with average rating ${averageRating ?? 'n/a'}.`
    : `No closely matching past cases found; using ${baselineEntries.length} recent general feedback signals.`
}

export function buildFeedbackProfile(entries, caseInput = {}) {
  if (!entries.length) return buildDefaultFeedbackProfile()

  const scoredEntries = entries
    .map((entry) => scoreFeedbackEntry(entry, caseInput))
    .filter(({ score }) => score > 0.18)
    .sort((left, right) => right.score - left.score)

  const relevantEntries = scoredEntries.slice(0, 12).map(({ entry }) => entry)
  const baselineEntries = relevantEntries.length ? relevantEntries : entries.slice(0, 8)

  const ratingSum = baselineEntries.reduce(
    (sum, entry) => sum + Number(entry?.payload?.advice_usefulness_rating || 0),
    0,
  )
  const averageRating = baselineEntries.length
    ? Number((ratingSum / baselineEntries.length).toFixed(2))
    : null

  const accuracyBreakdown = {
    accurate: 0,
    'partially-accurate': 0,
    incorrect: 0,
  }

  const hintCounts = new Map()
  for (const entry of baselineEntries) {
    accuracyBreakdown[inferAccuracy(entry)] += 1
    for (const hint of extractHints(entry)) {
      const key = hint.toLowerCase()
      hintCounts.set(key, {
        label: hint,
        count: (hintCounts.get(key)?.count || 0) + 1,
      })
    }
  }

  const commonMissedSections = Array.from(hintCounts.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)
    .map((item) => item.label)

  return {
    feedbackCount: entries.length,
    relevantFeedbackCount: relevantEntries.length,
    averageRating,
    accuracyBreakdown,
    commonMissedSections,
    recommendedAdjustments: buildRecommendedAdjustments(
      accuracyBreakdown,
      commonMissedSections,
      averageRating,
    ),
    summary: summarizeProfile(relevantEntries, baselineEntries, averageRating),
    profileMeta: {
      source: relevantEntries.length ? 'relevance_weighted' : 'recent_fallback',
      candidateCount: entries.length,
      selectedCount: baselineEntries.length,
    },
  }
}
