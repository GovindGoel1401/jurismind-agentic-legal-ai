import { executeAgent } from './graphExecution.js'
import { mergeStageState } from './graphStateFactory.js'
import { runCaseInterpreter } from '../agents/caseInterpreter.js'
import { runEvidenceAnalyzer } from '../agents/evidenceAnalyzer.js'
import { runLegalResearchAgent } from '../agents/legalResearchAgent.js'
import { runDefenseAgent } from '../agents/defenseAgent.js'
import { runProsecutionAgent } from '../agents/prosecutionAgent.js'
import { runDebateRebuttalAgent } from '../agents/debateRebuttalAgent.js'
import { runJudgeAgent } from '../agents/judgeAgent.js'
import { runVerdictAgent } from '../agents/verdictAgent.js'
import { runReflectionAgent } from '../agents/reflectionAgent.js'

function buildFallbackSeed(input) {
  return {
    caseInput: input?.caseInput || input,
    feedbackLearning: input?.feedbackLearning || {},
  }
}

export async function runFallbackPipeline(input) {
  let currentState = buildFallbackSeed(input)

  const interpreted = await executeAgent('Case Interpreter', runCaseInterpreter, currentState.caseInput)
  currentState = mergeStageState(currentState, interpreted)

  const evidence = await executeAgent('Evidence Analyzer', runEvidenceAnalyzer, currentState)
  currentState = mergeStageState(currentState, evidence)

  const research = await executeAgent('Legal Research Agent', runLegalResearchAgent, currentState)
  currentState = mergeStageState(currentState, research)

  const [defense, prosecution] = await Promise.all([
    executeAgent('Defense Agent', runDefenseAgent, currentState),
    executeAgent('Prosecution Agent', runProsecutionAgent, currentState),
  ])

  currentState = mergeStageState(currentState, defense)
  currentState = mergeStageState(currentState, prosecution)

  const rebuttal = await executeAgent('Debate Rebuttal Agent', runDebateRebuttalAgent, currentState)
  currentState = mergeStageState(currentState, rebuttal)

  const judge = await executeAgent('Judge Agent', runJudgeAgent, currentState)
  currentState = mergeStageState(currentState, judge)

  const verdict = await executeAgent('Verdict Agent', runVerdictAgent, currentState)
  currentState = mergeStageState(currentState, verdict)

  const reflection = await executeAgent('Reflection Agent', runReflectionAgent, currentState)
  currentState = mergeStageState(currentState, reflection)

  return currentState
}
