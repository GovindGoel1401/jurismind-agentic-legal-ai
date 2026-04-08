function asArray(value) {
  return Array.isArray(value) ? value : []
}

function slugify(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeKey(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function nowIso() {
  return new Date().toISOString()
}

function buildBaseMeta({ caseId, extractionMethod = 'hybrid' }) {
  return {
    source_case_id: caseId,
    source_document_id: '',
    source_chunk_id: '',
    extraction_method: extractionMethod,
    confidence_score: 0.68,
    review_status: 'auto',
    created_at: nowIso(),
    updated_at: nowIso(),
  }
}

function addNode(nodes, key, label, idField, idValue, properties) {
  nodes[key] = {
    label,
    idField,
    idValue,
    properties,
  }
}

function pushRel(relationships, from, type, to, properties = {}) {
  relationships.push({ from, type, to, properties })
}

function deriveIssueType(raw = '') {
  const text = normalizeKey(raw)
  if (text.includes('payment')) return 'payment_proof'
  if (text.includes('contrad')) return 'timeline_contradiction'
  if (text.includes('document')) return 'document_support'
  if (text.includes('risk')) return 'risk_exposure'
  if (text.includes('credib')) return 'credibility_attack'
  return 'general_issue'
}

function deriveRiskType(raw = '') {
  const text = normalizeKey(raw)
  if (text.includes('document') || text.includes('evidence')) return 'evidence_gap'
  if (text.includes('contrad') || text.includes('timeline')) return 'timeline_conflict'
  if (text.includes('credib')) return 'credibility_risk'
  if (text.includes('settlement')) return 'settlement_volatility'
  return 'strategy_risk'
}

function deriveHumanFactorType(raw = '') {
  const text = normalizeKey(raw)
  if (text.includes('hardship')) return 'hardship'
  if (text.includes('dependency') || text.includes('family')) return 'dependency_pressure'
  if (text.includes('coercion') || text.includes('pressure')) return 'coercion_pressure'
  if (text.includes('trust')) return 'trust_breakdown'
  if (text.includes('reputation')) return 'reputational_harm'
  if (text.includes('urgency') || text.includes('distress')) return 'urgency_distress'
  if (text.includes('apology') || text.includes('remorse')) return 'remorse_apology'
  return 'relational_damage'
}

function safeSummary(value = '') {
  return String(value || '').trim().slice(0, 500)
}

export function buildLegalGraphModel({ caseId, caseInput = {}, graphExtraction = {}, graphResult = {}, documentIntelligence = {} }) {
  const nodes = {}
  const relationships = []
  const meta = buildBaseMeta({ caseId })

  const caseNodeKey = `Case:${caseId}`
  addNode(nodes, caseNodeKey, 'Case', 'case_id', caseId, {
    ...meta,
    summary: safeSummary(graphExtraction.case_summary || graphResult?.case_summary || caseInput?.description || ''),
    status: 'active',
  })

  const categoryLabel = String(caseInput?.category || graphResult?.case_type || 'general-dispute').trim() || 'general-dispute'
  const categoryKey = normalizeKey(categoryLabel) || 'general_dispute'
  const categoryNodeKey = `CaseCategory:${categoryKey}`
  addNode(nodes, categoryNodeKey, 'CaseCategory', 'category_key', categoryKey, {
    label: categoryLabel,
    description: `${categoryLabel} category`,
    ...meta,
  })
  pushRel(relationships, caseNodeKey, 'OF_CATEGORY', categoryNodeKey, meta)

  const jurisdictionLabel = String(caseInput?.jurisdiction || graphResult?.jurisdiction || 'unknown').trim() || 'unknown'
  const jurisdictionKey = normalizeKey(jurisdictionLabel) || 'unknown'
  const jurisdictionNodeKey = `Jurisdiction:${jurisdictionKey}`
  addNode(nodes, jurisdictionNodeKey, 'Jurisdiction', 'jurisdiction_key', jurisdictionKey, {
    name: jurisdictionLabel,
    forum_type: 'court',
    ...meta,
  })
  pushRel(relationships, caseNodeKey, 'IN_JURISDICTION', jurisdictionNodeKey, meta)

  const parties = asArray(graphResult?.structuredCase?.entities)
  if (!parties.length) {
    const fallbackPartyKey = `${caseId}:party-1`
    const fallbackNodeKey = `Party:${fallbackPartyKey}`
    addNode(nodes, fallbackNodeKey, 'Party', 'party_key', fallbackPartyKey, {
      ...meta,
      name: 'Primary party',
      party_type: 'unknown',
      is_case_local: true,
    })
    pushRel(relationships, caseNodeKey, 'HAS_PARTY', fallbackNodeKey, meta)
  } else {
    parties.slice(0, 8).forEach((partyName, index) => {
      const partyKey = `${caseId}:party-${index + 1}-${slugify(partyName).slice(0, 36) || index + 1}`
      const partyNodeKey = `Party:${partyKey}`
      addNode(nodes, partyNodeKey, 'Party', 'party_key', partyKey, {
        ...meta,
        name: String(partyName || '').trim() || `Party ${index + 1}`,
        party_type: 'individual_or_entity',
        is_case_local: true,
      })
      pushRel(relationships, caseNodeKey, 'HAS_PARTY', partyNodeKey, meta)

      const roleCode = index === 0 ? 'claimant' : index === 1 ? 'respondent' : 'participant'
      const roleNodeKey = `Role:${roleCode}`
      addNode(nodes, roleNodeKey, 'Role', 'role_code', roleCode, {
        ...meta,
        label: roleCode,
      })
      pushRel(relationships, partyNodeKey, 'PLAYS_ROLE', roleNodeKey, meta)
    })
  }

  const claims = asArray(graphResult?.structuredCase?.claims)
  claims.slice(0, 8).forEach((claim, index) => {
    const claimKey = `${caseId}:claim-${index + 1}-${slugify(claim).slice(0, 40) || index + 1}`
    const claimNodeKey = `Claim:${claimKey}`
    addNode(nodes, claimNodeKey, 'Claim', 'claim_key', claimKey, {
      ...meta,
      title: String(claim || '').trim() || `Claim ${index + 1}`,
      summary: safeSummary(claim),
      claim_type: 'primary_claim',
      confidence_score: 0.7,
    })
    pushRel(relationships, caseNodeKey, 'HAS_CLAIM', claimNodeKey, meta)
  })

  const argumentsList = asArray(graphExtraction?.arguments)
  argumentsList.forEach((argument, index) => {
    const keyBase = argument.argument_id || `arg-${index + 1}`
    const isDefense = String(argument.side || '').toLowerCase() === 'opposing'
    const label = isDefense ? 'Defense' : 'Claim'
    const idField = isDefense ? 'defense_key' : 'claim_key'
    const localKey = `${caseId}:${keyBase}`
    const nodeKey = `${label}:${localKey}`
    addNode(nodes, nodeKey, label, idField, localKey, {
      ...meta,
      title: argument.title || `${isDefense ? 'Defense' : 'Claim'} ${index + 1}`,
      summary: safeSummary(argument.summary),
      [isDefense ? 'defense_type' : 'claim_type']: isDefense ? 'opposing_argument' : 'supporting_argument',
      confidence_score: 0.66,
    })
    pushRel(relationships, caseNodeKey, isDefense ? 'HAS_DEFENSE' : 'HAS_CLAIM', nodeKey, meta)
  })

  const issues = asArray(graphExtraction?.issues)
  issues.forEach((issue, index) => {
    const issueId = issue.issue_id || `issue-${index + 1}`
    const issueKey = `${caseId}:${issueId}`
    const nodeKey = `Issue:${issueKey}`
    addNode(nodes, nodeKey, 'Issue', 'issue_key', issueKey, {
      ...meta,
      title: issue.title || `Issue ${index + 1}`,
      summary: safeSummary(issue.summary),
      issue_type: deriveIssueType(issue.title || issue.summary),
      normalized_issue: normalizeKey(issue.title || issue.summary || issueId),
      issue_taxonomy_key: normalizeKey(issue.title || issueId),
      confidence_score: 0.72,
    })
    pushRel(relationships, caseNodeKey, 'RAISES_ISSUE', nodeKey, meta)
  })

  const rules = asArray(graphExtraction?.legal_rules)
  rules.forEach((rule, index) => {
    const label = String(rule.label || `rule-${index + 1}`).trim()
    const ruleKey = normalizeKey(label) || `rule_${index + 1}`
    const nodeKey = `LegalRule:${ruleKey}`
    addNode(nodes, nodeKey, 'LegalRule', 'rule_key', ruleKey, {
      ...meta,
      label,
      source: rule.source || 'legal-topic',
      citation: label,
      rule_type: 'provision_or_principle',
    })

    const linkedIssues = asArray(rule.linked_issues)
    if (!linkedIssues.length) {
      issues.slice(0, 1).forEach((fallbackIssue) => {
        const issueKey = `${caseId}:${fallbackIssue.issue_id}`
        pushRel(relationships, `Issue:${issueKey}`, 'TRIGGERS_RULE', nodeKey, {
          ...meta,
          confidence_score: 0.64,
        })
      })
    }

    linkedIssues.forEach((issueId) => {
      const issueKey = `${caseId}:${issueId}`
      pushRel(relationships, `Issue:${issueKey}`, 'TRIGGERS_RULE', nodeKey, {
        ...meta,
        confidence_score: 0.7,
      })
    })
  })

  const evidenceItems = asArray(graphExtraction?.evidence_items)
  evidenceItems.forEach((item, index) => {
    const evidenceId = item.evidence_id || `ev-${index + 1}`
    const evidenceKey = `${caseId}:${evidenceId}`
    const evidenceNodeKey = `Evidence:${evidenceKey}`
    const evidenceType = normalizeKey(item.evidence_type || 'document') || 'document'

    addNode(nodes, evidenceNodeKey, 'Evidence', 'evidence_key', evidenceKey, {
      ...meta,
      label: item.label || `Evidence ${index + 1}`,
      evidence_type: evidenceType,
      summary: safeSummary(item.summary),
      strength: 'medium',
      confidence_score: 0.67,
    })
    pushRel(relationships, caseNodeKey, 'HAS_EVIDENCE', evidenceNodeKey, meta)

    const documentKey = `${caseId}:doc-${index + 1}-${slugify(item.label || evidenceId).slice(0, 32) || index + 1}`
    const documentNodeKey = `Document:${documentKey}`
    addNode(nodes, documentNodeKey, 'Document', 'document_key', documentKey, {
      ...meta,
      label: item.label || `Document ${index + 1}`,
      document_type: evidenceType,
      file_name: item.label || '',
    })
    pushRel(relationships, evidenceNodeKey, 'EVIDENCED_BY_DOCUMENT', documentNodeKey, {
      ...meta,
      confidence_score: 0.62,
    })

    asArray(item.supports_arguments).forEach((argumentId) => {
      const supportingClaimKey = `Claim:${caseId}:${argumentId}`
      const supportingDefenseKey = `Defense:${caseId}:${argumentId}`
      pushRel(relationships, evidenceNodeKey, 'SUPPORTS_CLAIM', supportingClaimKey, {
        ...meta,
        confidence_score: 0.65,
      })
      pushRel(relationships, evidenceNodeKey, 'SUPPORTS_DEFENSE', supportingDefenseKey, {
        ...meta,
        confidence_score: 0.45,
      })
    })
  })

  const supportPoints = asArray(graphResult?.caseAssessment?.support_points)
  const weaknessPoints = asArray(graphResult?.caseAssessment?.weakness_points)
  ;[...supportPoints, ...weaknessPoints].slice(0, 16).forEach((point, index) => {
    const factKey = `${caseId}:fact-${index + 1}`
    const factNodeKey = `Fact:${factKey}`
    const isSupport = index < supportPoints.length

    addNode(nodes, factNodeKey, 'Fact', 'fact_key', factKey, {
      ...meta,
      statement: safeSummary(point.detail || point.title || ''),
      fact_type: isSupport ? 'support_fact' : 'weakness_fact',
      confidence_score: isSupport ? 0.72 : 0.63,
    })
    pushRel(relationships, caseNodeKey, 'HAS_FACT', factNodeKey, meta)

    const targetClaims = Object.values(nodes).filter((node) => node.label === 'Claim').slice(0, 2)
    targetClaims.forEach((claimNode) => {
      pushRel(relationships, factNodeKey, 'SUPPORTS_CLAIM', `Claim:${claimNode.idValue}`, {
        ...meta,
        confidence_score: isSupport ? 0.7 : 0.4,
      })
    })

    const issueNodes = Object.values(nodes).filter((node) => node.label === 'Issue').slice(0, 2)
    issueNodes.forEach((issueNode) => {
      pushRel(relationships, factNodeKey, 'RELATES_TO_ISSUE', `Issue:${issueNode.idValue}`, {
        ...meta,
        confidence_score: 0.58,
      })
    })
  })

  const contradictionPoints = asArray(graphResult?.caseAssessment?.contradiction_points)
  contradictionPoints.slice(0, 8).forEach((item, index) => {
    const contradictionKey = `${caseId}:contradiction-${index + 1}`
    const contradictionNodeKey = `Contradiction:${contradictionKey}`
    addNode(nodes, contradictionNodeKey, 'Contradiction', 'contradiction_key', contradictionKey, {
      ...meta,
      label: item.title || `Contradiction ${index + 1}`,
      summary: safeSummary(item.detail || ''),
      severity: 'high',
      confidence_score: 0.71,
    })
    pushRel(relationships, caseNodeKey, 'HAS_CONTRADICTION', contradictionNodeKey, meta)

    const factNodes = Object.values(nodes).filter((node) => node.label === 'Fact').slice(0, 2)
    factNodes.forEach((factNode) => {
      pushRel(relationships, contradictionNodeKey, 'INVOLVES_FACT', `Fact:${factNode.idValue}`, {
        ...meta,
        confidence_score: 0.61,
      })
    })
  })

  const missingDocuments = [
    ...asArray(documentIntelligence?.missing_documents),
    ...asArray(graphResult?.caseAssessment?.missing_document_impact),
  ]
  missingDocuments.slice(0, 10).forEach((item, index) => {
    const missingKey = `${caseId}:missing-${index + 1}-${slugify(item.label || item.type || 'evidence').slice(0, 28)}`
    const missingNodeKey = `MissingEvidence:${missingKey}`
    addNode(nodes, missingNodeKey, 'MissingEvidence', 'missing_key', missingKey, {
      ...meta,
      label: item.label || item.type || `Missing evidence ${index + 1}`,
      missing_type: normalizeKey(item.type || item.label || 'document') || 'document',
      impact_summary: safeSummary(item.impact_reason || item.risk_introduced || item.description || ''),
      severity: 'high',
      confidence_score: 0.79,
    })
    pushRel(relationships, caseNodeKey, 'HAS_MISSING_EVIDENCE', missingNodeKey, meta)

    const issueNodes = Object.values(nodes).filter((node) => node.label === 'Issue').slice(0, 2)
    issueNodes.forEach((issueNode) => {
      pushRel(relationships, missingNodeKey, 'AFFECTS_ISSUE', `Issue:${issueNode.idValue}`, {
        ...meta,
        confidence_score: 0.7,
      })
    })

    const claimNodes = Object.values(nodes).filter((node) => node.label === 'Claim').slice(0, 2)
    claimNodes.forEach((claimNode) => {
      pushRel(relationships, missingNodeKey, 'AFFECTS_CLAIM', `Claim:${claimNode.idValue}`, {
        ...meta,
        confidence_score: 0.68,
      })
    })
  })

  const humanSignals = asArray(graphResult?.structured_synthesis?.emotional_signal_findings)
    .concat(asArray(graphResult?.human_factors?.signals))
  humanSignals.slice(0, 10).forEach((signal, index) => {
    const factorType = deriveHumanFactorType(signal.signal_type || signal.type || signal.summary)
    const key = `${caseId}:human-${index + 1}-${factorType}`
    const nodeKey = `HumanFactor:${key}`
    addNode(nodes, nodeKey, 'HumanFactor', 'human_factor_key', key, {
      ...meta,
      factor_type: factorType,
      summary: safeSummary(signal.source_text || signal.summary || ''),
      intensity: Number(signal.intensity || 0.55),
      relevance_to_case: Number(signal.relevance_to_case || 0.55),
      effect_area: Array.isArray(signal.likely_effect_area)
        ? signal.likely_effect_area.join(', ')
        : String(signal.effect_area || ''),
      confidence_score: 0.63,
    })
    pushRel(relationships, caseNodeKey, 'HAS_HUMAN_FACTOR', nodeKey, meta)
  })

  const riskSignals = [
    ...weaknessPoints.map((item) => ({ label: item.title || item.detail, summary: item.detail || item.title })),
    ...asArray(graphResult?.verdict?.uncertainty_flags).map((item) => ({ label: item, summary: item })),
  ]
  riskSignals.slice(0, 10).forEach((item, index) => {
    const riskKey = `${caseId}:risk-${index + 1}-${slugify(item.label).slice(0, 24)}`
    const riskNodeKey = `RiskFactor:${riskKey}`
    addNode(nodes, riskNodeKey, 'RiskFactor', 'risk_key', riskKey, {
      ...meta,
      label: item.label || `Risk ${index + 1}`,
      risk_type: deriveRiskType(item.label || item.summary),
      severity: 'medium',
      summary: safeSummary(item.summary),
      confidence_score: 0.66,
    })
    pushRel(relationships, caseNodeKey, 'HAS_RISK', riskNodeKey, meta)

    const humanNodes = Object.values(nodes).filter((node) => node.label === 'HumanFactor').slice(0, 2)
    humanNodes.forEach((humanNode) => {
      pushRel(relationships, `HumanFactor:${humanNode.idValue}`, 'INFLUENCES_RISK', riskNodeKey, {
        ...meta,
        confidence_score: 0.52,
      })
    })
  })

  const strategyActions = [
    ...asArray(graphResult?.caseAssessment?.recommendations),
    ...asArray(graphResult?.verdict?.improvement_actions),
  ]
  strategyActions.slice(0, 10).forEach((item, index) => {
    const action = item.action || item.title || `Strategy action ${index + 1}`
    const key = `${caseId}:strategy-${index + 1}-${slugify(action).slice(0, 30)}`
    const nodeKey = `StrategyAction:${key}`
    addNode(nodes, nodeKey, 'StrategyAction', 'strategy_key', key, {
      ...meta,
      action,
      reason: safeSummary(item.reason || ''),
      expected_impact: safeSummary(item.expected_impact || ''),
      confidence_score: 0.69,
    })
    pushRel(relationships, caseNodeKey, 'HAS_STRATEGY_ACTION', nodeKey, meta)

    const riskNodes = Object.values(nodes).filter((node) => node.label === 'RiskFactor').slice(0, 2)
    riskNodes.forEach((riskNode) => {
      pushRel(relationships, nodeKey, 'ADDRESSES_RISK', `RiskFactor:${riskNode.idValue}`, {
        ...meta,
        confidence_score: 0.59,
      })
    })

    const missingNodes = Object.values(nodes).filter((node) => node.label === 'MissingEvidence').slice(0, 2)
    missingNodes.forEach((missingNode) => {
      pushRel(relationships, nodeKey, 'ADDRESSES_MISSING_EVIDENCE', `MissingEvidence:${missingNode.idValue}`, {
        ...meta,
        confidence_score: 0.65,
      })
    })
  })

  const patternKey = `${categoryKey}::${jurisdictionKey}`
  const outcomePatternNodeKey = `OutcomePattern:${patternKey}`
  addNode(nodes, outcomePatternNodeKey, 'OutcomePattern', 'pattern_key', patternKey, {
    ...meta,
    outcome_tendency: safeSummary(graphResult?.similarCaseIntelligence?.pattern_insights?.outcome_trend || graphResult?.verdict?.outcome || 'Outcome uncertain'),
    settlement_tendency: safeSummary(graphResult?.verdict?.human_factors?.settlement_likelihood_effect || ''),
    timeline_tendency: safeSummary(graphResult?.similarCaseIntelligence?.pattern_insights?.timeline_trend || ''),
    cost_tendency: safeSummary(graphResult?.similarCaseIntelligence?.pattern_insights?.cost_pattern || ''),
    confidence_score: 0.57,
  })
  pushRel(relationships, caseNodeKey, 'MATCHES_PATTERN', outcomePatternNodeKey, meta)

  const claimNodes = Object.values(nodes).filter((node) => node.label === 'Claim').slice(0, 3)
  const issueNodes = Object.values(nodes).filter((node) => node.label === 'Issue').slice(0, 3)
  claimNodes.forEach((claimNode, index) => {
    const issueNode = issueNodes[index % Math.max(1, issueNodes.length)]
    if (issueNode) {
      pushRel(relationships, `Claim:${claimNode.idValue}`, 'RELATES_TO_ISSUE', `Issue:${issueNode.idValue}`, {
        ...meta,
        confidence_score: 0.61,
      })
    }
  })

  return {
    caseNodeKey,
    nodes: Object.values(nodes),
    relationships,
  }
}
