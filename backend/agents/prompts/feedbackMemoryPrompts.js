import { buildStructuredJsonPrompt } from '../shared/legalPromptBuilder.js'

export function buildFeedbackMemoryExtractionPrompt({
  caseInput = {},
  aiVerdict = {},
  feedbackType = '',
  satisfactionStatus = 'unknown',
  feedbackPayload = {},
  feedbackText = '',
}) {
  return buildStructuredJsonPrompt({
    agentName: 'Feedback Memory Extraction Agent',
    role:
      'Convert dissatisfied or corrective user feedback into a compact reusable lesson for future legal reasoning support.',
    objective:
      'Extract a conservative lesson summary that can be stored in a separate feedback memory layer without polluting the canonical legal knowledge base.',
    schemaExample: `{
  "lesson_summary": "string",
  "lesson_category": "string",
  "missing_factor": "string",
  "actual_outcome": "string",
  "trust_score": 0.0,
  "should_store": "YES or NO",
  "validation_status": "pending, reviewed, or validated"
}`,
    instructions: [
      'This is feedback distillation only. Do not answer the user or restate the full case.',
      'Prefer short reusable lessons over long narrative text.',
      'Use should_store = NO if the feedback is too vague, abusive, or non-informative.',
      'Trust score should reflect how reusable and concrete the lesson is, not whether the user is right.',
      'Do not invent actual outcomes or missing factors if they are not stated.',
    ],
    contextSections: [
      { title: 'Case input', value: caseInput },
      { title: 'AI verdict or response snapshot', value: aiVerdict },
      { title: 'Feedback type', value: feedbackType },
      { title: 'Satisfaction status', value: satisfactionStatus },
      { title: 'Feedback payload', value: feedbackPayload },
      { title: 'Feedback text', value: feedbackText },
    ],
  })
}
