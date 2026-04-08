import { buildStructuredJsonPrompt } from '../shared/legalPromptBuilder.js'

export function buildRetrievalQueryRewritePrompt({
  userQuery = '',
  goal = 'general_retrieval',
  caseInput = {},
  structuredCase = {},
  recentTurns = [],
  workingState = {},
}) {
  return buildStructuredJsonPrompt({
    agentName: 'Retrieval Query Rewriter',
    role:
      'Rewrite the current user/legal query into a cleaner retrieval-focused search query for vector databases.',
    objective:
      'Produce concise retrieval queries that maximize semantic retrieval quality while preserving the current case context and only the current session history.',
    schemaExample: `{
  "retrieval_query": "main retrieval query",
  "evidence_query": "fact and evidence focused query",
  "rules_query": "law and section focused query",
  "similar_cases_query": "precedent and similar-case focused query",
  "focus_points": ["key issue 1", "key issue 2"],
  "filters": {
    "category": "optional category",
    "jurisdiction": "optional jurisdiction",
    "laws": ["optional law signal"]
  }
}`,
    instructions: [
      'Rewrite for retrieval, not for final answering.',
      'Use the latest user intent and the current case facts.',
      'If recent turns exist, prefer the latest unresolved issue from this same case session only.',
      'Do not carry history from any unrelated case.',
      'Keep each query compact and semantically rich.',
      'Do not invent legal provisions or evidence.',
      'Return JSON only.',
    ],
    contextSections: [
      { title: 'Retrieval goal', value: goal },
      { title: 'Latest user query', value: userQuery },
      { title: 'Case input', value: caseInput },
      { title: 'Structured case', value: structuredCase },
      { title: 'Recent session turns', value: recentTurns.slice(-5) },
      { title: 'Current working state', value: workingState },
    ],
  })
}
