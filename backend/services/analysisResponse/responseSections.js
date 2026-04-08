import { env } from '../../config/envConfig.js'
import { buildSatisfactionGate } from '../feedbackIntelligence/feedbackMemoryRoutingService.js'

function buildReflection(graphResult) {
  return {
    issues_found: graphResult.issues_found || [],
    reasoning_flaws: graphResult.reasoning_flaws || [],
    improvement_suggestions: graphResult.improvement_suggestions || [],
    revised_confidence: graphResult.revised_confidence ?? graphResult?.verdict?.confidence,
  }
}

function buildDebate(graphResult) {
  return {
    defense: graphResult.defense_arguments || [],
    prosecution: graphResult.prosecution_arguments || [],
    rebuttal: graphResult.rebuttal_points || [],
    balanceScore: graphResult.debate_balance_score ?? null,
  }
}

export function buildAnalysisSections(graphResult, caseAssessment = null, similarCaseIntelligence = null) {
  return {
    caseAssessment,
    verdict: graphResult.final_verdict || graphResult.verdict,
    structuredSynthesis: graphResult.structured_synthesis || graphResult.verdict?.structured_synthesis || null,
    humanFactors: graphResult.human_factors || graphResult.verdict?.human_factors || null,
    knowledgeGraph: graphResult.knowledgeGraph || null,
    graphContext: graphResult.graph_context || null,
    reflection: buildReflection(graphResult),
    riskScore: graphResult.riskScore,
    similarCaseIntelligence: similarCaseIntelligence || graphResult.similarCaseIntelligence || null,
    similarCases:
      graphResult.final_verdict?.similarCases ||
      graphResult.verdict?.similarCases ||
      similarCaseIntelligence?.similar_cases ||
      [],
    debate: buildDebate(graphResult),
    feedbackMemory: {
      enabled: env.FEEDBACK_MEMORY_ENABLED,
      satisfaction_gate: buildSatisfactionGate(),
    },
  }
}
