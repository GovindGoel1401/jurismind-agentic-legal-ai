import { END, START, StateGraph } from '@langchain/langgraph'
import { logger } from '../utils/logger.js'
import { GraphState } from './state.js'
import { createInitialGraphState, normalizeGraphStateSnapshot } from './graphStateFactory.js'
import { graphNodes } from './graphNodes.js'
import { runFallbackPipeline } from './fallbackPipeline.js'

const workflow = new StateGraph(GraphState)
  .addNode('caseInterpreterNode', graphNodes.caseInterpreterNode)
  .addNode('evidenceAnalyzerNode', graphNodes.evidenceAnalyzerNode)
  .addNode('legalResearchNode', graphNodes.legalResearchNode)
  .addNode('defenseNode', graphNodes.defenseNode)
  .addNode('prosecutionNode', graphNodes.prosecutionNode)
  .addNode('rebuttalNode', graphNodes.rebuttalNode)
  .addNode('judgeNode', graphNodes.judgeNode)
  .addNode('verdictNode', graphNodes.verdictNode)
  .addNode('reflectionNode', graphNodes.reflectionNode)
  .addEdge(START, 'caseInterpreterNode')
  .addEdge('caseInterpreterNode', 'evidenceAnalyzerNode')
  .addEdge('evidenceAnalyzerNode', 'legalResearchNode')
  .addEdge('legalResearchNode', 'defenseNode')
  .addEdge('legalResearchNode', 'prosecutionNode')
  .addEdge('defenseNode', 'rebuttalNode')
  .addEdge('prosecutionNode', 'rebuttalNode')
  .addEdge('rebuttalNode', 'judgeNode')
  .addEdge('judgeNode', 'verdictNode')
  .addEdge('verdictNode', 'reflectionNode')
  .addEdge('reflectionNode', END)

const compiledGraph = workflow.compile()

export async function runAgentGraph(input) {
  const initialState = createInitialGraphState(input)

  try {
    // Reasoning graph:
    // START -> Case Interpreter -> Evidence Analyzer -> Legal Research ->
    // (parallel) Defense + Prosecution -> Rebuttal -> Judge -> Verdict ->
    // Reflection -> Final Verdict -> END
    const graphResult = await compiledGraph.invoke(initialState)
    return normalizeGraphStateSnapshot(graphResult)
  } catch (error) {
    logger.warn('LangGraph invocation failed, using fallback pipeline.', error?.message)
    return runFallbackPipeline(input)
  }
}
