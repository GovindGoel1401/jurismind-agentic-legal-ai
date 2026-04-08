import assert from 'node:assert/strict'

import {
  applyDebateAnswer,
  initializeDebateSession,
} from '../services/debateSimulation/debateSessionService.js'
import { env } from '../config/envConfig.js'

function pickMissingDocumentQuestion(sessionMemory = {}) {
  const bank = Array.isArray(sessionMemory.question_bank) ? sessionMemory.question_bank : []
  return (
    bank.find((item) => String(item?.issue_type || '').trim() === 'missing_document') ||
    bank[0] ||
    null
  )
}

async function testDebateSessionContinuity() {
  const originalFeedbackFlag = env.FEEDBACK_MEMORY_ENABLED
  const originalForceFallbackFlag = env.DEBATE_GENERATOR_FORCE_FALLBACK
  env.FEEDBACK_MEMORY_ENABLED = false
  env.DEBATE_GENERATOR_FORCE_FALLBACK = true

  try {
    const caseInput = {
      category: 'contract dispute',
      jurisdiction: 'Delhi',
      description:
        'Counterparty denies payment despite prior acceptance and timeline references in chats.',
    }

    const analysis = {
      caseAssessment: {
        case_strength_score: 0.56,
        support_points: [
          { title: 'Message chronology', detail: 'Chat timeline anchors events.' },
        ],
        weakness_points: [
          { title: 'No bank proof attached', detail: 'UTR and account statement are missing.' },
        ],
        contradiction_points: [
          { title: 'Date mismatch', detail: 'Two references show different payment dates.' },
        ],
        missing_document_impact: [
          {
            label: 'Bank transfer proof',
            type: 'payment-proof',
            impact_reason: 'Without payment trail, the core claim remains vulnerable.',
          },
        ],
        recommendations: [
          {
            action: 'Collect UTR and statement copy',
            reason: 'This closes the payment-proof gap.',
            expected_impact: 'Improves evidentiary reliability.',
          },
        ],
      },
    }

    const verdict = {
      probability: { userWin: 0.5, opponentWin: 0.3, settlement: 0.2 },
      uncertainty_flags: ['Payment proof is not fully demonstrated.'],
      improvement_actions: [
        {
          action: 'Submit banking records',
          reason: 'Primary documentary gap.',
        },
      ],
    }

    const initial = await initializeDebateSession({
      caseId: 'case-continuity-01',
      caseInput,
      analysis,
      verdict,
      similarCaseIntelligence: {},
      sessionMemory: {
        unresolved_issues: [{ issue: 'other_open_gap' }],
        feedback_memory: {
          continuity_tracker: {
            last_category: '',
            consecutive_count: 0,
            should_retrieve: false,
            retrieval_trigger: '',
          },
          cluster_history: [],
          recent_cluster_window: [],
        },
      },
    })

    assert.equal(initial.generation_meta?.source, 'forced_fallback')

    const firstQuestion = pickMissingDocumentQuestion(initial.session_memory)
    assert.ok(firstQuestion, 'Expected at least one generated debate question')

    const step1 = await applyDebateAnswer({
      caseId: 'case-continuity-01',
      questionId: firstQuestion.question_id,
      customAnswer: 'I can provide UTR details and a certified statement copy.',
      caseInput,
      analysis,
      verdict,
      similarCaseIntelligence: {},
      sessionMemory: initial.session_memory,
    })

    assert.equal(step1.feedback_memory.last_route_reason, 'feedback_memory_disabled')
    assert.equal(step1.feedback_memory.cluster_history.length, 1)
    assert.equal(step1.feedback_memory.recent_cluster_window.length, 1)

    const secondQuestion = pickMissingDocumentQuestion(step1.session_memory)
    assert.ok(secondQuestion, 'Expected a follow-up question in the second turn')

    const step2 = await applyDebateAnswer({
      caseId: 'case-continuity-01',
      questionId: secondQuestion.question_id,
      customAnswer: 'The invoice and acceptance message support the same payment narrative.',
      caseInput,
      analysis,
      verdict,
      similarCaseIntelligence: {},
      sessionMemory: step1.session_memory,
    })

    assert.equal(step2.feedback_memory.last_route_reason, 'feedback_memory_disabled')
    assert.ok(step2.feedback_memory.cluster_history.length >= 2)
    assert.ok(step2.feedback_memory.recent_cluster_window.length >= 2)

    const continuity = step2.feedback_memory.continuity_tracker || {}
    assert.ok(Number(continuity.consecutive_count || 0) >= 1)

    if (firstQuestion.issue_type === secondQuestion.issue_type) {
      assert.equal(continuity.last_category, 'missing_document')
      assert.ok(continuity.consecutive_count >= 2)
    }
  } finally {
    env.FEEDBACK_MEMORY_ENABLED = originalFeedbackFlag
    env.DEBATE_GENERATOR_FORCE_FALLBACK = originalForceFallbackFlag
  }
}

await testDebateSessionContinuity()
console.log('debateSessionContinuity tests passed')
