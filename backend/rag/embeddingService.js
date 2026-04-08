import { createVertexEmbedding } from '../services/vertexEmbedding.js'

export async function embedCaseText(text, options = {}) {
  const modality = options.modality || 'text'
  return createVertexEmbedding(text, { modality })
}
