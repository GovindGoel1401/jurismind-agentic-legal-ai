import { buildStructuredJsonPrompt } from '../shared/legalPromptBuilder.js'

export function buildRetrievalRouterPrompt({
  queryText = '',
  stage = 'debate_reasoning',
  structuredCase = {},
  evidenceAnalysis = {},
  recentTurns = [],
}) {
  return buildStructuredJsonPrompt({
    agentName: 'Retrieval Router',
    role: 'Decide whether the next legal debate step needs evidence retrieval, rules retrieval, or no retrieval.',
    objective:
      'Return only a strict routing decision. Do not answer the debate, argue the case, or generate legal analysis.',
    schemaExample: `{
  "evidence_required": "YES or NO",
  "rules_required": "YES or NO",
  "no_retrieval": "YES or NO",
  "reason": "short reason"
}`,
    instructions: [
      'You are a retrieval decision engine only.',
      'Evidence retrieval is for factual grounding from documents, evidence records, witness statements, reports, or case materials.',
      'Rules retrieval is for legal standards, procedural rules, statutes, sections, official guidance, or policy grounding.',
      'No retrieval is for continuity-only turns that can be answered from the current state.',
      'Evidence and rules can both be YES.',
      'If either evidence_required or rules_required is YES, no_retrieval must be NO.',
      'If both evidence_required and rules_required are NO, no_retrieval must be YES.',
      'Return JSON only.',
    ],
    contextSections: [
      { title: 'Current stage', value: stage },
      { title: 'Current user query or debate focus', value: queryText },
      { title: 'Structured case', value: structuredCase },
      { title: 'Evidence analysis', value: evidenceAnalysis },
      { title: 'Recent turns', value: recentTurns.slice(-4) },
    ],
  })
}
