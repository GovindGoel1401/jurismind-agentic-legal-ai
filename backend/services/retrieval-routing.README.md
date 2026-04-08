## Retrieval Routing Flow

This backend now adds a lightweight retrieval router before legal research is assembled for the debate-oriented agents.

Store split:

- Rules and law files -> Qdrant
- Judgment and similar-case files -> Qdrant
- Debate memory and user-uploaded evidence/documents -> FAISS / faiss-node

Flow:

1. `routeRetrievalNeed(...)` asks a small structured router prompt whether the current step needs:
   - evidence retrieval
   - rules retrieval
   - no retrieval
2. `getConditionalRetrievedContext(...)` performs only the requested retrieval work.
3. `buildLegalResearchResult(...)` normalizes the routed retrieval output into:
   - `retrieval_routing`
   - `retrieval_context`
   - combined `knowledge_bundle`
4. Similar-case retrieval uses Qdrant by default for judgment files.
5. Defense, prosecution, rebuttal, and judge prompts receive retrieval blocks only when present.

Extension points:

- Add query rewriting inside `routeRetrievalNeed(...)` or before retrieval calls.
- Add metadata filters in `retrieveEvidenceContext(...)` and `retrieveRulesContext(...)`.
- Add reranking/compression inside `getConditionalRetrievedContext(...)`.
- Swap namespaces or providers without changing downstream prompt builders.
