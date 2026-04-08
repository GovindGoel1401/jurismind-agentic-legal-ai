import mongoose from 'mongoose'
import { CaseModel } from '../models/caseSchema.js'
import { logger } from '../utils/logger.js'
import {
  buildStorageSyncPayload,
  buildWorkflowIntakeState,
  mergeWorkflowState,
  normalizeCaseInput,
  normalizeWorkflowState,
} from './caseWorkflowStateService.js'

const inMemoryCaseStore = []

function withWorkflow(record = {}) {
  const workflowState = normalizeWorkflowState(record)
  const syncedFields = buildStorageSyncPayload(workflowState)

  return {
    ...record,
    ...syncedFields,
    workflowState,
  }
}

function toCaseSummary(record) {
  const resolved = withWorkflow(record)
  const workflowState = resolved.workflowState || {}
  const verdict = workflowState.verdict || resolved.analysisResult?.verdict || {}

  return {
    case_id: String(resolved._id || resolved.case_id || workflowState.intake?.case_id || ''),
    category:
      workflowState.intake?.category ||
      resolved.caseInput?.category ||
      resolved.caseSubmission?.category ||
      'general-dispute',
    jurisdiction:
      workflowState.intake?.jurisdiction ||
      resolved.caseInput?.jurisdiction ||
      resolved.caseSubmission?.jurisdiction ||
      'Unspecified jurisdiction',
    description:
      workflowState.intake?.description ||
      resolved.caseInput?.description ||
      resolved.caseInput?.caseText ||
      'No case description provided.',
    created_at: resolved.createdAt || resolved.created_at || new Date().toISOString(),
    updated_at: resolved.updatedAt || resolved.updated_at || new Date().toISOString(),
    readiness_status:
      workflowState.documents?.readiness_status ||
      resolved.readinessStatus ||
      resolved.analysisResult?.documentIntelligence?.readiness_status ||
      'NOT_READY',
    verdict_label:
      verdict?.verdict_summary ||
      verdict?.verdict ||
      verdict?.verdict_text ||
      'Verdict unavailable',
  }
}

function toCaseDetail(record) {
  const resolved = withWorkflow(record)

  return {
    case_id: String(resolved._id || resolved.case_id || resolved.workflowState?.intake?.case_id || ''),
    caseInput: resolved.caseInput || {},
    analysisResult: resolved.analysisResult || {},
    workflowState: resolved.workflowState || {},
    created_at: resolved.createdAt || resolved.created_at || new Date().toISOString(),
    updated_at: resolved.updatedAt || resolved.updated_at || new Date().toISOString(),
  }
}

async function findStoredRecord(caseId) {
  if (!caseId) return null

  if (mongoose.connection.readyState === 1) {
    if (!mongoose.Types.ObjectId.isValid(caseId)) return null
    return CaseModel.findById(caseId).lean()
  }

  return inMemoryCaseStore.find((item) => String(item._id) === String(caseId)) || null
}

function buildPersistedPayload(payload = {}) {
  const caseInput = normalizeCaseInput(payload.caseInput || {})
  const workflowState = normalizeWorkflowState({
    ...payload,
    caseInput,
  })
  const syncedFields = buildStorageSyncPayload(workflowState)

  return {
    ...payload,
    ...syncedFields,
    caseInput,
    workflowState,
  }
}

export async function saveCaseRecord(payload) {
  const persistedPayload = buildPersistedPayload(payload)

  if (mongoose.connection.readyState === 1) {
    const document = await CaseModel.create(persistedPayload)
    return toCaseDetail(document.toObject())
  }

  const entry = {
    _id: `case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...persistedPayload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  inMemoryCaseStore.unshift(entry)
  logger.warn('MongoDB not connected. Stored case in memory fallback.')
  return toCaseDetail(entry)
}

export async function createCaseWorkflow(caseInput = {}) {
  return saveCaseRecord({
    caseInput: normalizeCaseInput(caseInput),
    workflowState: {
      intake: buildWorkflowIntakeState(caseInput),
      documents: {},
      analysis: {},
      verdict: {},
      debate: {},
      similar_cases: {},
      feedback: {
        entries: [],
        insights: [],
        warning_flags: [],
      },
      traces: {},
    },
  })
}

export async function listCaseRecords(limit = 12) {
  if (mongoose.connection.readyState === 1) {
    const records = await CaseModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
    return records.map(toCaseSummary)
  }

  return inMemoryCaseStore.slice(0, limit).map(toCaseSummary)
}

export async function getCaseRecord(caseId) {
  const record = await findStoredRecord(caseId)
  if (!record) return null
  return toCaseDetail(record)
}

export async function getCaseWorkflowState(caseId) {
  const record = await findStoredRecord(caseId)
  if (!record) return null
  return normalizeWorkflowState(record)
}

export async function updateCaseWorkflowState(caseId, workflowPatch = {}) {
  const existingRecord = await findStoredRecord(caseId)
  if (!existingRecord) return null

  const currentWorkflowState = normalizeWorkflowState(existingRecord)
  const nextWorkflowState = normalizeWorkflowState({
    ...existingRecord,
    workflowState: mergeWorkflowState(currentWorkflowState, workflowPatch),
  })
  const syncedFields = buildStorageSyncPayload(nextWorkflowState)
  const updatePayload = {
    ...syncedFields,
    workflowState: nextWorkflowState,
  }

  if (mongoose.connection.readyState === 1) {
    const updated = await CaseModel.findByIdAndUpdate(
      caseId,
      {
        $set: updatePayload,
      },
      { new: true },
    ).lean()
    return updated ? toCaseDetail(updated) : null
  }

  const index = inMemoryCaseStore.findIndex((item) => String(item._id) === String(caseId))
  if (index === -1) return null
  inMemoryCaseStore[index] = {
    ...inMemoryCaseStore[index],
    ...updatePayload,
    updatedAt: new Date().toISOString(),
  }
  return toCaseDetail(inMemoryCaseStore[index])
}

export async function updateCaseAnalysisResult(caseId, partialAnalysisResult = {}) {
  const workflowPatch = {
    analysis: {
      response: partialAnalysisResult,
      case_assessment: partialAnalysisResult.caseAssessment || null,
      feedback_learning: partialAnalysisResult.learningProfile || null,
      updated_at: new Date().toISOString(),
    },
    verdict: partialAnalysisResult.verdict || {},
    traces: {
      pipelineTrace: partialAnalysisResult.pipelineTrace || [],
      pipelineMeta: partialAnalysisResult.pipelineMeta || {},
    },
  }

  if (partialAnalysisResult.similarCaseIntelligence) {
    workflowPatch.similar_cases = {
      result: partialAnalysisResult.similarCaseIntelligence,
      updated_at: new Date().toISOString(),
    }
  }

  return updateCaseWorkflowState(caseId, workflowPatch)
}
