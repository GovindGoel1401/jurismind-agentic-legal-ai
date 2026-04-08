import { buildFeedbackInsights } from './feedbackInsightService.js'

export async function getFeedbackIntelligenceHook({
  caseInput = {},
  phaseContext = '',
  linkedFeature = '',
}) {
  const feedback_insights = await buildFeedbackInsights({
    caseInput,
    filters: {
      phase_context: phaseContext || undefined,
      linked_feature_or_agent: linkedFeature || undefined,
    },
  })

  return {
    feedback_insights,
    hook_meta: {
      source: 'feedback_intelligence_layer',
      phase_context: phaseContext || null,
      linked_feature: linkedFeature || null,
      insight_count: feedback_insights.length,
    },
  }
}
