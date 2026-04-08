import { buildJudgePrompt } from './prompts/legalPrompts.js'
import { clampRange } from './shared/agentOutput.js'
import { judgeAgentSchema } from './contracts/legalAgentSchemas.js'
import { createStructuredLegalAgent } from './shared/createStructuredLegalAgent.js'

function normalizeProbabilities(user, opponent, settlement) {
  const u = Number.isFinite(user) ? Math.max(0, user) : 0.4
  const o = Number.isFinite(opponent) ? Math.max(0, opponent) : 0.35
  const s = Number.isFinite(settlement) ? Math.max(0, settlement) : 0.25
  const sum = u + o + s || 1
  return {
    user: u / sum,
    opponent: o / sum,
    settlement: s / sum,
  }
}

export const runJudgeAgent = createStructuredLegalAgent({
  agentName: 'Judge Agent',
  schema: judgeAgentSchema,
  buildPrompt: buildJudgePrompt,
  buildFallback: () => ({
    reasoning:
      'Balanced assessment: user arguments are plausible but evidence gaps keep litigation risk moderate.',
    win_probability_user: 0.4,
    win_probability_opponent: 0.35,
    settlement_probability: 0.25,
  }),
  transformValidated: (validated) => ({
    reasoning: validated.reasoning,
    win_probability_user: clampRange(validated.win_probability_user, 0, 1, 0.4),
    win_probability_opponent: clampRange(validated.win_probability_opponent, 0, 1, 0.35),
    settlement_probability: clampRange(validated.settlement_probability, 0, 1, 0.25),
  }),
  buildResult: ({ data, meta }) => {
    const probs = normalizeProbabilities(
      data.win_probability_user,
      data.win_probability_opponent,
      data.settlement_probability,
    )

    return {
      reasoning: data.reasoning,
      win_probability_user: probs.user,
      win_probability_opponent: probs.opponent,
      settlement_probability: probs.settlement,
      judgeReasoning: data.reasoning,
      probability: {
        userWin: probs.user,
        opponentWin: probs.opponent,
        settlement: probs.settlement,
      },
      riskScore: 1 - probs.user,
      judgeMeta: meta,
    }
  },
})
