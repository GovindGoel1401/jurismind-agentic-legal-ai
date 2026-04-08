export function buildResponseMeta(graphResult, feedbackLearning) {
  return {
    learningProfile: feedbackLearning,
    pipelineMeta: {
      hasFeedbackMemory: Boolean(feedbackLearning?.feedbackCount),
      legalResearchStrategy: graphResult?.legalResearchMeta?.strategy || null,
      graphCorrectionUsed: graphResult?.legalResearch?.crag_used_graph_correction || false,
      verdictSource: graphResult?.verdictMeta?.source || null,
    },
  }
}
