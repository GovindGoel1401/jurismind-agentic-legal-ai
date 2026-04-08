import assert from 'assert'
import {
  buildFeedbackMemoryRouteDecision,
  compressFeedbackLessons,
  resolveFeedbackContinuityCategory,
  updateContinuityTracker,
} from '../services/feedbackIntelligence/feedbackMemoryRoutingService.js'

function testContinuityTracker() {
  let tracker = updateContinuityTracker({}, 'contract_dispute')
  assert.equal(tracker.consecutive_count, 1)
  assert.equal(tracker.should_retrieve, false)

  tracker = updateContinuityTracker(tracker, 'contract_dispute')
  assert.equal(tracker.consecutive_count, 2)
  assert.equal(tracker.should_retrieve, false)

  tracker = updateContinuityTracker(tracker, 'contract_dispute')
  assert.equal(tracker.consecutive_count, 3)
  assert.equal(tracker.should_retrieve, true)
  assert.equal(tracker.retrieval_trigger, 'three_consecutive_same_issue_cluster')
}

function testContinuityReset() {
  let tracker = updateContinuityTracker({}, 'contract_dispute')
  tracker = updateContinuityTracker(tracker, 'contract_dispute')
  tracker = updateContinuityTracker(tracker, 'cheque_bounce')

  assert.equal(tracker.last_category, 'cheque_bounce')
  assert.equal(tracker.consecutive_count, 1)
  assert.equal(tracker.should_retrieve, false)
}

function testRouteDecision() {
  const dissatisfied = buildFeedbackMemoryRouteDecision({
    satisfactionStatus: 'no',
    continuityTracker: {},
    featureEnabled: true,
  })
  assert.equal(dissatisfied.should_store, true)
  assert.equal(dissatisfied.should_retrieve, true)

  const disabled = buildFeedbackMemoryRouteDecision({
    satisfactionStatus: 'no',
    continuityTracker: { should_retrieve: true },
    featureEnabled: false,
  })
  assert.equal(disabled.should_store, false)
  assert.equal(disabled.should_retrieve, false)
}

function testCategoryResolutionAndCompression() {
  const category = resolveFeedbackContinuityCategory({
    question: { issue_type: 'Contract Dispute' },
  })
  assert.equal(category, 'contract_dispute')

  const compressed = compressFeedbackLessons([
    { feedback_id: 'fb-1', lesson_summary: 'Need signed agreement.', trust_score: 0.8, relevance_score: 0.7 },
    { feedback_id: 'fb-2', lesson_summary: 'Clarify payment schedule.', trust_score: 0.7, relevance_score: 0.6 },
    { feedback_id: 'fb-3', lesson_summary: 'Show delivery proof.', trust_score: 0.6, relevance_score: 0.5 },
    { feedback_id: 'fb-4', lesson_summary: 'Keep invoice chain.', trust_score: 0.5, relevance_score: 0.4 },
  ])
  assert.equal(compressed.length, 3)
  assert.equal(compressed[0].feedback_id, 'fb-1')
}

testContinuityTracker()
testContinuityReset()
testRouteDecision()
testCategoryResolutionAndCompression()

console.log('feedbackMemory tests passed')
