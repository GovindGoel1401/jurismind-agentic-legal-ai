import { generateWithVertexDetailed } from '../../services/vertexLLM.js'
import {
  parseStructuredAgentResponse,
  withFallbackGuard,
} from './structuredAgentRunner.js'

export function createStructuredLegalAgent({
  agentName,
  schema,
  buildPrompt,
  buildFallback,
  transformValidated,
  buildResult,
}) {
  return async function runStructuredLegalAgent(input) {
    const prompt = buildPrompt(input)
    const llmResult = await generateWithVertexDetailed({ prompt, label: agentName })

    const { data, meta } = parseStructuredAgentResponse({
      agentName,
      schema,
      fallback: withFallbackGuard(buildFallback, input),
      transformValidated: transformValidated
        ? (validated) => transformValidated(validated, input)
        : undefined,
      llmResult,
    })

    return buildResult({
      input,
      prompt,
      rawText: llmResult.text,
      data,
      meta,
    })
  }
}
