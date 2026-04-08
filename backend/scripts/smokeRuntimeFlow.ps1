$ErrorActionPreference = 'Stop'

$base = 'http://localhost:8000'

$payloadObj = @{
  description = 'I paid an advance under a service agreement, but the contractor stopped work and is refusing refund. I have chats and invoice but no bank statement attached yet.'
  category = 'Contract dispute'
  jurisdiction = 'Delhi'
  evidence = @(
    @{ name = 'agreement.pdf'; size = 120000; type = 'application/pdf' }
    @{ name = 'whatsapp_chat.txt'; size = 8000; type = 'text/plain' }
    @{ name = 'invoice.jpg'; size = 45000; type = 'image/jpeg' }
  )
}

$payload = $payloadObj | ConvertTo-Json -Depth 8
$created = Invoke-RestMethod -Method Post -Uri "$base/api/cases" -ContentType 'application/json' -Body $payload
$caseId = $created.data.case_id

$doc = Invoke-RestMethod -Method Post -Uri "$base/api/cases/$caseId/document-intelligence" -ContentType 'application/json' -Body '{}'
$analysis = Invoke-RestMethod -Method Post -Uri "$base/api/cases/$caseId/analyze" -ContentType 'application/json' -Body '{}'
$verdict = Invoke-RestMethod -Method Get -Uri "$base/api/cases/$caseId/verdict"
$debateStart = Invoke-RestMethod -Method Post -Uri "$base/api/cases/$caseId/debate/start" -ContentType 'application/json' -Body '{"reset":true}'
$qid = $debateStart.data.current_question.question_id

$debateAnswerBody = @{
  question_id = $qid
  custom_answer = 'I can provide UTR and statement this week, and I have signed acknowledgements in chat.'
} | ConvertTo-Json -Depth 6
$debateAnswer = Invoke-RestMethod -Method Post -Uri "$base/api/cases/$caseId/debate/answer" -ContentType 'application/json' -Body $debateAnswerBody

$feedbackBody = @{
  case_id = $caseId
  feedback_type = 'user_comment'
  satisfaction_status = 'no'
  comment = 'Need clearer contradiction tracing and document action priorities.'
  linked_feature_or_agent = 'debate_simulation'
  metadata = @{ case_input = @{ category = 'Contract dispute'; jurisdiction = 'Delhi' } }
} | ConvertTo-Json -Depth 8
$feedback = Invoke-RestMethod -Method Post -Uri "$base/api/cases/$caseId/feedback" -ContentType 'application/json' -Body $feedbackBody

$graphQueryBody = @{
  case_id = $caseId
  issue = 'payment proof'
  legal_rule = 'contract'
  side = ''
  limit = 5
} | ConvertTo-Json -Depth 6
$graphQuery = Invoke-RestMethod -Method Post -Uri "$base/api/knowledge-graph/query" -ContentType 'application/json' -Body $graphQueryBody

$graphPatternBody = @{
  case_id = $caseId
  query_type = 'unresolved_issues'
  limit = 5
} | ConvertTo-Json -Depth 6
$graphPattern = Invoke-RestMethod -Method Post -Uri "$base/api/knowledge-graph/query/pattern" -ContentType 'application/json' -Body $graphPatternBody

$result = [pscustomobject]@{
  case_id = $caseId
  doc_readiness = $doc.data.readiness_status
  analysis_has_structured_synthesis = [bool]$analysis.data.structured_synthesis
  analysis_has_graph_context = [bool]$analysis.data.graph_context
  analysis_has_knowledge_graph = [bool]$analysis.data.knowledgeGraph
  verdict_layer_count = ($verdict.data.verdict_layers | Measure-Object).Count
  verdict_has_graph_layer = [bool](($verdict.data.verdict_layers | Where-Object { $_.layer_name -eq 'Graph Explainability Layer' } | Measure-Object).Count -gt 0)
  debate_question_id = $qid
  debate_unresolved_count = ($debateAnswer.data.unresolved_issues | Measure-Object).Count
  debate_route_reason = $debateAnswer.data.feedback_memory.last_route_reason
  feedback_saved = [bool]$feedback.data.feedback_item
  graph_query_available = [bool]$graphQuery.data.available
  graph_pattern_count = ($graphPattern.data.result | Measure-Object).Count
}

$result | ConvertTo-Json -Depth 8
