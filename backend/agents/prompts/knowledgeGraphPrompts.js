import { buildStructuredJsonPrompt } from '../shared/legalPromptBuilder.js'

export function buildKnowledgeGraphExtractionPrompt({
  caseId = '',
  caseInput = {},
  graphResult = {},
  documentIntelligence = {},
}) {
  return buildStructuredJsonPrompt({
    agentName: 'Knowledge Graph Extraction Agent',
    role:
      'Convert an analyzed legal case into a structured graph-friendly representation of issues, arguments, evidence, rules, reasoning, and outcome.',
    objective:
      'Extract stable legal reasoning objects for graph storage without inventing unsupported facts or citations.',
    schemaExample: `{
  "case_summary": "string",
  "issues": [
    { "issue_id": "issue-1", "title": "string", "summary": "string", "legal_rules": ["string"] }
  ],
  "arguments": [
    {
      "argument_id": "arg-1",
      "side": "supporting or opposing",
      "title": "string",
      "summary": "string",
      "linked_issues": ["issue-1"],
      "evidence_labels": ["string"],
      "legal_rules": ["string"],
      "contradicts": ["arg-2"]
    }
  ],
  "evidence_items": [
    {
      "evidence_id": "ev-1",
      "label": "string",
      "evidence_type": "document",
      "summary": "string",
      "supports_arguments": ["arg-1"]
    }
  ],
  "legal_rules": [
    { "rule_id": "rule-1", "label": "string", "source": "string", "linked_issues": ["issue-1"] }
  ],
  "reasoning_nodes": [
    { "reasoning_id": "reason-1", "title": "string", "summary": "string", "linked_issues": ["issue-1"], "linked_rules": ["rule-1"] }
  ],
  "outcome": { "outcome_id": "outcome-1", "label": "string", "summary": "string" }
}`,
    instructions: [
      'Use short stable IDs like issue-1, arg-1, ev-1, rule-1, reason-1.',
      'Keep only major issues and arguments. Do not over-fragment.',
      'Separate supporting-side and opposing-side arguments when possible.',
      'Use law-topic labels when exact statutory text is not explicit.',
      'If evidence links are uncertain, keep them conservative instead of hallucinating.',
    ],
    contextSections: [
      { title: 'Case id', value: caseId },
      { title: 'Case input', value: caseInput },
      { title: 'Structured analysis result', value: graphResult },
      { title: 'Document intelligence', value: documentIntelligence },
    ],
  })
}
