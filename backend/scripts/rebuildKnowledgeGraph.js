import { connectDatabase, closeDatabaseConnection } from '../services/databaseService.js'
import { closeNeo4jDriver } from '../graph/neo4jClient.js'
import { rebuildKnowledgeGraphs } from '../services/knowledgeGraphBuildService.js'

function parseArgs(argv = []) {
  const parsed = {
    caseId: '',
    limit: 25,
    stopOnError: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--case-id') {
      parsed.caseId = String(argv[index + 1] || '').trim()
      index += 1
      continue
    }
    if (token === '--limit') {
      const value = Number(argv[index + 1] || 25)
      parsed.limit = Number.isFinite(value) ? Math.min(200, Math.max(1, Math.floor(value))) : 25
      index += 1
      continue
    }
    if (token === '--stop-on-error') {
      parsed.stopOnError = true
    }
  }

  return parsed
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  await connectDatabase()

  const report = await rebuildKnowledgeGraphs({
    caseId: args.caseId,
    limit: args.limit,
    stopOnError: args.stopOnError,
  })

  console.log(JSON.stringify(report, null, 2))

  await Promise.allSettled([closeDatabaseConnection(), closeNeo4jDriver()])

  if (!report.enabled || report.failures > 0) {
    process.exitCode = 1
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
