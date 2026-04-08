function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value) {
  return normalizeText(value).split(' ').filter(Boolean)
}

export function buildCaseContext(caseInput = {}) {
  return [caseInput.category, caseInput.jurisdiction, caseInput.description, caseInput.caseText]
    .filter(Boolean)
    .join(' ')
}

export function overlapRatio(left, right) {
  const leftTokens = new Set(tokenize(left))
  const rightTokens = new Set(tokenize(right))
  if (!leftTokens.size || !rightTokens.size) return 0

  let overlap = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1
  }

  return overlap / leftTokens.size
}

export function scoreFeedbackEntry(entry, caseInput) {
  const entryCaseInput = entry?.metadata?.case_input || entry?.case_input || {}
  const currentContext = buildCaseContext(caseInput)
  const entryContext = buildCaseContext(entryCaseInput)
  const categoryMatch =
    normalizeText(entryCaseInput.category) === normalizeText(caseInput.category) ? 0.35 : 0
  const jurisdictionMatch =
    normalizeText(entryCaseInput.jurisdiction) === normalizeText(caseInput.jurisdiction) ? 0.2 : 0
  const similarity = overlapRatio(currentContext, entryContext)

  return {
    entry,
    score: Number((categoryMatch + jurisdictionMatch + similarity).toFixed(3)),
  }
}
