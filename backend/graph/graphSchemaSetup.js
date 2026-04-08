import { GRAPH_SCHEMA_CONSTRAINTS, GRAPH_SCHEMA_INDEXES } from './legalGraphSchema.js'
import { logger } from '../utils/logger.js'

let schemaInitialized = false

export async function ensureLegalGraphSchema(session) {
  if (schemaInitialized) return

  for (const statement of [...GRAPH_SCHEMA_CONSTRAINTS, ...GRAPH_SCHEMA_INDEXES]) {
    try {
      await session.run(statement)
    } catch (error) {
      logger.warn('Neo4j schema statement failed.', {
        statement,
        message: error?.message || String(error),
      })
    }
  }

  schemaInitialized = true
}

export function resetLegalGraphSchemaCacheForTests() {
  schemaInitialized = false
}
