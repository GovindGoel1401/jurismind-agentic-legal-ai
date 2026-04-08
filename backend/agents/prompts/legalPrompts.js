import { buildStructuredJsonPrompt } from '../shared/legalPromptBuilder.js'

function buildConditionalRetrievalSections(state = {}) {
  const sections = []
  const routing = state?.retrievalRouting || state?.legalResearch?.retrieval_context?.routing || {}
  const evidenceBlock =
    state?.retrievalContext?.evidence_text_block ||
    state?.legalResearch?.retrieval_context?.evidence_text_block ||
    ''
  const rulesBlock =
    state?.retrievalContext?.rules_text_block ||
    state?.legalResearch?.retrieval_context?.rules_text_block ||
    ''

  if (routing && Object.keys(routing).length) {
    sections.push({ title: 'Retrieval routing', value: routing })
  }
  if (evidenceBlock) {
    sections.push({ title: 'Retrieved evidence', value: evidenceBlock })
  }
  if (rulesBlock) {
    sections.push({ title: 'Retrieved rules', value: rulesBlock })
  }

  return sections
}

export function buildCaseInterpreterPrompt(caseInput) {
  return buildStructuredJsonPrompt({
    agentName: 'Case Interpreter Agent',
    role:
      'Convert unstructured legal dispute narratives into a stable normalized case representation.',
    objective:
      'Identify the likely case type, jurisdiction, parties, claims, and law topics without fabricating formal citations.',
    schemaExample: `{
  "case_type": "string",
  "jurisdiction": "string",
  "entities": ["string"],
  "claims": ["string"],
  "possible_laws": ["string"]
}`,
    instructions: [
      'Keep the output concise and legally plausible.',
      'Use law-topic descriptions if exact statutes are not explicit in the case facts.',
    ],
    contextSections: [{ title: 'User case input', value: caseInput }],
  })
}

export function buildEvidenceAnalyzerPrompt(structuredCase, caseDescription) {
  return buildStructuredJsonPrompt({
    agentName: 'Evidence Analyzer Agent',
    role: 'Evaluate the evidentiary posture of the case with a practical litigation mindset.',
    objective:
      'Score the available evidence, identify major missing proof, and flag contradictions that weaken credibility.',
    schemaExample: `{
  "evidence_score": number,
  "missing_evidence": ["string"],
  "contradictions": ["string"]
}`,
    instructions: [
      'Use a 1-10 evidence score where higher means stronger support.',
      'Prioritize gaps that would materially affect a legal filing or negotiation.',
    ],
    contextSections: [
      { title: 'Structured case', value: structuredCase },
      { title: 'Case description', value: caseDescription },
    ],
  })
}

export function buildJudgePrompt(state) {
  return buildStructuredJsonPrompt({
    agentName: 'Judge Reasoning Agent',
    role:
      'Act like a neutral legal decision-maker balancing both sides, evidentiary quality, and retrieval-informed legal context.',
    objective:
      'Produce concise judicial reasoning and a normalized probability split across user win, opponent win, and settlement.',
    schemaExample: `{
  "reasoning": "string",
  "win_probability_user": number,
  "win_probability_opponent": number,
  "settlement_probability": number
}`,
    instructions: [
      'Ground the reasoning in the evidence, debate, and retrieved legal context.',
      'Avoid certainty when evidence gaps or legal ambiguity remain.',
      'The three probabilities do not need to sum to 1 exactly; normalization will happen later.',
    ],
    contextSections: [
      { title: 'Defense arguments', value: state.defense_arguments || [] },
      { title: 'Prosecution arguments', value: state.prosecution_arguments || [] },
      { title: 'Rebuttal points', value: state.rebuttal_points || [] },
      { title: 'Evidence analysis', value: state.evidenceAnalysis || {} },
      { title: 'Relevant laws', value: state.relevant_laws || [] },
      ...buildConditionalRetrievalSections(state),
      {
        title: 'Feedback learning summary',
        value: {
          summary: state?.feedbackLearning?.summary || 'No prior feedback memory available.',
          recommendedAdjustments: state?.feedbackLearning?.recommendedAdjustments || [],
        },
      },
    ],
  })
}

export function buildReflectionPrompt(state) {
  return buildStructuredJsonPrompt({
    agentName: 'Reflection Agent',
    role:
      'Perform legal-quality review on the draft verdict and identify where reasoning quality, citations, or confidence calibration may be weak.',
    objective:
      'Return audit findings that can lower unjustified confidence and highlight missing legal support.',
    schemaExample: `{
  "issues_found": ["string"],
  "reasoning_flaws": ["string"],
  "improvement_suggestions": ["string"],
  "revised_confidence": number
}`,
    instructions: [
      'Be specific about missing legal grounding, unsupported leaps, or weak handling of contradictions.',
      'Do not invent issues if the reasoning is already sound.',
    ],
    contextSections: [
      { title: 'Judge reasoning', value: state.reasoning || state.judgeReasoning || '' },
      { title: 'Verdict output', value: state.verdict || {} },
      { title: 'Relevant laws', value: state.relevant_laws || [] },
      { title: 'Evidence summary', value: state.evidenceAnalysis || {} },
      { title: 'Past feedback memory', value: state.feedbackLearning || {} },
    ],
  })
}

export function buildDefensePrompt(state) {
  return buildStructuredJsonPrompt({
    agentName: 'Defense Agent',
    role:
      'Build the strongest legally grounded arguments that support the user using facts, evidence strength, and retrieved legal context.',
    objective:
      'Return the most persuasive user-side contentions without overstating certainty or inventing statutory citations.',
    schemaExample: `{
  "defense_arguments": ["string", "string", "string"]
}`,
    instructions: [
      'Focus on user-favorable interpretations of evidence and law.',
      'Prefer arguments that could realistically appear in a legal notice, complaint, or settlement posture.',
    ],
    contextSections: [
      { title: 'Structured case', value: state.structuredCase || {} },
      { title: 'Evidence', value: state.evidenceAnalysis || {} },
      { title: 'Research', value: state.legalResearch || {} },
      ...buildConditionalRetrievalSections(state),
      { title: 'Feedback memory', value: state.feedbackLearning || {} },
    ],
  })
}

export function buildProsecutionPrompt(state) {
  return buildStructuredJsonPrompt({
    agentName: 'Prosecution Agent',
    role:
      'Build the strongest opposing arguments against the user, emphasizing factual gaps, legal ambiguity, and procedural weaknesses.',
    objective:
      'Return realistic counter-arguments that a well-prepared opposing side could raise.',
    schemaExample: `{
  "prosecution_arguments": ["string", "string", "string"]
}`,
    instructions: [
      'Prioritize contradictions, missing proof, and alternate interpretations of obligations.',
      'Avoid exaggeration; stay grounded in the available record.',
    ],
    contextSections: [
      { title: 'Structured case', value: state.structuredCase || {} },
      { title: 'Evidence', value: state.evidenceAnalysis || {} },
      { title: 'Research', value: state.legalResearch || {} },
      ...buildConditionalRetrievalSections(state),
      { title: 'Feedback memory', value: state.feedbackLearning || {} },
    ],
  })
}

export function buildDebateRebuttalPrompt(state) {
  return buildStructuredJsonPrompt({
    agentName: 'Debate Rebuttal Agent',
    role:
      'Compare both sides, surface the most decisive rebuttal points, and estimate which side currently has the better footing.',
    objective:
      'Summarize the strongest cross-branch takeaways for downstream judicial reasoning.',
    schemaExample: `{
  "rebuttal_points": ["string", "string"],
  "debate_balance_score": number
}`,
    instructions: [
      'Use a balance score between 0 and 1 where higher means the user-side debate looks stronger.',
      'Call out where evidence quality or law retrieval changes the debate balance.',
    ],
    contextSections: [
      { title: 'Defense arguments', value: state.defense_arguments || [] },
      { title: 'Prosecution arguments', value: state.prosecution_arguments || [] },
      { title: 'Evidence summary', value: state.evidenceAnalysis || {} },
      { title: 'Relevant laws', value: state.relevant_laws || [] },
      ...buildConditionalRetrievalSections(state),
    ],
  })
}
