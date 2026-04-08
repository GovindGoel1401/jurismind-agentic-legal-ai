const base = process.env.BASE_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(`Request failed ${path}: ${response.status} ${JSON.stringify(data)}`)
  }

  return data
}

async function main() {
  const payload = {
    description:
      'I paid an advance under a service agreement, but the contractor stopped work and is refusing refund. I have chats and invoice but no bank statement attached yet.',
    category: 'Contract dispute',
    jurisdiction: 'Delhi',
    evidence: [
      { name: 'agreement.pdf', size: 120000, type: 'application/pdf' },
      { name: 'whatsapp_chat.txt', size: 8000, type: 'text/plain' },
      { name: 'invoice.jpg', size: 45000, type: 'image/jpeg' },
    ],
  }

  const created = await request('/api/cases', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const caseId = created?.data?.case_id
  if (!caseId) {
    throw new Error('Missing caseId from create case response')
  }

  const doc = await request(`/api/cases/${caseId}/document-intelligence`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  const analysis = await request(`/api/cases/${caseId}/analyze`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  const verdict = await request(`/api/cases/${caseId}/verdict`)
  const debateStart = await request(`/api/cases/${caseId}/debate/start`, {
    method: 'POST',
    body: JSON.stringify({ reset: true }),
  })

  const questionId = debateStart?.data?.current_question?.question_id
  if (!questionId) {
    throw new Error('Missing question id from debate start')
  }

  const debateAnswer = await request(`/api/cases/${caseId}/debate/answer`, {
    method: 'POST',
    body: JSON.stringify({
      question_id: questionId,
      custom_answer:
        'I can provide UTR and statement this week, and I have signed acknowledgements in chat.',
    }),
  })

  const feedback = await request(`/api/cases/${caseId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({
      case_id: caseId,
      feedback_type: 'user_comment',
      satisfaction_status: 'no',
      comment: 'Need clearer contradiction tracing and document action priorities.',
      linked_feature_or_agent: 'debate_simulation',
      metadata: { case_input: { category: 'Contract dispute', jurisdiction: 'Delhi' } },
    }),
  })

  const graphQuery = await request('/api/knowledge-graph/query', {
    method: 'POST',
    body: JSON.stringify({
      case_id: caseId,
      issue: 'payment proof',
      legal_rule: 'contract',
      side: '',
      limit: 5,
    }),
  })

  const graphPattern = await request('/api/knowledge-graph/query/pattern', {
    method: 'POST',
    body: JSON.stringify({
      case_id: caseId,
      query_type: 'unresolved_issues',
      limit: 5,
    }),
  })

  const result = {
    case_id: caseId,
    doc_readiness: doc?.data?.readiness_status || null,
    analysis_has_structured_synthesis: Boolean(analysis?.data?.structured_synthesis),
    analysis_has_graph_context: Boolean(analysis?.data?.graph_context),
    analysis_has_knowledge_graph: Boolean(analysis?.data?.knowledgeGraph),
    verdict_layer_count: Array.isArray(verdict?.data?.verdict_layers) ? verdict.data.verdict_layers.length : 0,
    verdict_has_graph_layer: Array.isArray(verdict?.data?.verdict_layers)
      ? verdict.data.verdict_layers.some((layer) => layer?.layer_name === 'Graph Explainability Layer')
      : false,
    debate_question_id: questionId,
    debate_unresolved_count: Array.isArray(debateAnswer?.data?.unresolved_issues)
      ? debateAnswer.data.unresolved_issues.length
      : 0,
    debate_route_reason: debateAnswer?.data?.feedback_memory?.last_route_reason || null,
    feedback_saved: Boolean(feedback?.data?.feedback_item),
    graph_query_available: Boolean(graphQuery?.data?.available),
    graph_pattern_count: Array.isArray(graphPattern?.data?.result)
      ? graphPattern.data.result.length
      : 0,
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(String(error?.stack || error?.message || error))
  process.exitCode = 1
})
