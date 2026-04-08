import { buildPipelineTrace } from './pipelineTraceService.js'
import { buildLegalAdvisory } from './legalAdvisoryService.js'
import { buildAnalysisSections } from './analysisResponse/responseSections.js'
import { buildResponseMeta } from './analysisResponse/responseMeta.js'

export function buildAnalyzeCaseResponse(
  graphResult,
  feedbackLearning,
  documentIntelligence = null,
  caseAssessment = null,
  similarCaseIntelligence = null,
) {
  const sections = buildAnalysisSections(graphResult, caseAssessment, similarCaseIntelligence)
  const responseMeta = buildResponseMeta(graphResult, feedbackLearning)
  const structuredSynthesis =
    graphResult?.structured_synthesis || graphResult?.verdict?.structured_synthesis || null

  return {
    ...sections,
    ...responseMeta,
    documentIntelligence,
    caseAssessment,
    structured_synthesis: structuredSynthesis,
    human_factors: graphResult?.human_factors || graphResult?.verdict?.human_factors || null,
    graph_context: graphResult?.graph_context || null,
    pipelineTrace: buildPipelineTrace(graphResult),
    advisory: buildLegalAdvisory(graphResult),
  }
}
