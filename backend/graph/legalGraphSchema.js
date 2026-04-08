export const RELATION_CONFIDENCE_BANDS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

export const HUMAN_FACTOR_TYPES = [
  'hardship',
  'dependency_pressure',
  'coercion_pressure',
  'trust_breakdown',
  'reputational_harm',
  'family_business_hardship',
  'urgency_distress',
  'remorse_apology',
  'settlement_pressure',
  'relational_damage',
]

export const RISK_FACTOR_TYPES = [
  'evidence_gap',
  'credibility_risk',
  'timeline_conflict',
  'legal_fit_risk',
  'strategy_risk',
  'settlement_volatility',
]

export const ISSUE_CATEGORIES = [
  'contract_dispute',
  'payment_proof',
  'timeline_contradiction',
  'document_support',
  'credibility_attack',
  'risk_exposure',
  'general_issue',
]

export const EVIDENCE_TYPES = [
  'document',
  'communication',
  'transaction_record',
  'timeline_record',
  'admission',
  'other',
]

export const GRAPH_SCHEMA_CONSTRAINTS = [
  'CREATE CONSTRAINT case_case_id_unique IF NOT EXISTS FOR (n:Case) REQUIRE n.case_id IS UNIQUE',
  'CREATE CONSTRAINT case_category_key_unique IF NOT EXISTS FOR (n:CaseCategory) REQUIRE n.category_key IS UNIQUE',
  'CREATE CONSTRAINT jurisdiction_key_unique IF NOT EXISTS FOR (n:Jurisdiction) REQUIRE n.jurisdiction_key IS UNIQUE',
  'CREATE CONSTRAINT role_code_unique IF NOT EXISTS FOR (n:Role) REQUIRE n.role_code IS UNIQUE',
  'CREATE CONSTRAINT party_key_unique IF NOT EXISTS FOR (n:Party) REQUIRE n.party_key IS UNIQUE',
  'CREATE CONSTRAINT claim_key_unique IF NOT EXISTS FOR (n:Claim) REQUIRE n.claim_key IS UNIQUE',
  'CREATE CONSTRAINT defense_key_unique IF NOT EXISTS FOR (n:Defense) REQUIRE n.defense_key IS UNIQUE',
  'CREATE CONSTRAINT remedy_key_unique IF NOT EXISTS FOR (n:Remedy) REQUIRE n.remedy_key IS UNIQUE',
  'CREATE CONSTRAINT issue_key_unique IF NOT EXISTS FOR (n:Issue) REQUIRE n.issue_key IS UNIQUE',
  'CREATE CONSTRAINT fact_key_unique IF NOT EXISTS FOR (n:Fact) REQUIRE n.fact_key IS UNIQUE',
  'CREATE CONSTRAINT event_key_unique IF NOT EXISTS FOR (n:Event) REQUIRE n.event_key IS UNIQUE',
  'CREATE CONSTRAINT marker_key_unique IF NOT EXISTS FOR (n:TimelineMarker) REQUIRE n.marker_key IS UNIQUE',
  'CREATE CONSTRAINT evidence_key_unique IF NOT EXISTS FOR (n:Evidence) REQUIRE n.evidence_key IS UNIQUE',
  'CREATE CONSTRAINT document_key_unique IF NOT EXISTS FOR (n:Document) REQUIRE n.document_key IS UNIQUE',
  'CREATE CONSTRAINT communication_key_unique IF NOT EXISTS FOR (n:Communication) REQUIRE n.communication_key IS UNIQUE',
  'CREATE CONSTRAINT legal_rule_key_unique IF NOT EXISTS FOR (n:LegalRule) REQUIRE n.rule_key IS UNIQUE',
  'CREATE CONSTRAINT risk_key_unique IF NOT EXISTS FOR (n:RiskFactor) REQUIRE n.risk_key IS UNIQUE',
  'CREATE CONSTRAINT contradiction_key_unique IF NOT EXISTS FOR (n:Contradiction) REQUIRE n.contradiction_key IS UNIQUE',
  'CREATE CONSTRAINT missing_key_unique IF NOT EXISTS FOR (n:MissingEvidence) REQUIRE n.missing_key IS UNIQUE',
  'CREATE CONSTRAINT human_factor_key_unique IF NOT EXISTS FOR (n:HumanFactor) REQUIRE n.human_factor_key IS UNIQUE',
  'CREATE CONSTRAINT strategy_key_unique IF NOT EXISTS FOR (n:StrategyAction) REQUIRE n.strategy_key IS UNIQUE',
  'CREATE CONSTRAINT outcome_pattern_key_unique IF NOT EXISTS FOR (n:OutcomePattern) REQUIRE n.pattern_key IS UNIQUE',
]

export const GRAPH_SCHEMA_INDEXES = [
  'CREATE INDEX issue_normalized_issue_idx IF NOT EXISTS FOR (n:Issue) ON (n.normalized_issue)',
  'CREATE INDEX evidence_type_idx IF NOT EXISTS FOR (n:Evidence) ON (n.evidence_type)',
  'CREATE INDEX human_factor_type_idx IF NOT EXISTS FOR (n:HumanFactor) ON (n.factor_type)',
  'CREATE INDEX risk_type_idx IF NOT EXISTS FOR (n:RiskFactor) ON (n.risk_type)',
  'CREATE INDEX outcome_tendency_idx IF NOT EXISTS FOR (n:OutcomePattern) ON (n.outcome_tendency)',
]

export const CASE_LOCAL_LABELS = new Set([
  'Claim',
  'Defense',
  'Remedy',
  'Issue',
  'Fact',
  'Event',
  'TimelineMarker',
  'Evidence',
  'Communication',
  'RiskFactor',
  'Contradiction',
  'MissingEvidence',
  'HumanFactor',
  'StrategyAction',
])

export const GLOBAL_LABELS = new Set([
  'CaseCategory',
  'Jurisdiction',
  'Role',
  'LegalRule',
])

export const HYBRID_LABELS = new Set(['Party', 'Document', 'OutcomePattern'])
