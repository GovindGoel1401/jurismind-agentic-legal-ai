import { knowledgeGraphExtractionSchema } from './contracts/legalAgentSchemas.js'
import { buildKnowledgeGraphExtractionPrompt } from './prompts/knowledgeGraphPrompts.js'
import { createStructuredLegalAgent } from './shared/createStructuredLegalAgent.js'

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function ensureIds(items = [], prefix, titleSelector) {
  return items.map((item, index) => ({
    ...item,
    [prefix === 'issue' ? 'issue_id' : prefix === 'arg' ? 'argument_id' : prefix === 'ev' ? 'evidence_id' : prefix === 'rule' ? 'rule_id' : 'reasoning_id']:
      item[
        prefix === 'issue'
          ? 'issue_id'
          : prefix === 'arg'
            ? 'argument_id'
            : prefix === 'ev'
              ? 'evidence_id'
              : prefix === 'rule'
                ? 'rule_id'
                : 'reasoning_id'
      ] || `${prefix}-${index + 1}-${slugify(titleSelector(item)).slice(0, 24) || index + 1}`,
  }))
}

function buildFallback(input = {}) {
  const laws = input?.graphResult?.relevant_laws || []
  const defenseArguments = input?.graphResult?.defense_arguments || []
  const prosecutionArguments = input?.graphResult?.prosecution_arguments || []
  const missingEvidence = input?.graphResult?.missing_evidence || []
  const caseType = input?.graphResult?.case_type || input?.caseInput?.category || 'general-dispute'

  return {
    case_summary:
      input?.graphResult?.case_summary ||
      input?.caseInput?.description ||
      'Case summary unavailable.',
    issues: [
      {
        issue_id: 'issue-1',
        title: caseType,
        summary: `Primary dispute appears to concern ${caseType}.`,
        legal_rules: laws.slice(0, 3),
      },
    ],
    arguments: [
      ...defenseArguments.slice(0, 2).map((summary, index) => ({
        argument_id: `arg-${index + 1}`,
        side: 'supporting',
        title: `Supporting argument ${index + 1}`,
        summary,
        linked_issues: ['issue-1'],
        evidence_labels: missingEvidence.length ? [] : ['Available case materials'],
        legal_rules: laws.slice(0, 2),
        contradicts: [],
      })),
      ...prosecutionArguments.slice(0, 2).map((summary, index) => ({
        argument_id: `arg-${index + 3}`,
        side: 'opposing',
        title: `Opposing argument ${index + 1}`,
        summary,
        linked_issues: ['issue-1'],
        evidence_labels: missingEvidence.slice(0, 2),
        legal_rules: laws.slice(0, 2),
        contradicts: defenseArguments.length ? ['arg-1'] : [],
      })),
    ],
    evidence_items: (input?.documentIntelligence?.evidence_inventory || []).slice(0, 4).map((item, index) => ({
      evidence_id: `ev-${index + 1}`,
      label: item.file_name || item.detected_type || `Evidence ${index + 1}`,
      evidence_type: item.category || item.detected_type || 'document',
      summary: item.basic_description || 'Case evidence item.',
      supports_arguments: defenseArguments.length ? ['arg-1'] : [],
    })),
    legal_rules: laws.slice(0, 5).map((label, index) => ({
      rule_id: `rule-${index + 1}`,
      label,
      source: 'legal-topic',
      linked_issues: ['issue-1'],
    })),
    reasoning_nodes: [
      {
        reasoning_id: 'reason-1',
        title: 'Primary court reasoning pattern',
        summary:
          input?.graphResult?.reasoning ||
          input?.graphResult?.judgeReasoning ||
          'Court reasoning summary unavailable.',
        linked_issues: ['issue-1'],
        linked_rules: laws.length ? ['rule-1'] : [],
      },
    ],
    outcome: {
      outcome_id: 'outcome-1',
      label:
        input?.graphResult?.verdict?.verdict ||
        input?.graphResult?.verdict_text ||
        'Outcome uncertain',
      summary:
        input?.graphResult?.verdict?.verdict_summary ||
        input?.graphResult?.reasoning ||
        'Outcome summary unavailable.',
    },
  }
}

function normalizeGraphExtraction(validated) {
  return {
    case_summary: validated.case_summary,
    issues: ensureIds(validated.issues, 'issue', (item) => item.title),
    arguments: ensureIds(validated.arguments, 'arg', (item) => item.title),
    evidence_items: ensureIds(validated.evidence_items, 'ev', (item) => item.label),
    legal_rules: ensureIds(validated.legal_rules, 'rule', (item) => item.label),
    reasoning_nodes: ensureIds(validated.reasoning_nodes, 'reason', (item) => item.title),
    outcome: validated.outcome,
  }
}

export const runKnowledgeGraphExtractorAgent = createStructuredLegalAgent({
  agentName: 'Knowledge Graph Extraction Agent',
  schema: knowledgeGraphExtractionSchema,
  buildPrompt: buildKnowledgeGraphExtractionPrompt,
  buildFallback: buildFallback,
  transformValidated: normalizeGraphExtraction,
  buildResult: ({ data, meta }) => ({
    graphExtraction: data,
    graphExtractionMeta: meta,
  }),
})
