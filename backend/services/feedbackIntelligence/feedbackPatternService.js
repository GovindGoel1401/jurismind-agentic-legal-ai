import { listFeedbackItems } from './feedbackStorageService.js'

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function buildCaseSignature(entry = {}) {
  const stored = entry.case_signature || {}
  const caseInput = entry?.metadata?.case_input || {}
  const docCompleteness = Number(
    stored.doc_completeness ??
      caseInput.doc_completeness ??
      caseInput.completeness_score ??
      0,
  )
  const evidenceBand =
    normalizeText(stored.evidence_band) ||
    normalizeText(
      docCompleteness >= 0.7
        ? 'high'
        : docCompleteness >= 0.4
          ? 'medium'
          : 'low',
    )

  return {
    case_type: normalizeText(stored.case_type || caseInput.category || 'general'),
    jurisdiction: normalizeText(stored.jurisdiction || caseInput.jurisdiction || 'general'),
    evidence_level: normalizeText(stored.evidence_level || evidenceBand || 'unknown'),
    evidence_band: evidenceBand || 'unknown',
    doc_completeness: Number.isFinite(docCompleteness) ? docCompleteness : 0,
  }
}

function getIssueTags(entry = {}) {
  const tags = ensureArray(entry.issue_tags).filter(Boolean)
  if (tags.length) return tags
  if (entry.feedback_type === 'answer_correctness_concern') return ['correctness_concern']
  if (entry.feedback_type === 'missing_context_provided_later') return ['missing_context']
  return [normalizeText(entry.feedback_type || 'general_feedback')]
}

function isNegativeFeedback(entry = {}) {
  if (normalizeText(entry.satisfaction_status) === 'no') return true
  if (Number(entry.user_rating || 0) > 0 && Number(entry.user_rating || 0) <= 2) return true

  return [
    entry.verdict_helpful,
    entry.analysis_helpful,
    entry.debate_helpful,
    entry.document_guidance_helpful,
    entry.similar_cases_helpful,
  ].some((value) => value === false)
}

function buildRecommendedAction(issueTag = '', phaseContext = '') {
  const normalizedTag = normalizeText(issueTag)
  const normalizedPhase = normalizeText(phaseContext)

  if (normalizedTag.includes('missing_document')) {
    return 'Improve document checklist generation and evidence-gap explanation for this case pattern.'
  }
  if (normalizedTag.includes('debate')) {
    return 'Improve debate follow-up sequencing and role-aware questioning for this case pattern.'
  }
  if (normalizedTag.includes('correctness')) {
    return 'Audit reasoning assumptions and validation checkpoints for this case pattern.'
  }
  if (normalizedPhase.includes('debate')) {
    return 'Strengthen debate answer review and next-question generation for this workflow stage.'
  }
  if (normalizedPhase.includes('analysis')) {
    return 'Improve analysis recommendations and evidentiary gap framing for this workflow stage.'
  }
  return 'Review repeated dissatisfaction signals and tighten this stage for similar cases.'
}

function buildSignalStrength(negativeCount, totalCount) {
  const ratio = totalCount ? negativeCount / totalCount : 0
  if (negativeCount >= 5 || (negativeCount >= 3 && ratio >= 0.65)) return 'high'
  if (negativeCount >= 3 || (negativeCount >= 2 && ratio >= 0.5)) return 'medium'
  return 'low'
}

export async function buildFeedbackPatterns({ filters = {}, limit = 200 } = {}) {
  const entries = await listFeedbackItems(filters, limit)
  const grouped = new Map()

  for (const entry of entries) {
    const caseSignature = buildCaseSignature(entry)
    const issueTags = getIssueTags(entry)
    const negative = isNegativeFeedback(entry)
    const phaseContext = normalizeText(entry.phase_context || 'general')

    for (const issueTag of issueTags) {
      const normalizedIssueTag = normalizeText(issueTag || 'general_feedback')
      const key = [
        caseSignature.case_type,
        caseSignature.jurisdiction,
        caseSignature.evidence_band,
        normalizedIssueTag,
        phaseContext,
      ].join('::')
      const current = grouped.get(key) || {
        pattern_id: `pattern-${grouped.size + 1}`,
        case_type: caseSignature.case_type,
        jurisdiction: caseSignature.jurisdiction,
        evidence_band: caseSignature.evidence_band,
        evidence_level: caseSignature.evidence_level,
        stage: phaseContext,
        issue_tag: normalizedIssueTag,
        negative_count: 0,
        total_count: 0,
        supporting_feedback_refs: [],
        last_seen: '',
      }

      current.total_count += 1
      if (negative) current.negative_count += 1
      current.supporting_feedback_refs = Array.from(
        new Set([...current.supporting_feedback_refs, String(entry.feedback_id || '')].filter(Boolean)),
      ).slice(0, 12)
      current.last_seen =
        !current.last_seen || new Date(entry.created_at) > new Date(current.last_seen)
          ? entry.created_at
          : current.last_seen

      grouped.set(key, current)
    }
  }

  return Array.from(grouped.values())
    .map((pattern) => ({
      ...pattern,
      signal_strength: buildSignalStrength(pattern.negative_count, pattern.total_count),
      recommended_action: buildRecommendedAction(pattern.issue_tag, pattern.stage),
    }))
    .sort((left, right) => {
      if (right.negative_count !== left.negative_count) {
        return right.negative_count - left.negative_count
      }
      return right.total_count - left.total_count
    })
}

export async function buildFeedbackAlerts({ filters = {}, limit = 200 } = {}) {
  const patterns = await buildFeedbackPatterns({ filters, limit })
  return patterns.filter(
    (pattern) =>
      pattern.negative_count >= 2 &&
      (pattern.signal_strength === 'high' || pattern.signal_strength === 'medium'),
  )
}
