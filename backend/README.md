# JurisMind AI Backend

Node.js + Express backend for JurisMind AI. The backend exposes legal analysis, document intelligence, debate simulation, similar-case retrieval, feedback learning, and optional knowledge-graph endpoints.

## Entry Point

- Server entry file: `server.js`
- Health endpoint: `GET /health`

## Local Run

1. Install dependencies:
   - `npm install`
2. Create an env file:
   - copy `.env.example` to `.env`
3. Start the API:
   - `npm start`

Default local URL:
- `http://localhost:8000`

## Render Web Service

Render settings for this backend:

- Root directory: `backend`
- Build command: `npm ci --omit=dev`
- Start command: `npm start`
- Health check path: `/health`

The server binds with:
- `PORT` from Render
- `HOST=0.0.0.0` by default

## Runtime Integrations In This Codebase

This backend currently resolves providers like this:

- LLM generation: Vertex AI via `services/vertexLLM.js`
- Embeddings: Vertex AI via `services/vertexEmbedding.js`
- Similar cases and judgments:
  - Chroma if `CHROMA_API_KEY` or `CHROMA_URL` or `CHROMA_HOST` is configured
  - otherwise Qdrant
- Rules retrieval: Qdrant
- Evidence, debate memory, feedback memory:
  - external FAISS service if `FAISS_API_URL` is configured
  - otherwise local `faiss-node` fallback
- Case persistence: MongoDB if enabled
- Knowledge graph: Neo4j only when `KNOWLEDGE_GRAPH_ENABLED=true`

## Render Environment Variables

Minimum env for the server to boot:

- `NODE_ENV=production`
- `CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app`

Minimum env for full Vertex-powered generation + embeddings on Render:

- `VERTEX_AI_PROJECT_ID`
- `VERTEX_AI_LOCATION`
- `VERTEX_AI_SERVICE_ACCOUNT_JSON`
- `VERTEX_AI_MODEL`
- `VERTEX_AI_TEXT_EMBEDDING_MODEL`
- `VERTEX_AI_MULTIMODAL_MODEL`

Optional Vertex generation fallback:

- `VERTEX_AI_API_KEY`

Current retrieval stack envs by feature:

- Chroma similar cases:
  - `CHROMA_API_KEY`
  - `CHROMA_TENANT`
  - `CHROMA_DATABASE`
  - `CHROMA_URL` or `CHROMA_HOST`
  - `CHROMA_SIMILAR_CASES_COLLECTION`
  - `CHROMA_JUDGMENTS_COLLECTION`
- Qdrant rules:
  - `QDRANT_URL`
  - `QDRANT_API_KEY`
  - `QDRANT_RULES_COLLECTION`
  - `QDRANT_SIMILAR_CASES_COLLECTION`
  - `QDRANT_FEEDBACK_MEMORY_COLLECTION`
- FAISS service for evidence/debate/feedback memory:
  - `FAISS_API_URL`
  - `FAISS_QUERY_PATH`
  - `FAISS_UPSERT_PATH`
  - `FAISS_EVIDENCE_INDEX`
  - `FAISS_DEBATE_INDEX`
  - `FAISS_FEEDBACK_MEMORY_INDEX`
- MongoDB persistence:
  - `MONGO_URI`
  - `CASE_PERSISTENCE_ENABLED=true`
- Neo4j knowledge graph:
  - `KNOWLEDGE_GRAPH_ENABLED=true`
  - `NEO4J_URI`
  - `NEO4J_USER`
  - `NEO4J_PASSWORD`

## Render Deployment Notes For This Project

- `faiss-node` is now an optional dependency so Render build is less likely to fail on native compilation.
- If `FAISS_API_URL` is not set, evidence/debate/feedback-memory indexes fall back to local disk storage under `data/faiss`. That works on a web service, but Render disk is ephemeral, so those indexes will not persist across restarts.
- `VERTEX_AI_ACCESS_TOKEN` works, but it is not a durable Render secret because access tokens expire. Prefer `VERTEX_AI_SERVICE_ACCOUNT_JSON`.
- PDF ingestion utilities in `services/ingestion/pdfTextExtractor.js` call `python` and a local script. That path is not required for the web server to boot, but it is required if you run ingestion scripts on Render.
- If MongoDB is not configured, cases fall back to in-memory storage and will be lost on restart.
- If Neo4j is not configured or graph is disabled, graph endpoints degrade gracefully and return empty graph insights instead of crashing startup.

## API Endpoints

- `GET /health`
- `POST /api/analyze-case`
- `POST /api/document-intelligence`
- `GET /api/cases`
- `GET /api/cases/:caseId`
- `POST /api/similar-cases`
- `POST /api/debate-simulation/*`
- `POST /api/feedback`
- `POST /api/knowledge-graph/query`
