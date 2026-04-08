function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function splitParagraphs(text) {
  return normalizeWhitespace(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

export function chunkText(text, options = {}) {
  const chunkSize = Number(options.chunkSize || 1200)
  const chunkOverlap = Number(options.chunkOverlap || 180)
  const paragraphs = splitParagraphs(text)

  if (!paragraphs.length) return []

  const chunks = []
  let current = ''

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph

    if (candidate.length <= chunkSize) {
      current = candidate
      continue
    }

    if (current) {
      chunks.push(current)
    }

    if (paragraph.length <= chunkSize) {
      current = paragraph
      continue
    }

    let start = 0
    while (start < paragraph.length) {
      const end = Math.min(start + chunkSize, paragraph.length)
      const slice = paragraph.slice(start, end).trim()
      if (slice) chunks.push(slice)
      if (end >= paragraph.length) break
      start = Math.max(end - chunkOverlap, start + 1)
    }

    current = ''
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}

export function buildChunkRecords({
  sourceId,
  title,
  text,
  metadata = {},
  chunkOptions = {},
}) {
  const chunks = chunkText(text, chunkOptions)
  return chunks.map((chunk, index) => ({
    id: `${sourceId}-chunk-${index + 1}`,
    text: chunk,
    title,
    chunk_index: index,
    metadata: {
      ...metadata,
      title,
      text: chunk,
      chunk_index: index,
      source_id: sourceId,
    },
  }))
}
