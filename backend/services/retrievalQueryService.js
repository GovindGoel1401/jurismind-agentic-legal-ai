import { runRetrievalQueryRewriterAgent } from '../agents/retrievalQueryRewriterAgent.js'

function normalizeTurns(recentTurns = []) {
  return (Array.isArray(recentTurns) ? recentTurns : [])
    .slice(-6)
    .map((turn) => ({
      question: turn?.question || '',
      answer_text: turn?.answer_text || '',
      side: turn?.side || '',
      scenario_delta_summary: turn?.scenario_update?.scenario_delta_summary || '',
    }))
}

export async function buildRetrievalQueries({
  userQuery = '',
  goal = 'general_retrieval',
  caseInput = {},
  structuredCase = {},
  recentTurns = [],
  workingState = {},
}) {
  const rewritten = await runRetrievalQueryRewriterAgent({
    userQuery,
    goal,
    caseInput,
    structuredCase,
    recentTurns: normalizeTurns(recentTurns),
    workingState,
  })

  return {
    retrievalQuery: rewritten.retrieval_query,
    evidenceQuery: rewritten.evidence_query || rewritten.retrieval_query,
    rulesQuery: rewritten.rules_query || rewritten.retrieval_query,
    similarCasesQuery: rewritten.similar_cases_query || rewritten.retrieval_query,
    focusPoints: rewritten.focus_points || [],
    filters: rewritten.filters || {},
    rewriteMeta: rewritten.rewriteMeta || {},
  }
}
