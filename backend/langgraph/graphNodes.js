import { executeAgent } from './graphExecution.js'
import { normalizeGraphStageResult } from './graphStateFactory.js'
import { runCaseInterpreter } from '../agents/caseInterpreter.js'
import { runEvidenceAnalyzer } from '../agents/evidenceAnalyzer.js'
import { runLegalResearchAgent } from '../agents/legalResearchAgent.js'
import { runDefenseAgent } from '../agents/defenseAgent.js'
import { runProsecutionAgent } from '../agents/prosecutionAgent.js'
import { runDebateRebuttalAgent } from '../agents/debateRebuttalAgent.js'
import { runJudgeAgent } from '../agents/judgeAgent.js'
import { runVerdictAgent } from '../agents/verdictAgent.js'
import { runReflectionAgent } from '../agents/reflectionAgent.js'

export const graphNodes = {
  caseInterpreterNode: async (state) => {
    const result = await executeAgent('Case Interpreter', runCaseInterpreter, state.caseInput)
    return normalizeGraphStageResult({
      ...result,
      structuredCase: result.structuredCase || {},
    })
  },
  evidenceAnalyzerNode: async (state) => {
    const result = await executeAgent('Evidence Analyzer', runEvidenceAnalyzer, state)
    return normalizeGraphStageResult({
      ...result,
      evidenceAnalysis: result.evidenceAnalysis || {},
    })
  },
  legalResearchNode: async (state) => {
    const result = await executeAgent('Legal Research Agent', runLegalResearchAgent, state)
    return normalizeGraphStageResult({
      ...result,
      retrievedKnowledge: result.knowledge_bundle || {},
      retrievalRouting: result.retrieval_routing || {},
      retrievalContext: result.retrieval_context || {},
      legalResearch: result.legalResearch || {},
    })
  },
  defenseNode: async (state) => {
    const result = await executeAgent('Defense Agent', runDefenseAgent, state)
    return normalizeGraphStageResult({
      ...result,
      defense_arguments: result.defense_arguments || [],
    })
  },
  prosecutionNode: async (state) => {
    const result = await executeAgent('Prosecution Agent', runProsecutionAgent, state)
    return normalizeGraphStageResult({
      ...result,
      prosecution_arguments: result.prosecution_arguments || [],
    })
  },
  rebuttalNode: async (state) => {
    const result = await executeAgent('Debate Rebuttal Agent', runDebateRebuttalAgent, state)
    return normalizeGraphStageResult({
      ...result,
      rebuttal_points: result.rebuttal_points || [],
    })
  },
  judgeNode: async (state) => {
    const result = await executeAgent('Judge Agent', runJudgeAgent, state)
    return normalizeGraphStageResult(result)
  },
  verdictNode: async (state) => {
    const result = await executeAgent('Verdict Agent', runVerdictAgent, state)
    return normalizeGraphStageResult(result)
  },
  reflectionNode: async (state) => {
    const result = await executeAgent('Reflection Agent', runReflectionAgent, state)
    return normalizeGraphStageResult({
      ...result,
      reflection: {
        issues_found: result.issues_found || [],
        reasoning_flaws: result.reasoning_flaws || [],
        improvement_suggestions: result.improvement_suggestions || [],
        revised_confidence: result.revised_confidence ?? null,
      },
    })
  },
}
