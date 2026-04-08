import assert from 'node:assert/strict'

import { buildScenarioUpdate } from '../services/debateSimulation/scenarioUpdateService.js'

function testScenarioUpdateKeepsRecommendationsRenderable() {
  const result = buildScenarioUpdate({
    question: {
      linked_issue_or_evidence: 'rent payment receipts',
      issue_type: 'missing_document',
      side: 'supporting',
    },
    answerEffect: {
      impact: 'weakens',
      reasoning: 'No receipts are available right now.',
      score: -0.07,
    },
    sessionMemory: {
      working_state: {
        win_probability: 0.5,
        confidence_score: 0.5,
        case_strength_score: 0.5,
        risk_flags: ['Existing risk'],
        recommendations: ['Keep receipt copies ready'],
        debate_posture: {
          supporting_side: 'Support starts neutral.',
          opposing_side: 'Opposition starts neutral.',
        },
      },
    },
    answerText: 'I do not have the receipts right now.',
  })

  assert.ok(result.scenario_update.updated_recommendations.length >= 2)
  assert.ok(result.scenario_update.updated_recommendations.every((item) => typeof item === 'string'))
  assert.equal(result.scenario_update.updated_recommendations[0], 'Prioritize obtaining or substituting proof for rent payment receipts.')
  assert.equal(result.scenario_update.updated_recommendations[1], 'Keep receipt copies ready')
}

function testScenarioUpdateNormalizesLegacyRecommendationObjects() {
  const result = buildScenarioUpdate({
    question: {
      linked_issue_or_evidence: 'identity proof',
      issue_type: 'general',
      side: 'supporting',
    },
    answerEffect: {
      impact: 'neutral',
      reasoning: 'The answer only partly clarified the issue.',
      score: 0,
    },
    sessionMemory: {
      working_state: {
        win_probability: 0.5,
        confidence_score: 0.5,
        case_strength_score: 0.5,
        risk_flags: [],
        recommendations: [{ action: 'Bring government ID copy' }],
        debate_posture: {
          supporting_side: 'Support starts neutral.',
          opposing_side: 'Opposition starts neutral.',
        },
      },
    },
    answerText: 'I can explain the issue further.',
  })

  assert.ok(result.scenario_update.updated_recommendations.every((item) => typeof item === 'string'))
  assert.ok(result.scenario_update.updated_recommendations.includes('Bring government ID copy'))
}

testScenarioUpdateKeepsRecommendationsRenderable()
testScenarioUpdateNormalizesLegacyRecommendationObjects()

console.log('scenarioUpdateService tests passed')
