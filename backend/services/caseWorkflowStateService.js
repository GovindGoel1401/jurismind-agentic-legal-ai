function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function mergeWorkflowState(base = {}, patch = {}) {
  if (!isPlainObject(base)) return patch
  if (!isPlainObject(patch)) return patch

  const next = { ...base }

  Object.entries(patch).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      next[key] = [...value]
      return
    }

    if (isPlainObject(value)) {
      next[key] = mergeWorkflowState(isPlainObject(base[key]) ? base[key] : {}, value)
      return
    }

    next[key] = value
  })

  return next
}

export function normalizeCaseInput(caseInput = {}) {
  const description = String(caseInput.description || caseInput.caseText || '').trim()
  const evidence = Array.isArray(caseInput.evidence) ? caseInput.evidence : []

  return {
    ...caseInput,
    description,
    caseText: description,
    evidence,
    fileCount:
      Number(caseInput.fileCount) ||
      Number(caseInput.file_count) ||
      evidence.length,
  }
}

export function buildWorkflowIntakeState(caseInput = {}, caseId = '') {
  const normalized = normalizeCaseInput(caseInput)

  return {
    case_id: String(caseId || normalized.caseId || ''),
    category: String(normalized.category || '').trim(),
    jurisdiction: String(normalized.jurisdiction || '').trim(),
    description: normalized.description,
    uploaded_files: normalized.evidence.map((file) => ({
      name: String(file?.name || ''),
      size: Number(file?.size || 0),
      type: String(file?.type || 'application/octet-stream'),
    })),
    file_count: Number(normalized.fileCount || 0),
  }
}

function buildLegacyDocumentsState(record = {}) {
  const fromAnalysis = record.analysisResult?.documentIntelligence
  if (isPlainObject(fromAnalysis) && Object.keys(fromAnalysis).length) {
    return { ...fromAnalysis }
  }

  const hasLegacyDocumentFields =
    Array.isArray(record.uploadedDocuments) ||
    Array.isArray(record.availableDocuments) ||
    Array.isArray(record.missingDocuments) ||
    Array.isArray(record.optionalDocuments) ||
    Array.isArray(record.evidenceInventory)

  if (!hasLegacyDocumentFields) {
    return {}
  }

  return {
    case_submission: record.caseSubmission || {},
    detected_documents: record.uploadedDocuments || [],
    available_documents: record.availableDocuments || [],
    missing_documents: record.missingDocuments || [],
    optional_documents: record.optionalDocuments || [],
    evidence_inventory: record.evidenceInventory || [],
    checklist: record.documentChecklist || { required: [], optional: [] },
    completeness_score: Number(record.completenessScore || 0),
    completeness_explanation: String(record.completenessExplanation || ''),
    readiness_status: String(record.readinessStatus || 'NOT_READY'),
    readiness_assessment: record.readinessAssessment || {},
    initial_reliability_notes: record.initialReliabilityNotes || [],
  }
}

function buildLegacySimilarCasesState(record = {}, analysisResponse = {}) {
  if (record.workflowState?.similar_cases) {
    return record.workflowState.similar_cases
  }

  if (analysisResponse?.similarCaseIntelligence) {
    return {
      last_query: String(
        record.caseInput?.description || record.caseInput?.caseText || '',
      ),
      result: analysisResponse.similarCaseIntelligence,
    }
  }

  return {}
}

export function buildStageStatus(workflowState = {}) {
  const documents = workflowState.documents || {}
  const analysis = workflowState.analysis || {}
  const verdict = workflowState.verdict || {}
  const similarCases = workflowState.similar_cases || {}
  const debate = workflowState.debate || {}
  const feedback = workflowState.feedback || {}

  return {
    intake: workflowState.intake?.description ? 'completed' : 'pending',
    document_intelligence:
      documents.readiness_status || documents.completeness_score != null ? 'completed' : 'pending',
    analysis:
      analysis.response && Object.keys(analysis.response).length ? 'completed' : 'pending',
    verdict: verdict && Object.keys(verdict).length ? 'completed' : 'pending',
    debate:
      debate.session_memory?.session_id || debate.question_bank?.length ? 'completed' : 'pending',
    similar_cases:
      similarCases.result?.similar_cases?.length || similarCases.last_query ? 'completed' : 'pending',
    feedback:
      feedback.entries?.length || feedback.insights?.length ? 'completed' : 'pending',
  }
}

export function normalizeWorkflowState(record = {}) {
  const existing = isPlainObject(record.workflowState) ? record.workflowState : {}
  const caseId = String(record._id || record.case_id || existing.intake?.case_id || '')
  const caseInput = normalizeCaseInput(record.caseInput || existing.intake || {})
  const analysisResponse =
    existing.analysis?.response && Object.keys(existing.analysis.response).length
      ? existing.analysis.response
      : record.analysisResult || {}

  const derived = {
    intake: buildWorkflowIntakeState(caseInput, caseId),
    documents:
      existing.documents && Object.keys(existing.documents).length
        ? existing.documents
        : buildLegacyDocumentsState(record),
    analysis:
      analysisResponse && Object.keys(analysisResponse).length
        ? {
            response: analysisResponse,
            case_assessment: analysisResponse.caseAssessment || null,
            feedback_learning: analysisResponse.learningProfile || null,
            updated_at: record.updatedAt || record.updated_at || new Date().toISOString(),
          }
        : {},
    verdict:
      existing.verdict && Object.keys(existing.verdict).length
        ? existing.verdict
        : analysisResponse?.verdict || {},
    similar_cases: buildLegacySimilarCasesState(record, analysisResponse),
    debate: existing.debate || {},
    feedback: existing.feedback || { entries: [], insights: [], warning_flags: [] },
    traces: mergeWorkflowState(
      {
        pipelineTrace: analysisResponse.pipelineTrace || [],
        pipelineMeta: analysisResponse.pipelineMeta || {},
      },
      existing.traces || {},
    ),
  }

  const merged = mergeWorkflowState(derived, existing)
  merged.stage_status = buildStageStatus(merged)
  return merged
}

export function buildStorageSyncPayload(workflowState = {}) {
  const intake = workflowState.intake || {}
  const documents = workflowState.documents || {}
  const analysisResponse = workflowState.analysis?.response || {}

  return {
    caseInput: {
      category: intake.category || '',
      jurisdiction: intake.jurisdiction || '',
      description: intake.description || '',
      caseText: intake.description || '',
      evidence: intake.uploaded_files || [],
      fileCount: Number(intake.file_count || 0),
    },
    caseSubmission:
      documents.case_submission ||
      {
        category: intake.category || '',
        jurisdiction: intake.jurisdiction || '',
        descriptionLength: String(intake.description || '').length,
        uploadedDocumentCount: Number(intake.file_count || 0),
      },
    uploadedDocuments: documents.detected_documents || [],
    availableDocuments: documents.available_documents || [],
    missingDocuments: documents.missing_documents || [],
    optionalDocuments: documents.optional_documents || [],
    evidenceInventory: documents.evidence_inventory || [],
    documentChecklist: documents.checklist || { required: [], optional: [] },
    completenessScore: Number(documents.completeness_score || 0),
    completenessExplanation: String(documents.completeness_explanation || ''),
    readinessStatus: String(documents.readiness_status || 'NOT_READY'),
    readinessAssessment: documents.readiness_assessment || {},
    initialReliabilityNotes: documents.initial_reliability_notes || [],
    analysisResult: analysisResponse,
  }
}
