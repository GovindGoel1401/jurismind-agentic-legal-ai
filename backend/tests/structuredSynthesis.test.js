import assert from 'node:assert/strict'

import {
  buildRetrievalFindings,
  buildStructuredLegalSynthesis,
} from '../services/legalSignalSynthesisService.js'
import { composeVerdictStudioResult } from '../services/verdictStudioService.js'
import {
  buildFeedbackMemoryRouteDecision,
  updateContinuityTracker,
  updateClusterWindow,
} from '../services/feedbackIntelligence/feedbackMemoryRoutingService.js'
import {
  rankQuestionsByState,
  scoreQuestionForState,
} from '../services/debateSimulation/questionGenerationService.js'

function testStructuredSynthesis() {
  const synthesis = buildStructuredLegalSynthesis({
    caseInput: {
      category: 'contract dispute',
      jurisdiction: 'Delhi',
      description: 'The user says they were pressured, the agreement was unfair, and payment proof is missing.',
    },
    documentIntelligence: {
      missing_documents: [
        { label: 'Payment proof', description: 'Missing UTR or receipt' },
      ],
      available_documents: [
        { label: 'WhatsApp chat record', description: 'Supports pressure narrative' },
      ],
      completeness_explanation: 'Limited proof continuity.',
      readiness_assessment: { summary: 'PARTIAL' },
    },
    caseAssessment: {
      support_points: [{ title: 'Chat trail exists', detail: 'Messages show chronology.' }],
      weakness_points: [{ title: 'Missing payment proof', detail: 'No bank trail yet.' }],
      contradiction_points: [{ title: 'Timeline mismatch', detail: 'Dates do not fully line up.' }],
      recommendations: [{ action: 'Obtain bank proof', reason: 'Shows payment continuity', expected_impact: 'higher evidentiary weight' }],
    },
    similarCaseIntelligence: {
      similar_cases: [
        { title: 'Comparable contract case', summary: 'Signed agreement and stronger trail', similarity_score: 0.82 },
      ],
      case_gap_analysis: ['Comparable cases had stronger documentary anchors.'],
    },
    feedbackLearning: {
      summary: 'Users often needed clearer evidence guidance.',
      recommendedAdjustments: ['Ask for bank proof earlier'],
    },
  })

  assert.ok(synthesis.emotional_signal_findings.length > 0)
  assert.ok(synthesis.missing_document_findings.length > 0)
  assert.ok(synthesis.probability_support_profile.uncertainty_level >= 0)
}

function testVerdictComposition() {
  const verdict = composeVerdictStudioResult({
    caseInput: {
      category: 'contract dispute',
      jurisdiction: 'Delhi',
      description: 'Pressure, missing proof, and a disputed agreement are central.',
    },
    graphResult: {
      case_type: 'contract_dispute',
      jurisdiction: 'Delhi',
      relevant_laws: ['contract obligations'],
      probability: { userWin: 0.48, opponentWin: 0.32, settlement: 0.2 },
      verdict: {},
      legalResearch: {
        retrieval_context: { evidence_documents: [], rules_documents: [] },
        knowledge_bundle: { retrieved_evidence: [], retrieved_rules: [] },
      },
    },
    caseAssessment: {
      case_strength_score: 0.52,
      support_points: [{ title: 'Chat trail', detail: 'Supports chronology.' }],
      weakness_points: [{ title: 'No payment proof', detail: 'Bank trail missing.' }],
      contradiction_points: [{ title: 'Timeline mismatch', detail: 'Dates vary.' }],
      missing_document_impact: [{ label: 'Payment proof', risk_introduced: 'No documentary payment trail.' }],
      recommendations: [{ action: 'Collect payment proof', reason: 'Anchor the money trail.', expected_impact: 'Improves evidence readiness.' }],
    },
    documentIntelligence: {
      completeness_score: 42,
      missing_documents: [{ label: 'Payment proof' }],
    },
    similarCaseIntelligence: {
      similar_cases: [{ title: 'Comparable case', similarity_score: 0.8 }],
      case_gap_analysis: ['Comparable cases had stronger documentation.'],
      pattern_insights: { outcome_trend: 'Settlement was common.', timeline_trend: '6-8 months.', cost_pattern: 'Moderate.' },
    },
    feedbackLearning: { summary: 'No strong feedback memory.' },
  })

  assert.ok(verdict.structured_synthesis)
  assert.ok(verdict.human_factors)
  assert.ok(verdict.verdict_layers.some((layer) => layer.layer_name === 'Human Factors Layer'))
  assert.ok(verdict.verdict_layers.some((layer) => layer.layer_name === 'Evidence Layer'))
}

function testFeedbackRouting() {
  const tracker = updateContinuityTracker({ last_category: 'payment_proof', consecutive_count: 2 }, 'payment_proof')
  const window = updateClusterWindow(['payment_proof', 'payment_proof', 'payment_proof', 'other'], 'payment_proof', 10)

  const dissatisfied = buildFeedbackMemoryRouteDecision({
    satisfactionStatus: 'no',
    continuityTracker: {},
    featureEnabled: true,
  })
  const repeatedCluster = buildFeedbackMemoryRouteDecision({
    satisfactionStatus: 'unknown',
    continuityTracker: tracker,
    featureEnabled: true,
  })
  const rollingWindow = buildFeedbackMemoryRouteDecision({
    satisfactionStatus: 'unknown',
    continuityTracker: {},
    featureEnabled: true,
    currentCluster: 'payment_proof',
    recentClusterWindow: [...window, 'payment_proof'],
  })
  const repeatedWeakness = buildFeedbackMemoryRouteDecision({
    satisfactionStatus: 'unknown',
    continuityTracker: {},
    featureEnabled: true,
    currentCluster: 'payment_proof',
    repeatedWeaknessOnCluster: true,
  })

  assert.equal(dissatisfied.should_retrieve, true)
  assert.equal(repeatedCluster.should_retrieve, true)
  assert.equal(repeatedCluster.reason, 'three_consecutive_same_issue_cluster')
  assert.equal(rollingWindow.reason, 'five_total_same_issue_cluster_recent_window')
  assert.equal(repeatedWeakness.reason, 'repeated_weakness_same_issue_cluster')
}

function testDebateContinuityRanking() {
  const sessionMemory = {
    current_focus: 'payment proof remains unresolved',
    unresolved_issues: [{ issue: 'payment proof is missing' }],
    feedback_memory: {
      cluster_history: [{ cluster_key: 'payment_proof' }, { cluster_key: 'timeline_contradiction' }],
    },
  }
  const latestAnswerRecord = {
    question: { issue_category: 'payment_proof', issue_type: 'missing_document', impact_axis: 'document_support' },
    answer_analysis: { strength_impact: 'weakened' },
  }

  const repeated = {
    issue_category: 'payment_proof',
    issue_type: 'missing_document',
    impact_axis: 'document_support',
    followup_mode: 'pressure_probe',
  }
  const unrelated = {
    issue_category: 'strategy',
    issue_type: 'improvement_action',
    impact_axis: 'strategy',
    followup_mode: 'follow_through',
  }

  assert.ok(scoreQuestionForState(repeated, sessionMemory, latestAnswerRecord) > scoreQuestionForState(unrelated, sessionMemory, latestAnswerRecord))
  const ranked = rankQuestionsByState([unrelated, repeated], sessionMemory, latestAnswerRecord)
  assert.equal(ranked[0].issue_category, 'payment_proof')
}

function testRetrievalRankingAndDeduping() {
  const findings = buildRetrievalFindings({
    caseInput: { jurisdiction: 'Delhi' },
    legalResearch: {
      knowledge_bundle: {
        retrieved_rules: [
          { title: 'Contract Act Section 10', summary: 'Valid contract essentials.' },
        ],
        retrieved_evidence: [
          { title: 'Bank transfer statement', summary: 'Shows transfer chronology.' },
        ],
      },
    },
    similarCaseIntelligence: {
      similar_cases: [
        {
          title: 'ABC vs XYZ',
          summary: 'Court accepted strong documentary trail.',
          similarity_score: 0.7,
          court: 'Delhi High Court',
        },
        {
          title: 'ABC vs XYZ',
          summary: 'Duplicate title should be de-prioritized.',
          similarity_score: 0.7,
          court: 'Delhi High Court',
        },
      ],
    },
    caseAssessment: {
      contradiction_points: [{ title: 'Date mismatch', detail: 'Invoice date and transfer date conflict.' }],
      missing_document_impact: [{ label: 'UTR receipt', risk_introduced: 'Payment trail is not independently verifiable.' }],
    },
  })

  assert.equal(findings.similar_case_pattern_points.length, 2)
  assert.equal(findings.similar_case_pattern_points[1].duplicated, true)
  assert.ok(findings.similar_case_pattern_points[1].score < findings.similar_case_pattern_points[0].score)
  assert.equal(findings.risk_findings[0].source_type, 'missing_document')
  assert.ok(findings.legal_rule_points[0].jurisdiction_fit >= 0.7)
}

function testDebateRankingShiftAfterStrongAnswer() {
  const sessionMemory = {
    current_focus: 'payment proof remains unresolved',
    unresolved_issues: [{ issue: 'payment proof is missing' }, { issue: 'timeline contradiction remains open' }],
    feedback_memory: {
      cluster_history: [{ cluster_key: 'payment_proof' }, { cluster_key: 'payment_proof' }],
    },
  }

  const latestAnswerRecord = {
    question: { issue_category: 'payment_proof', issue_type: 'missing_document', impact_axis: 'document_support' },
    answer_analysis: { strength_impact: 'strengthened' },
  }

  const sameClusterPressureProbe = {
    issue_category: 'payment_proof',
    issue_type: 'missing_document',
    impact_axis: 'document_support',
    followup_mode: 'pressure_probe',
  }

  const shiftQuestion = {
    issue_category: 'timeline_contradiction',
    issue_type: 'contradiction',
    impact_axis: 'contradiction_risk',
    followup_mode: 'shift_to_next_gap',
  }

  const ranked = rankQuestionsByState(
    [sameClusterPressureProbe, shiftQuestion],
    sessionMemory,
    latestAnswerRecord,
  )

  assert.equal(ranked[0].issue_category, 'timeline_contradiction')
}

function run() {
  testStructuredSynthesis()
  testVerdictComposition()
  testFeedbackRouting()
  testDebateContinuityRanking()
  testRetrievalRankingAndDeduping()
  testDebateRankingShiftAfterStrongAnswer()
  console.log('structuredSynthesis tests passed')
}

run()
