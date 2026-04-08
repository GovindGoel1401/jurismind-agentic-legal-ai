import { getNeo4jDriver, closeNeo4jDriver } from '../graph/neo4jClient.js'
import { ensureLegalGraphSchema } from '../graph/graphSchemaSetup.js'
import { logger } from '../utils/logger.js'

async function run() {
  const driver = getNeo4jDriver()
  if (!driver) {
    console.log('Neo4j unavailable. Ensure KNOWLEDGE_GRAPH_ENABLED and Neo4j credentials are configured.')
    return
  }

  const session = driver.session()
  try {
    await ensureLegalGraphSchema(session)
    console.log('Legal graph schema initialization completed.')
  } catch (error) {
    logger.error('Legal graph schema initialization failed.', {
      message: error?.message || String(error),
    })
    process.exitCode = 1
  } finally {
    await session.close()
    await closeNeo4jDriver()
  }
}

run()
