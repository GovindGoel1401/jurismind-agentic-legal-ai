## Case Knowledge Graph

This layer augments the existing vector-based RAG system.

- Vector DB: semantic chunk retrieval and text grounding
- Knowledge Graph: relationship-centric legal reasoning for case, issue, evidence, contradiction, risk, human factors, and strategy traversal

Design reference:

- `graph/LEGAL_GRAPH_SCHEMA.md`

Current production schema families:

- `Case`, `CaseCategory`, `Jurisdiction`
- `Party`, `Role`
- `Claim`, `Defense`, `Remedy`
- `Issue`, `LegalRule`
- `Fact`, `Event`, `TimelineMarker`
- `Evidence`, `Document`, `Communication`
- `RiskFactor`, `Contradiction`, `MissingEvidence`
- `HumanFactor`, `StrategyAction`, `OutcomePattern`

Representative paths:

`Case -> Claim/Defense -> Issue -> LegalRule`

`Case -> Fact -> Evidence -> Issue`

`Case -> HumanFactor -> RiskFactor -> StrategyAction`

`Case -> MissingEvidence -> Claim/Issue`

Main entry points:

- Extraction + storage: `services/caseKnowledgeGraphService.js`
- Graph model builder: `graph/graphModelBuilder.js`
- Neo4j upsert and schema enforcement: `graph/caseGraphRepository.js`, `graph/graphSchemaSetup.js`
- Query helpers: `graph/caseGraphQueries.js`

Rebuild utilities:

- Batch rebuild service: `services/knowledgeGraphBuildService.js`
- CLI rebuild script: `scripts/rebuildKnowledgeGraph.js`
- API endpoint: `POST /api/knowledge-graph/rebuild`

Query endpoints:

- `POST /api/knowledge-graph/query` for compatibility insights bundle
- `POST /api/knowledge-graph/query/pattern` for focused graph traversals:
	- `case_surface`
	- `unsupported_claims`
	- `contradictions`
	- `human_factors`
	- `missing_evidence_clusters`
	- `unresolved_issues`
	- `structural_similar_cases`
	- `strategy_actions`

## Rebuild Neo4j Graph Now

Prerequisites:

- `KNOWLEDGE_GRAPH_ENABLED=true`
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` configured
- Case records already present in storage (`/api/cases`)

CLI (all recent cases):

```bash
npm run graph:rebuild
```

CLI (single case):

```bash
node scripts/rebuildKnowledgeGraph.js --case-id <CASE_ID>
```

CLI options:

- `--limit <n>` maximum number of recent cases when no case id is passed (default `25`, max `200`)
- `--stop-on-error` stop processing at first failed case

API (single case):

```http
POST /api/knowledge-graph/rebuild
Content-Type: application/json

{
	"case_id": "<CASE_ID>",
	"stop_on_error": true
}
```

API (batch):

```http
POST /api/knowledge-graph/rebuild
Content-Type: application/json

{
	"limit": 50,
	"stop_on_error": false
}
```

Response includes per-case status, node/relationship write counts, and overall success/failure totals.

Phased rollout guidance:

- Phase 1: schema + deterministic ingestion
- Phase 2: explainability and unresolved-issue graph queries
- Phase 3: debate-assist and structural similar-case enrichments
- Phase 4: graph-informed verdict/risk narrative layers
