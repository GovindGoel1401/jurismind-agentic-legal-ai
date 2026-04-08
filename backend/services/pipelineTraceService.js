import { LEGAL_PIPELINE_STAGES } from '../langgraph/pipeline.js'

function summarizeValue(value, fallback) {
  if (!value) return fallback
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.length ? value.join('; ') : fallback
  return fallback
}

function summarizeMeta(meta) {
  if (!meta) return null

  return {
    source: meta.source || 'unknown',
    durationMs: meta.durationMs ?? null,
    model: meta.model || null,
    issues: meta.issues || [],
  }
}

function buildStageDetails(graphResult) {
  return {
    'case-interpreter': {
      status: graphResult.structuredCase ? 'completed' : 'pending',
      detail: summarizeValue(
        graphResult.structuredCase?.claims,
        graphResult.structuredCase?.case_type
          ? `Structured as ${graphResult.structuredCase.case_type}.`
          : 'Structured case details not available.',
      ),
      meta: summarizeMeta(graphResult.caseInterpreterMeta),
    },
    'evidence-analyzer': {
      status: graphResult.evidenceAnalysis ? 'completed' : 'pending',
      detail: graphResult.evidence_score
        ? `Evidence score: ${graphResult.evidence_score}/10.`
        : 'Evidence score not available.',
      meta: summarizeMeta(graphResult.evidenceMeta || graphResult.evidenceAnalysis?.meta),
    },
    'legal-research': {
      status: graphResult.legalResearch ? 'completed' : 'pending',
      detail:
        graphResult.relevant_laws?.length > 0
          ? `Retrieved ${graphResult.relevant_laws.length} law topic(s).`
          : 'No explicit laws retrieved.',
      meta: summarizeMeta(graphResult.legalResearchMeta),
    },
    defense: {
      status: graphResult.defense_arguments?.length ? 'completed' : 'pending',
      detail:
        graphResult.defense_arguments?.[0] || 'Defense-side arguments are not available yet.',
      meta: summarizeMeta(graphResult.defenseMeta),
    },
    prosecution: {
      status: graphResult.prosecution_arguments?.length ? 'completed' : 'pending',
      detail:
        graphResult.prosecution_arguments?.[0] ||
        'Prosecution-side arguments are not available yet.',
      meta: summarizeMeta(graphResult.prosecutionMeta),
    },
    judge: {
      status: graphResult.reasoning || graphResult.judgeReasoning ? 'completed' : 'pending',
      detail:
        graphResult.reasoning ||
        graphResult.judgeReasoning ||
        'Judge reasoning summary is not available.',
      meta: summarizeMeta(graphResult.judgeMeta),
    },
    verdict: {
      status: graphResult.verdict ? 'completed' : 'pending',
      detail:
        graphResult.verdict?.verdict ||
        graphResult.verdict_text ||
        'Verdict summary is not available.',
      meta: summarizeMeta(graphResult.verdictMeta),
    },
    reflection: {
      status:
        graphResult.reflection ||
        graphResult.final_verdict?.reflection ||
        (graphResult.improvement_suggestions && graphResult.improvement_suggestions.length > 0)
          ? 'completed'
          : 'pending',
      detail:
        graphResult.improvement_suggestions?.[0] ||
        graphResult.final_verdict?.reflection?.improvement_suggestions?.[0] ||
        'No reflection improvement suggestion available.',
      meta: summarizeMeta(graphResult.reflectionMeta),
    },
  }
}

export function buildPipelineTrace(graphResult) {
  const stageDetails = buildStageDetails(graphResult)

  return LEGAL_PIPELINE_STAGES.map((stage) => ({
    key: stage.key,
    name: stage.name,
    summary: stage.summary,
    status: stageDetails[stage.key]?.status || 'pending',
    detail: stageDetails[stage.key]?.detail || stage.summary,
    meta: stageDetails[stage.key]?.meta || null,
  }))
}
