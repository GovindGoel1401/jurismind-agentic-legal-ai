import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function testCaseGraphQueriesUsesValidSupportCount() {
  const filePath = path.resolve(__dirname, '../graph/caseGraphQueries.js')
  const source = await readFile(filePath, 'utf8')

  assert.equal(
    source.includes('count(DISTINCT *) AS support_count'),
    false,
    'caseGraphQueries.js should not use count(DISTINCT *) in Cypher.',
  )
  assert.equal(
    source.includes('count(DISTINCT e) AS support_count'),
    true,
    'caseGraphQueries.js should count distinct evidence nodes for support_count.',
  )
}

async function testCaseGraphRepositoryAvoidsSizePatternSyntax() {
  const filePath = path.resolve(__dirname, '../graph/caseGraphRepository.js')
  const source = await readFile(filePath, 'utf8')

  assert.equal(
    source.includes('size((n)--()) = 0'),
    false,
    'caseGraphRepository.js should avoid Neo4j 5-incompatible size((n)--()) pattern checks.',
  )
  assert.equal(
    source.includes('COUNT { (n)--() } AS degree'),
    true,
    'caseGraphRepository.js should use COUNT { (n)--() } for degree checks.',
  )
}

async function run() {
  await testCaseGraphQueriesUsesValidSupportCount()
  await testCaseGraphRepositoryAvoidsSizePatternSyntax()
  console.log('graphCypherCompatibility tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
