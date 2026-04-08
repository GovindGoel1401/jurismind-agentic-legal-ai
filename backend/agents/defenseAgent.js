import { buildDefensePrompt } from './prompts/legalPrompts.js'
import { defenseAgentSchema } from './contracts/legalAgentSchemas.js'
import { createStructuredLegalAgent } from './shared/createStructuredLegalAgent.js'

export const runDefenseAgent = createStructuredLegalAgent({
  agentName: 'Defense Agent',
  schema: defenseAgentSchema,
  buildPrompt: buildDefensePrompt,
  buildFallback: () => ({
    defense_arguments: [
      'User-side narrative appears consistent with available facts.',
      'Relevant legal principles indicate a plausible claim for relief.',
      'Current evidence supports at least partial user-favorable outcome.',
    ],
  }),
  buildResult: ({ data, meta }) => {
    const defense_arguments = data.defense_arguments

    return {
      defense_arguments,
      defenseArgument: defense_arguments.join('\n'),
      defenseMeta: meta,
    }
  },
})
