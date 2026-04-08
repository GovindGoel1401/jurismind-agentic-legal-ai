import { listFeedbackItems, getInMemoryFeedbackIntelligence } from './feedbackIntelligence/feedbackStorageService.js'
import { buildFeedbackProfile, buildDefaultFeedbackProfile } from './feedbackLearning/feedbackProfileBuilder.js'
import { storeFeedbackEntryWithMemory } from './feedbackIntelligence/feedbackMemoryService.js'

export async function storeFeedbackEntry(payload) {
  return storeFeedbackEntryWithMemory(payload)
}

export function getInMemoryFeedback() {
  return getInMemoryFeedbackIntelligence()
}

async function listRecentFeedback(limit = 80) {
  return listFeedbackItems({}, limit)
}

export async function buildFeedbackLearningProfile(caseInput = {}) {
  const entries = await listRecentFeedback()
  if (!entries.length) return buildDefaultFeedbackProfile()
  return buildFeedbackProfile(entries, caseInput)
}
