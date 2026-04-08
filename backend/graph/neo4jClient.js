import neo4j from 'neo4j-driver'
import { env } from '../config/envConfig.js'
import { logger } from '../utils/logger.js'

let driver = null

export function getNeo4jDriver() {
  if (driver) return driver

  if (!env.KNOWLEDGE_GRAPH_ENABLED) {
    return null
  }

  if (!env.NEO4J_URI || !env.NEO4J_USER || !env.NEO4J_PASSWORD) {
    logger.warn('Neo4j credentials missing. GraphRAG queries are unavailable.')
    return null
  }

  driver = neo4j.driver(
    env.NEO4J_URI,
    neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD),
  )
  return driver
}

export async function closeNeo4jDriver() {
  if (driver) await driver.close()
}
