import { buildCaseInterpreterPrompt } from './prompts/legalPrompts.js'
import { caseInterpreterSchema } from './contracts/legalAgentSchemas.js'
import { createStructuredLegalAgent } from './shared/createStructuredLegalAgent.js'

function heuristicCaseType(description = '') {
  const text = description.toLowerCase()
  if (text.includes('landlord') || text.includes('tenant') || text.includes('deposit')) {
    return 'rental_dispute'
  }
  if (text.includes('salary') || text.includes('termination') || text.includes('employer')) {
    return 'employment_dispute'
  }
  if (text.includes('contract') || text.includes('agreement')) return 'contract_dispute'
  return 'general_civil_dispute'
}

export const runCaseInterpreter = createStructuredLegalAgent({
  agentName: 'Case Interpreter',
  schema: caseInterpreterSchema,
  buildPrompt: buildCaseInterpreterPrompt,
  buildFallback: (caseInput) => {
    const inputDescription = caseInput?.description || ''
    const inputJurisdiction = caseInput?.jurisdiction || 'unknown'

    return {
      case_type: heuristicCaseType(inputDescription),
      jurisdiction: inputJurisdiction,
      entities: ['user', 'opposing_party'],
      claims: ['unfair treatment', 'financial loss'],
      possible_laws: ['contract obligations', 'consumer protection principles'],
    }
  },
  buildResult: ({ rawText, data, meta }) => ({
    interpretedText: rawText,
    ...data,
    structuredCase: data,
    caseInterpreterMeta: meta,
  }),
})
