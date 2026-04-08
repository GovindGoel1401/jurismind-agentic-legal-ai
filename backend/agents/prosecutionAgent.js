import { buildProsecutionPrompt } from './prompts/legalPrompts.js'
import { prosecutionAgentSchema } from './contracts/legalAgentSchemas.js'
import { createStructuredLegalAgent } from './shared/createStructuredLegalAgent.js'

export const runProsecutionAgent = createStructuredLegalAgent({
  agentName: 'Prosecution Agent',
  schema: prosecutionAgentSchema,
  buildPrompt: buildProsecutionPrompt,
  buildFallback: () => ({
    prosecution_arguments: [
      'Evidence gaps reduce certainty of the user-side claims.',
      'Opposing side can contest interpretation of legal obligations.',
      'Contradictions or missing records may weaken user probability of full success.',
    ],
  }),
  buildResult: ({ data, meta }) => {
    const prosecution_arguments = data.prosecution_arguments

    return {
      prosecution_arguments,
      prosecutionArgument: prosecution_arguments.join('\n'),
      prosecutionMeta: meta,
    }
  },
})
