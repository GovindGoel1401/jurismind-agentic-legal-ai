# JurisMind Legal Knowledge Graph Design

## 1) Purpose and Scope

This graph is a structured reasoning layer for relationship-centric legal intelligence. It is not a replacement for:
- primary legal authority retrieval
- evidence document retrieval
- feedback memory retrieval

Primary value:
- multi-hop traversal across case facts, issues, evidence, rules, risk, and outcomes
- contradiction and missing-link detection
- explainability support for debate and verdict layers
- structural similar-case pattern discovery

## 2) Node Model

### Core case anchor
- `Case`
  - Keys: `case_id` (unique)
  - Properties: `summary`, `status`, `created_at`, `updated_at`, `source_case_id`, `review_status`

### Case framing
- `CaseCategory`
  - Keys: `category_key` (global normalized slug)
  - Properties: `label`, `description`
- `Jurisdiction`
  - Keys: `jurisdiction_key` (global normalized slug)
  - Properties: `name`, `forum_type`

### Parties and roles
- `Party`
  - Keys: `party_key` (hybrid: case-local when unknown identity, global when stable identity is present)
  - Properties: `name`, `party_type`, `is_case_local`
- `Role`
  - Keys: `role_code` (global taxonomy)
  - Properties: `label`

### Position layer
- `Claim`
  - Keys: `claim_key` (case-local)
  - Properties: `title`, `summary`, `claim_type`, `confidence_score`
- `Defense`
  - Keys: `defense_key` (case-local)
  - Properties: `title`, `summary`, `defense_type`, `confidence_score`
- `Remedy`
  - Keys: `remedy_key` (case-local)
  - Properties: `label`, `summary`, `remedy_type`

### Fact and timeline layer
- `Fact`
  - Keys: `fact_key` (case-local)
  - Properties: `statement`, `fact_type`, `confidence_score`
- `Event`
  - Keys: `event_key` (case-local)
  - Properties: `title`, `summary`, `event_type`, `event_time_text`, `confidence_score`
- `TimelineMarker`
  - Keys: `marker_key` (case-local)
  - Properties: `label`, `raw_time`, `normalized_time`

### Evidence layer
- `Evidence`
  - Keys: `evidence_key` (case-local interpretation layer)
  - Properties: `label`, `evidence_type`, `summary`, `strength`, `confidence_score`
- `Document`
  - Keys: `document_key` (hybrid)
  - Properties: `label`, `document_type`, `file_name`
- `Communication`
  - Keys: `communication_key` (case-local)
  - Properties: `channel`, `summary`, `direction`

### Legal reasoning layer
- `Issue`
  - Keys: `issue_key` (case-local), `issue_taxonomy_key` (optional normalized key)
  - Properties: `title`, `summary`, `issue_type`, `normalized_issue`, `confidence_score`
- `LegalRule`
  - Keys: `rule_key` (global normalized key)
  - Properties: `label`, `source`, `citation`, `rule_type`

### Risk and quality layer
- `RiskFactor`
  - Keys: `risk_key` (case-local)
  - Properties: `label`, `risk_type`, `severity`, `summary`, `confidence_score`
- `Contradiction`
  - Keys: `contradiction_key` (case-local)
  - Properties: `label`, `summary`, `severity`, `confidence_score`, `review_status`
- `MissingEvidence`
  - Keys: `missing_key` (case-local)
  - Properties: `label`, `missing_type`, `impact_summary`, `severity`, `confidence_score`

### Human/context layer
- `HumanFactor`
  - Keys: `human_factor_key` (case-local)
  - Properties: `factor_type`, `summary`, `intensity`, `relevance_to_case`, `effect_area`, `confidence_score`

### Strategy and outcomes
- `StrategyAction`
  - Keys: `strategy_key` (case-local)
  - Properties: `action`, `reason`, `expected_impact`, `confidence_score`
- `OutcomePattern`
  - Keys: `pattern_key` (hybrid: mostly global pattern keys, optionally case-scoped snapshots)
  - Properties: `outcome_tendency`, `settlement_tendency`, `timeline_tendency`, `cost_tendency`, `confidence_score`

## 3) Relationship Semantics and Direction

Direction convention:
- Case outward to case-owned entities (`Case -> X`)
- Support edges point from evidence/fact to target claim/issue (`Evidence -> Claim`, `Fact -> Issue`)
- Rule applicability edges point from issue to rule (`Issue -> LegalRule`)
- Risk/quality edges point from quality node to affected object (`MissingEvidence -> Claim`)

Core relationships:
- `(Case)-[:OF_CATEGORY]->(CaseCategory)`
- `(Case)-[:IN_JURISDICTION]->(Jurisdiction)`
- `(Case)-[:HAS_PARTY]->(Party)`
- `(Party)-[:PLAYS_ROLE]->(Role)`
- `(Case)-[:HAS_CLAIM]->(Claim)`
- `(Case)-[:HAS_DEFENSE]->(Defense)`
- `(Case)-[:SEEKS_REMEDY]->(Remedy)`
- `(Case)-[:RAISES_ISSUE]->(Issue)`
- `(Case)-[:HAS_FACT]->(Fact)`
- `(Case)-[:HAS_EVENT]->(Event)`
- `(Event)-[:AT_TIME]->(TimelineMarker)`
- `(Event)-[:INVOLVES_PARTY]->(Party)`
- `(Case)-[:HAS_EVIDENCE]->(Evidence)`
- `(Evidence)-[:EVIDENCED_BY_DOCUMENT]->(Document)`
- `(Evidence)-[:EVIDENCED_BY_COMMUNICATION]->(Communication)`
- `(Fact)-[:DERIVED_FROM]->(Evidence)`
- `(Fact)-[:SUPPORTS_CLAIM]->(Claim)`
- `(Fact)-[:SUPPORTS_DEFENSE]->(Defense)`
- `(Fact)-[:RELATES_TO_ISSUE]->(Issue)`
- `(Evidence)-[:SUPPORTS_CLAIM]->(Claim)`
- `(Evidence)-[:WEAKENS_CLAIM]->(Claim)`
- `(Evidence)-[:SUPPORTS_DEFENSE]->(Defense)`
- `(Evidence)-[:WEAKENS_DEFENSE]->(Defense)`
- `(Evidence)-[:SUPPORTS_ISSUE]->(Issue)`
- `(Evidence)-[:WEAKENS_ISSUE]->(Issue)`
- `(Issue)-[:TRIGGERS_RULE]->(LegalRule)`
- `(Claim)-[:RELATES_TO_ISSUE]->(Issue)`
- `(Defense)-[:RELATES_TO_ISSUE]->(Issue)`
- `(Case)-[:HAS_RISK]->(RiskFactor)`
- `(Case)-[:HAS_CONTRADICTION]->(Contradiction)`
- `(Contradiction)-[:INVOLVES_FACT]->(Fact)`
- `(Contradiction)-[:INVOLVES_EVENT]->(Event)`
- `(Case)-[:HAS_MISSING_EVIDENCE]->(MissingEvidence)`
- `(MissingEvidence)-[:AFFECTS_CLAIM]->(Claim)`
- `(MissingEvidence)-[:AFFECTS_ISSUE]->(Issue)`
- `(Case)-[:HAS_HUMAN_FACTOR]->(HumanFactor)`
- `(HumanFactor)-[:ASSERTED_BY]->(Party)`
- `(HumanFactor)-[:RELATES_TO_EVENT]->(Event)`
- `(HumanFactor)-[:INFLUENCES_RISK]->(RiskFactor)`
- `(HumanFactor)-[:INFLUENCES_SETTLEMENT]->(OutcomePattern)`
- `(Case)-[:MATCHES_PATTERN]->(OutcomePattern)`
- `(Case)-[:HAS_STRATEGY_ACTION]->(StrategyAction)`
- `(StrategyAction)-[:ADDRESSES_RISK]->(RiskFactor)`
- `(StrategyAction)-[:ADDRESSES_MISSING_EVIDENCE]->(MissingEvidence)`
- `(StrategyAction)-[:STRENGTHENS_CLAIM]->(Claim)`
- `(Case)-[:SIMILAR_TO {similarity_score, similarity_basis, shared_issue_count, shared_risk_count}]->(Case)`

## 4) Confidence, Provenance, Review

Practical hybrid strategy:
- Store lightweight provenance on nodes and relationship properties directly.
- Avoid separate provenance nodes in phase 1 to reduce complexity.

Recommended provenance properties:
- `source_case_id`
- `source_document_id`
- `source_chunk_id`
- `extraction_method` (`llm_structured`, `rule_transform`, `hybrid`)
- `confidence_score` (0..1)
- `review_status` (`auto`, `needs_review`, `validated`)
- `created_at`
- `updated_at`

Confidence bands:
- `high`: >= 0.8
- `medium`: 0.55 to < 0.8
- `low`: < 0.55

## 5) Case-local vs Global

Case-local:
- `Fact`, `Event`, `TimelineMarker`, `Claim`, `Defense`, `Contradiction`, `MissingEvidence`, `HumanFactor`, `StrategyAction`, `RiskFactor`, case-specific `Evidence` interpretation

Global/shared:
- `Jurisdiction`, `CaseCategory`, `Role`, `LegalRule`

Hybrid:
- `Party`, `Issue`, `OutcomePattern`, `Document`

Rules:
- Always keep case-local keys prefixed with `case_id` to avoid accidental cross-case merges.
- Use global merges only for stable taxonomies and normalized legal rule identities.

## 6) Ingestion Pipeline Design

1. Intake normalization
- Normalize category, jurisdiction, and case summary.

2. Structured extraction
- Use existing extractor output (`issues`, `arguments`, `evidence_items`, `legal_rules`, `reasoning_nodes`, `outcome`) as one input stream.

3. Deterministic curation transforms
- Build case-local claims/defenses from arguments.
- Build facts, risks, contradictions, missing evidence from assessment/document intelligence.
- Build human factors from structured emotional signals.
- Build strategy actions from recommendations.

4. Link resolution
- Resolve support/weakness links (evidence/fact -> claim/issue).
- Resolve issue -> rule applicability.
- Resolve contradiction and missing evidence impacts.

5. Upsert
- Enforce schema constraints/indexes.
- MERGE by deterministic keys.
- SET provenance/confidence/review fields.

6. Similar-case pattern linking
- Link case to `OutcomePattern` and optional `SIMILAR_TO` edges with structural-basis metadata.

7. Re-ingestion/update
- Reuse deterministic keys per case.
- MERGE updates existing nodes.
- Update confidence/review and timestamps.
- Keep retries idempotent.

## 7) Query Patterns (Cypher-ready)

### A. Case reasoning surface (issues, claims, evidence, risk)
```cypher
MATCH (c:Case {case_id: $caseId})
OPTIONAL MATCH (c)-[:RAISES_ISSUE]->(i:Issue)
OPTIONAL MATCH (c)-[:HAS_CLAIM]->(cl:Claim)
OPTIONAL MATCH (c)-[:HAS_EVIDENCE]->(e:Evidence)
OPTIONAL MATCH (c)-[:HAS_RISK]->(r:RiskFactor)
RETURN c, collect(DISTINCT i) AS issues, collect(DISTINCT cl) AS claims,
       collect(DISTINCT e) AS evidence, collect(DISTINCT r) AS risks
```

### B. Unsupported claims
```cypher
MATCH (c:Case {case_id: $caseId})-[:HAS_CLAIM]->(cl:Claim)
OPTIONAL MATCH (cl)<-[:SUPPORTS_CLAIM]-(:Evidence)
WITH cl, count(*) AS support_count
WHERE support_count = 0
RETURN cl.claim_key, cl.title, cl.summary
```

### C. Contradictions
```cypher
MATCH (c:Case {case_id: $caseId})-[:HAS_CONTRADICTION]->(k:Contradiction)
OPTIONAL MATCH (k)-[:INVOLVES_FACT]->(f:Fact)
OPTIONAL MATCH (k)-[:INVOLVES_EVENT]->(e:Event)
RETURN k, collect(DISTINCT f) AS facts, collect(DISTINCT e) AS events
ORDER BY k.severity DESC
```

### D. Human factors influencing settlement posture
```cypher
MATCH (c:Case {case_id: $caseId})-[:HAS_HUMAN_FACTOR]->(h:HumanFactor)
OPTIONAL MATCH (h)-[:INFLUENCES_SETTLEMENT]->(p:OutcomePattern)
RETURN h.factor_type, h.intensity, h.summary, collect(DISTINCT p.pattern_key) AS linked_patterns
ORDER BY h.intensity DESC
```

### E. Repeated missing evidence by issue cluster
```cypher
MATCH (m:MissingEvidence)-[:AFFECTS_ISSUE]->(i:Issue)
WITH i.normalized_issue AS issue_cluster, m.label AS missing_label, count(*) AS freq
WHERE freq >= $minCount
RETURN issue_cluster, missing_label, freq
ORDER BY freq DESC
LIMIT $limit
```

### F. Issue -> rule -> similar cases
```cypher
MATCH (c:Case {case_id: $caseId})-[:RAISES_ISSUE]->(i:Issue)-[:TRIGGERS_RULE]->(r:LegalRule)
MATCH (other:Case)-[:RAISES_ISSUE]->(:Issue)-[:TRIGGERS_RULE]->(r)
WHERE other.case_id <> c.case_id
RETURN i.title AS issue, r.label AS rule, collect(DISTINCT other.case_id)[0..$limit] AS similar_cases
```

### G. Verdict explanation support/weakness paths
```cypher
MATCH (c:Case {case_id: $caseId})-[:HAS_CLAIM]->(cl:Claim)
OPTIONAL MATCH (e1:Evidence)-[s:SUPPORTS_CLAIM]->(cl)
OPTIONAL MATCH (e2:Evidence)-[w:WEAKENS_CLAIM]->(cl)
RETURN cl.title AS claim,
       collect(DISTINCT {evidence: e1.label, confidence: s.confidence_score}) AS support,
       collect(DISTINCT {evidence: e2.label, confidence: w.confidence_score}) AS weakness
```

### H. Structural similar cases by issue+risk+missing evidence overlap
```cypher
MATCH (seed:Case {case_id: $caseId})-[:RAISES_ISSUE]->(i:Issue)
WITH seed, collect(DISTINCT i.normalized_issue) AS seed_issues
MATCH (seed)-[:HAS_RISK]->(r:RiskFactor)
WITH seed, seed_issues, collect(DISTINCT r.risk_type) AS seed_risks
MATCH (seed)-[:HAS_MISSING_EVIDENCE]->(m:MissingEvidence)
WITH seed, seed_issues, seed_risks, collect(DISTINCT m.label) AS seed_missing
MATCH (other:Case)
WHERE other.case_id <> seed.case_id
OPTIONAL MATCH (other)-[:RAISES_ISSUE]->(oi:Issue)
OPTIONAL MATCH (other)-[:HAS_RISK]->(orisk:RiskFactor)
OPTIONAL MATCH (other)-[:HAS_MISSING_EVIDENCE]->(om:MissingEvidence)
WITH other, seed_issues, seed_risks, seed_missing,
     collect(DISTINCT oi.normalized_issue) AS other_issues,
     collect(DISTINCT orisk.risk_type) AS other_risks,
     collect(DISTINCT om.label) AS other_missing
WITH other,
     size([x IN other_issues WHERE x IN seed_issues]) AS issue_overlap,
     size([x IN other_risks WHERE x IN seed_risks]) AS risk_overlap,
     size([x IN other_missing WHERE x IN seed_missing]) AS missing_overlap
RETURN other.case_id, issue_overlap, risk_overlap, missing_overlap,
       (issue_overlap * 2 + risk_overlap + missing_overlap) AS structural_score
ORDER BY structural_score DESC
LIMIT $limit
```

### I. Unresolved debate issues
```cypher
MATCH (c:Case {case_id: $caseId})-[:RAISES_ISSUE]->(i:Issue)
OPTIONAL MATCH (:Evidence)-[:SUPPORTS_ISSUE]->(i)
OPTIONAL MATCH (m:MissingEvidence)-[:AFFECTS_ISSUE]->(i)
WITH i, count(DISTINCT m) AS missing_count, count(DISTINCT *) AS support_count
WHERE missing_count > 0 OR support_count = 0
RETURN i.issue_key, i.title, i.summary, missing_count, support_count
ORDER BY missing_count DESC
```

### J. Strategy actions for weaknesses
```cypher
MATCH (c:Case {case_id: $caseId})-[:HAS_STRATEGY_ACTION]->(s:StrategyAction)
OPTIONAL MATCH (s)-[:ADDRESSES_RISK]->(r:RiskFactor)
OPTIONAL MATCH (s)-[:ADDRESSES_MISSING_EVIDENCE]->(m:MissingEvidence)
RETURN s.action, s.reason, collect(DISTINCT r.label) AS addressed_risks,
       collect(DISTINCT m.label) AS addressed_missing_evidence
ORDER BY s.confidence_score DESC
```

## 8) Integration Plan

Phase 1: Schema + ingestion foundation
- enforce constraints/indexes
- deterministic upsert pipeline
- baseline graph surface query per case

Phase 2: Explainability and unresolved issue queries
- expose contradiction/missing evidence/debate weakness queries
- attach graph explainability snippets in analysis and verdict payloads

Phase 3: Graph-enhanced retrieval and debate assistance
- use structural overlaps for similar-case explanation
- use unresolved issue graph queries to rank debate follow-up prompts

Phase 4: Verdict/risk enrichment
- include graph support/weakness paths in final verdict confidence explanation
- include settlement posture from human-factor plus risk linkage

## 9) Guardrails

- Graph does not replace legal authority validation.
- No hallucinated legal rule links.
- No global merge for case-local facts/events.
- No vague relationship names.
- Human factors never modeled as legal authority.
- Keep schema practical and query-driven.
