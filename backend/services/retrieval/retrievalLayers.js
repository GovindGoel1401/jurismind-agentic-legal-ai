export const retrievalLayers = {
  canonical_legal: {
    key: 'canonical_legal',
    description: 'Curated laws, sections, statutes, and legal knowledge.',
  },
  case_specific: {
    key: 'case_specific',
    description: 'Current user case context, uploaded documents, and analysis state.',
  },
  similar_case: {
    key: 'similar_case',
    description: 'Retrieved prior cases or precedents used for similarity comparison.',
  },
  feedback: {
    key: 'feedback',
    description: 'Reserved feedback memory layer. Not active in this phase.',
  },
}

export function buildRetrievalLayerSummary() {
  return {
    canonical_legal: retrievalLayers.canonical_legal.description,
    case_specific: retrievalLayers.case_specific.description,
    similar_case: retrievalLayers.similar_case.description,
    feedback: 'placeholder_only',
  }
}
