import mongoose from 'mongoose'
import { FeedbackIntelligenceModel } from '../../models/feedbackIntelligenceSchema.js'
import { logger } from '../../utils/logger.js'

const inMemoryFeedbackIntelligenceStore = []

function buildFeedbackId() {
  return `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeCaseSignature(payload = {}) {
  const caseInput = payload?.metadata?.case_input || {}
  const provided = payload.case_signature || {}
  const docCompleteness = Number(
    provided.doc_completeness ??
      caseInput.doc_completeness ??
      caseInput.completeness_score ??
      0,
  )
  const evidenceBand =
    normalizeText(provided.evidence_band) ||
    normalizeText(
      docCompleteness >= 0.7
        ? 'high'
        : docCompleteness >= 0.4
          ? 'medium'
          : 'low',
    )

  return {
    case_type: normalizeText(provided.case_type || caseInput.category),
    jurisdiction: normalizeText(provided.jurisdiction || caseInput.jurisdiction),
    evidence_level: normalizeText(provided.evidence_level || evidenceBand),
    doc_completeness: Number.isFinite(docCompleteness) ? docCompleteness : 0,
    evidence_band: evidenceBand,
  }
}

function normalizePayload(payload = {}) {
  const issueTags = ensureArray(payload.issue_tags).map((item) => normalizeText(item)).filter(Boolean)
  const tags = Array.from(
    new Set([...ensureArray(payload.tags).map((item) => normalizeText(item)).filter(Boolean), ...issueTags]),
  )

  return {
    ...payload,
    tags,
    issue_tags: issueTags,
    metadata: payload.metadata || {},
    payload: payload.payload || {},
    satisfaction_status: payload.satisfaction_status || 'unknown',
    comment: normalizeText(payload.comment || payload.payload?.user_comment),
    user_rating:
      payload.user_rating == null || Number.isNaN(Number(payload.user_rating))
        ? null
        : Number(payload.user_rating),
    verdict_helpful:
      typeof payload.verdict_helpful === 'boolean' ? payload.verdict_helpful : null,
    analysis_helpful:
      typeof payload.analysis_helpful === 'boolean' ? payload.analysis_helpful : null,
    debate_helpful:
      typeof payload.debate_helpful === 'boolean' ? payload.debate_helpful : null,
    document_guidance_helpful:
      typeof payload.document_guidance_helpful === 'boolean'
        ? payload.document_guidance_helpful
        : null,
    similar_cases_helpful:
      typeof payload.similar_cases_helpful === 'boolean'
        ? payload.similar_cases_helpful
        : null,
    case_signature: normalizeCaseSignature(payload),
    lesson_summary: String(payload.lesson_summary || '').trim(),
    lesson_category: String(payload.lesson_category || '').trim(),
    missing_factor: String(payload.missing_factor || '').trim(),
    trust_score: Number.isFinite(Number(payload.trust_score))
      ? Number(payload.trust_score)
      : 0.5,
    validation_status: payload.validation_status || 'pending',
    feedback_memory_indexed: Boolean(payload.feedback_memory_indexed),
  }
}

export async function storeFeedbackItem(payload) {
  const normalized = {
    feedback_id: payload.feedback_id || buildFeedbackId(),
    created_at: payload.created_at ? new Date(payload.created_at) : new Date(),
    ...normalizePayload(payload),
  }

  if (mongoose.connection.readyState === 1) {
    const document = await FeedbackIntelligenceModel.create(normalized)
    return document.toObject()
  }

  const inMemoryEntry = {
    ...normalized,
    created_at: normalized.created_at.toISOString(),
  }
  inMemoryFeedbackIntelligenceStore.unshift(inMemoryEntry)
  logger.warn('MongoDB not connected. Stored feedback intelligence in memory fallback.')
  return inMemoryEntry
}

export async function listFeedbackItems(filters = {}, limit = 100) {
  if (mongoose.connection.readyState === 1) {
    const query = {}

    if (filters.case_id) query.case_id = filters.case_id
    if (filters.session_id) query.session_id = filters.session_id
    if (filters.feedback_type) query.feedback_type = filters.feedback_type
    if (filters.phase_context) query.phase_context = filters.phase_context
    if (filters.linked_feature_or_agent) query.linked_feature_or_agent = filters.linked_feature_or_agent
    if (filters.tags?.length) query.tags = { $in: filters.tags }
    if (filters.issue_tags?.length) query.issue_tags = { $in: filters.issue_tags }

    return FeedbackIntelligenceModel.find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .lean()
  }

  return inMemoryFeedbackIntelligenceStore
    .filter((entry) => {
      if (filters.case_id && entry.case_id !== filters.case_id) return false
      if (filters.session_id && entry.session_id !== filters.session_id) return false
      if (filters.feedback_type && entry.feedback_type !== filters.feedback_type) return false
      if (filters.phase_context && entry.phase_context !== filters.phase_context) return false
      if (
        filters.linked_feature_or_agent &&
        entry.linked_feature_or_agent !== filters.linked_feature_or_agent
      ) {
        return false
      }
      if (filters.tags?.length) {
        const tags = ensureArray(entry.tags)
        if (!filters.tags.some((tag) => tags.includes(tag))) return false
      }
      if (filters.issue_tags?.length) {
        const issueTags = ensureArray(entry.issue_tags)
        if (!filters.issue_tags.some((tag) => issueTags.includes(tag))) return false
      }
      return true
    })
    .slice(0, limit)
}

export function getInMemoryFeedbackIntelligence() {
  return [...inMemoryFeedbackIntelligenceStore]
}
