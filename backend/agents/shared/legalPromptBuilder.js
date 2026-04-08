function formatSection(title, value) {
  const normalizedValue =
    typeof value === 'string' ? value.trim() : JSON.stringify(value ?? {}, null, 2)

  return `${title}:\n${normalizedValue || 'Not available.'}`
}

export function buildStructuredJsonPrompt({
  agentName,
  role,
  objective,
  schemaExample,
  instructions = [],
  contextSections = [],
}) {
  const rules = [
    'Return valid JSON only.',
    'Do not wrap the JSON in markdown fences.',
    'Do not invent laws, sections, evidence, or facts that are not supported by context.',
    ...instructions,
  ]

  const renderedSections = contextSections
    .filter((section) => section && section.title)
    .map((section) => formatSection(section.title, section.value))
    .join('\n\n')

  return `
You are ${agentName}.

ROLE:
${role}

OBJECTIVE:
${objective}

OUTPUT SCHEMA:
${schemaExample}

RULES:
${rules.map((rule) => `- ${rule}`).join('\n')}

CONTEXT:
${renderedSections || 'No additional context provided.'}
`.trim()
}
