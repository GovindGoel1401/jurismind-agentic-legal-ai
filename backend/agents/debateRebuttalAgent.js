import { buildDebateRebuttalPrompt } from './prompts/legalPrompts.js'
import { debateRebuttalSchema } from './contracts/legalAgentSchemas.js'
import { clampRange } from './shared/agentOutput.js'
import { createStructuredLegalAgent } from './shared/createStructuredLegalAgent.js'

export const runDebateRebuttalAgent = createStructuredLegalAgent({
  agentName: 'Debate Rebuttal Agent',
  schema: debateRebuttalSchema,
  buildPrompt: buildDebateRebuttalPrompt,
  buildFallback: () => ({
    rebuttal_points: [
      'Defense appears stronger where documentary evidence is consistent.',
      'Prosecution gains leverage when missing records create uncertainty.',
    ],
    debate_balance_score: 0.5,
  }),
  transformValidated: (validated) => ({
    rebuttal_points: validated.rebuttal_points,
    debate_balance_score: clampRange(validated.debate_balance_score, 0, 1, 0.5),
  }),
  buildResult: ({ data, meta }) => ({
    rebuttal_points: data.rebuttal_points,
    debate_balance_score: data.debate_balance_score,
    rebuttalSummary: data.rebuttal_points.join('\n'),
    rebuttalMeta: meta,
  }),
})
