import { buildReflectionPrompt } from './prompts/legalPrompts.js'
import { clamp01 } from './shared/agentOutput.js'
import { reflectionAgentSchema } from './contracts/legalAgentSchemas.js'
import { createStructuredLegalAgent } from './shared/createStructuredLegalAgent.js'

export const runReflectionAgent = createStructuredLegalAgent({
  agentName: 'Reflection Agent',
  schema: reflectionAgentSchema,
  buildPrompt: buildReflectionPrompt,
  buildFallback: (state) => {
    const originalConfidence = clamp01(state.confidence ?? state.verdict?.confidence)
    return {
      issues_found: state.relevant_laws?.length
        ? []
        : ['Limited explicit legal references in the verdict rationale.'],
      reasoning_flaws: state.evidenceAnalysis?.contradictions?.length
        ? ['Potential contradiction handling is not fully explicit.']
        : [],
      improvement_suggestions: [
        'Cite more concrete legal sections in final rationale.',
        'Explain how evidence score influenced probability splits.',
      ],
      revised_confidence: Math.max(0.1, originalConfidence - 0.03),
    }
  },
  transformValidated: (validated, state) => {
    const originalConfidence = clamp01(state.confidence ?? state.verdict?.confidence)
    return {
      ...validated,
      revised_confidence: clamp01(validated.revised_confidence, originalConfidence),
    }
  },
  buildResult: ({ input: state, data, meta }) => {
    const originalConfidence = clamp01(state.confidence ?? state.verdict?.confidence)
    const issues_found = data.issues_found
    const reasoning_flaws = data.reasoning_flaws
    const improvement_suggestions = data.improvement_suggestions
    const revised_confidence = clamp01(
      data.revised_confidence ?? Math.max(0.1, originalConfidence - issues_found.length * 0.03),
    )

    const finalVerdict = {
      ...(state.verdict || {}),
      confidence: Number(revised_confidence.toFixed(2)),
      learning_summary: state?.feedbackLearning?.summary || '',
      reflection: {
        issues_found,
        reasoning_flaws,
        improvement_suggestions,
        revised_confidence: Number(revised_confidence.toFixed(2)),
      },
    }

    return {
      issues_found,
      reasoning_flaws,
      improvement_suggestions,
      revised_confidence: Number(revised_confidence.toFixed(2)),
      final_verdict: finalVerdict,
      verdict: finalVerdict,
      reflectionMeta: meta,
    }
  },
})
