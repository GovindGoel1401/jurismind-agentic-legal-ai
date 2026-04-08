import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
})

export const env = {
  PORT: Number(process.env.PORT || 8000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || '0.0.0.0',
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || '',

  VERTEX_AI_API_KEY: process.env.VERTEX_AI_API_KEY || '',
  VERTEX_AI_SERVICE_ACCOUNT_JSON: process.env.VERTEX_AI_SERVICE_ACCOUNT_JSON || '',
  VERTEX_AI_MODEL: process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash',
  VERTEX_AI_EMBEDDING_MODEL:
    process.env.VERTEX_AI_EMBEDDING_MODEL ||
    process.env.VERTEX_AI_TEXT_EMBEDDING_MODEL ||
    'text-embedding-005',
  EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER || 'vertex_ai',
  VERTEX_AI_PROJECT_ID: process.env.VERTEX_AI_PROJECT_ID || '',
  VERTEX_AI_LOCATION: process.env.VERTEX_AI_LOCATION || 'us-central1',
  VERTEX_AI_ACCESS_TOKEN: process.env.VERTEX_AI_ACCESS_TOKEN || '',
  VERTEX_AI_INDEX_ID: process.env.VERTEX_AI_INDEX_ID || '',
  VERTEX_AI_INDEX_ENDPOINT_ID: process.env.VERTEX_AI_INDEX_ENDPOINT_ID || '',
  VERTEX_AI_DEPLOYED_INDEX_ID: process.env.VERTEX_AI_DEPLOYED_INDEX_ID || '',
  VERTEX_AI_PUBLIC_DOMAIN: process.env.VERTEX_AI_PUBLIC_DOMAIN || '',
  VERTEX_AI_TEXT_EMBEDDING_MODEL:
    process.env.VERTEX_AI_TEXT_EMBEDDING_MODEL || 'text-embedding-005',
  VERTEX_AI_MULTIMODAL_MODEL:
    process.env.VERTEX_AI_MULTIMODAL_MODEL || 'multimodalembedding@001',

  PINECONE_API_KEY: process.env.PINECONE_API_KEY || '',
  PINECONE_ENV: process.env.PINECONE_ENV || '',
  PINECONE_INDEX: process.env.PINECONE_INDEX || '',
  PINECONE_NAMESPACE: process.env.PINECONE_NAMESPACE || '',
  PINECONE_EVIDENCE_NAMESPACE:
    process.env.PINECONE_EVIDENCE_NAMESPACE || process.env.PINECONE_NAMESPACE || '',
  PINECONE_RULES_NAMESPACE:
    process.env.PINECONE_RULES_NAMESPACE || process.env.PINECONE_NAMESPACE || '',
  VECTOR_DB_PROVIDER: process.env.VECTOR_DB_PROVIDER || 'qdrant',

  CHROMA_HOST: process.env.CHROMA_HOST || '',
  CHROMA_API_KEY: process.env.CHROMA_API_KEY || '',
  CHROMA_TENANT: process.env.CHROMA_TENANT || '',
  CHROMA_DATABASE: process.env.CHROMA_DATABASE || '',
  CHROMA_URL: process.env.CHROMA_URL || '',
  CHROMA_QUERY_URL: process.env.CHROMA_QUERY_URL || '',
  CHROMA_ADD_URL: process.env.CHROMA_ADD_URL || '',
  CHROMA_COLLECTION: process.env.CHROMA_COLLECTION || '',
  CHROMA_JUDGMENTS_COLLECTION:
    process.env.CHROMA_JUDGMENTS_COLLECTION || process.env.CHROMA_COLLECTION || '',
  CHROMA_SIMILAR_CASES_COLLECTION:
    process.env.CHROMA_SIMILAR_CASES_COLLECTION ||
    process.env.CHROMA_JUDGMENTS_COLLECTION ||
    process.env.CHROMA_COLLECTION ||
    'similar_cases_contracts',

  LLAMA_CLOUD_API_KEY: process.env.LLAMA_CLOUD_API_KEY || '',
  LLAMA_CLOUD_PIPELINE_ID: process.env.LLAMA_CLOUD_PIPELINE_ID || '',
  LLAMA_CLOUD_PROJECT_NAME: process.env.LLAMA_CLOUD_PROJECT_NAME || '',
  LLAMA_CLOUD_RULES_TOP_K: Number(process.env.LLAMA_CLOUD_RULES_TOP_K || 4),

  FAISS_API_URL: process.env.FAISS_API_URL || '',
  FAISS_QUERY_PATH: process.env.FAISS_QUERY_PATH || '/query',
  FAISS_UPSERT_PATH: process.env.FAISS_UPSERT_PATH || '/upsert',
  FAISS_EVIDENCE_INDEX: process.env.FAISS_EVIDENCE_INDEX || 'evidence',
  FAISS_DEBATE_INDEX: process.env.FAISS_DEBATE_INDEX || 'debate_memory',
  FAISS_FEEDBACK_MEMORY_INDEX: process.env.FAISS_FEEDBACK_MEMORY_INDEX || 'feedback_memory',
  FAISS_NODE_INDEX_DIR: process.env.FAISS_NODE_INDEX_DIR || '',

  QDRANT_URL: process.env.QDRANT_URL || '',
  QDRANT_API_KEY: process.env.QDRANT_API_KEY || '',
  QDRANT_SIMILAR_CASES_COLLECTION:
    process.env.QDRANT_SIMILAR_CASES_COLLECTION || 'similar_cases',
  QDRANT_RULES_COLLECTION: process.env.QDRANT_RULES_COLLECTION || 'rules',
  QDRANT_FEEDBACK_MEMORY_COLLECTION:
    process.env.QDRANT_FEEDBACK_MEMORY_COLLECTION || 'feedback_memory',

  NEO4J_URI: process.env.NEO4J_URI || '',
  NEO4J_QUERY_API_URL: process.env.NEO4J_QUERY_API_URL || '',
  NEO4J_USER: process.env.NEO4J_USER || '',
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || '',

  MONGO_URI: process.env.MONGO_URI || '',
  CASE_PERSISTENCE_ENABLED:
    String(
      process.env.CASE_PERSISTENCE_ENABLED || (process.env.MONGO_URI ? 'true' : 'false'),
    ) === 'true',
  KNOWLEDGE_GRAPH_ENABLED: String(process.env.KNOWLEDGE_GRAPH_ENABLED || 'false') === 'true',
  DATASET_ROOT: process.env.DATASET_ROOT || '',
  LEGAL_CASES_DATASET_PATH: process.env.LEGAL_CASES_DATASET_PATH || '',
  LEGAL_STATUTES_DATASET_PATH: process.env.LEGAL_STATUTES_DATASET_PATH || '',
  LEGAL_EMBEDDINGS_CACHE_PATH: process.env.LEGAL_EMBEDDINGS_CACHE_PATH || '',
  FEEDBACK_MEMORY_ENABLED: String(process.env.FEEDBACK_MEMORY_ENABLED || 'true') !== 'false',
  DEBATE_GENERATOR_FORCE_FALLBACK:
    String(process.env.DEBATE_GENERATOR_FORCE_FALLBACK || 'false') === 'true',
}
