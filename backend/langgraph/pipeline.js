export const LEGAL_PIPELINE_STAGES = [
  {
    key: 'case-interpreter',
    name: 'Case Interpreter',
    summary: 'Converts free-form case facts into structured legal claims and entities.',
  },
  {
    key: 'evidence-analyzer',
    name: 'Evidence Analyzer',
    summary: 'Evaluates evidence quality, missing proofs, and factual contradictions.',
  },
  {
    key: 'legal-research',
    name: 'Legal Research Agent',
    summary: 'Retrieves laws, sections, and similar cases through vector and graph retrieval.',
  },
  {
    key: 'defense',
    name: 'Defense Agent',
    summary: 'Builds arguments favorable to the user based on evidence and legal support.',
  },
  {
    key: 'prosecution',
    name: 'Prosecution Agent',
    summary: 'Builds counter-arguments challenging the user position.',
  },
  {
    key: 'judge',
    name: 'Judge Reasoning Agent',
    summary: 'Balances both sides and estimates outcome probabilities.',
  },
  {
    key: 'verdict',
    name: 'Verdict Generator',
    summary: 'Produces verdict probabilities, risk score, and suggested actions.',
  },
  {
    key: 'reflection',
    name: 'Reflection Agent',
    summary: 'Audits the verdict for missing laws, weak reasoning, and confidence revision.',
  },
]
