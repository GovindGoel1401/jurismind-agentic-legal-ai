import { runLegalResearchWorkflow } from '../services/legalResearchWorkflowService.js'

export async function runLegalResearchAgent(state) {
  // Hybrid Retrieval Workflow:
  // 1) Generate embeddings via Vertex AI
  // 2) Vector RAG from Pinecone
  // 3) CRAG relevance evaluator
  // 4) If relevance is weak, corrective GraphRAG query in Neo4j
  // 5) Merge into normalized legal knowledge bundle with workflow metadata
  return runLegalResearchWorkflow(state)
}
