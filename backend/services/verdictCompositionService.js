import { composeVerdictStudioResult } from './verdictStudioService.js'

export function composeVerdictResult(state) {
  const verdict = composeVerdictStudioResult({
    caseInput: state?.caseInput || {},
    graphResult: state || {},
    caseAssessment: state?.caseAssessment || {},
    documentIntelligence: state?.documentIntelligence || {},
    similarCaseIntelligence: state?.similarCaseIntelligence || {},
    feedbackLearning: state?.feedbackLearning || {},
  })

  return {
    case_summary: verdict.case_summary,
    verdict_text: verdict.verdict_text,
    confidence: verdict.confidence,
    suggested_actions: verdict.suggested_actions,
    verdict,
    verdictMeta: verdict.verdictMeta,
  }
}
