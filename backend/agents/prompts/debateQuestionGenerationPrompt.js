import { buildStructuredJsonPrompt } from '../shared/legalPromptBuilder.js'

export function buildDebateQuestionGenerationPrompt({
  caseInput = {},
  analysis = {},
  verdict = {},
  similarCaseIntelligence = {},
  sessionMemory = {},
  latestAnswerRecord = null,
}) {
  return buildStructuredJsonPrompt({
    agentName: 'Debate Question Generator',
    role:
      'Generate realistic defense-side and prosecution-side follow-up questions for a live legal debate simulation.',
    objective:
      'Create the next best adversarial and supportive questions using the current case, prior session turns from this same case only, and the latest user answer.',
    schemaExample: `{
  "defense_questions": [
    {
      "question": "question text",
      "why_this_question_matters": "why it matters",
      "linked_issue_or_evidence": "issue label",
      "issue_type": "issue type",
      "issue_reference": "specific reference",
      "impact_axis": "impact axis",
      "suggested_answer": "best answer the user could give",
      "answer_reasoning": "why that answer is strong",
      "risk_note": "what to avoid"
    }
  ],
  "prosecution_questions": [
    {
      "question": "question text",
      "why_this_question_matters": "why it matters",
      "linked_issue_or_evidence": "issue label",
      "issue_type": "issue type",
      "issue_reference": "specific reference",
      "impact_axis": "impact axis",
      "suggested_answer": "best answer the user could give",
      "answer_reasoning": "why that answer is strong",
      "risk_note": "what to avoid"
    }
  ],
  "session_strategy_note": "one short note about what the next round should test"
}`,
    instructions: [
      'Generate realistic courtroom or negotiation-style questioning.',
      'Both sides should react to the latest answer if one exists.',
      'Questions may still refer to earlier session history, but the latest answer should shape the next turn most strongly.',
      'Defense questions should help the user strengthen the case record.',
      'Prosecution questions should press weak facts, contradictions, motive, timeline, documents, and credibility.',
      'Suggested answers must be the strongest credible answer, not an exaggerated or unsupported one.',
      'Return JSON only.',
    ],
    contextSections: [
      { title: 'Case input', value: caseInput },
      { title: 'Analysis', value: analysis },
      { title: 'Verdict', value: verdict },
      { title: 'Similar-case intelligence', value: similarCaseIntelligence },
      { title: 'Debate session memory', value: sessionMemory },
      { title: 'Latest answer record', value: latestAnswerRecord || {} },
    ],
  })
}
