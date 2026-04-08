import { composeVerdictResult } from '../services/verdictCompositionService.js'

export async function runVerdictAgent(state) {
  return composeVerdictResult(state)
}
