import { buildEvidenceAnalyzerPrompt } from './prompts/legalPrompts.js'
import { clampRange } from './shared/agentOutput.js'
import { evidenceAnalyzerSchema } from './contracts/legalAgentSchemas.js'
import { createStructuredLegalAgent } from './shared/createStructuredLegalAgent.js'

function detectMissingEvidence(description = '') {
  const text = description.toLowerCase()
  const missing = []

  if (!text.includes('agreement') && !text.includes('contract')) {
    missing.push('written agreement or contract copy')
  }
  if (!text.includes('payment') && !text.includes('receipt') && !text.includes('bank')) {
    missing.push('payment proof / transaction receipts')
  }
  if (!text.includes('photo') && !text.includes('video')) {
    missing.push('photo/video evidence supporting factual claims')
  }
  return missing
}

function detectContradictions(description = '') {
  const text = description.toLowerCase()
  const contradictions = []

  if (text.includes('no damage') && text.includes('damage')) {
    contradictions.push('conflicting statements about property damage')
  }
  if (text.includes('paid') && text.includes('unpaid')) {
    contradictions.push('conflicting statements about payment status')
  }

  return contradictions
}

function buildFallbackEvidence(description = '') {
  const missingEvidence = detectMissingEvidence(description)
  const contradictions = detectContradictions(description)
  const fallbackScore = Math.max(1, 8 - missingEvidence.length - contradictions.length)

  return {
    fallbackScore,
    missingEvidence,
    contradictions,
  }
}

export const runEvidenceAnalyzer = createStructuredLegalAgent({
  agentName: 'Evidence Analyzer',
  schema: evidenceAnalyzerSchema,
  buildPrompt: (state) =>
    buildEvidenceAnalyzerPrompt(state.structuredCase || {}, state?.caseInput?.description || ''),
  buildFallback: (state) => {
    const derived = buildFallbackEvidence(state?.caseInput?.description || '')
    return {
      evidence_score: derived.fallbackScore,
      missing_evidence: derived.missingEvidence,
      contradictions: derived.contradictions,
    }
  },
  transformValidated: (validated, state) => {
    const derived = buildFallbackEvidence(state?.caseInput?.description || '')
    return {
      evidence_score: clampRange(validated.evidence_score, 1, 10, derived.fallbackScore),
      missing_evidence: validated.missing_evidence,
      contradictions: validated.contradictions,
    }
  },
  buildResult: ({ rawText, data, meta }) => {
    const finalScore = data.evidence_score

    return {
      evidence_score: finalScore,
      missing_evidence: data.missing_evidence,
      contradictions: data.contradictions,
      evidenceAnalysis: {
        summary: rawText,
        strengthScore: finalScore / 10,
        missingEvidence: data.missing_evidence,
        contradictions: data.contradictions,
        meta,
      },
      evidenceMeta: meta,
    }
  },
})
