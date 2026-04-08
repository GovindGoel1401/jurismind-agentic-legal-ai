import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './config/envConfig.js'
import { logger } from './utils/logger.js'
import { errorHandler } from './utils/errorHandler.js'
import { attachRequestContext } from './utils/requestContext.js'
import analyzeCaseRouter from './routes/analyzeCase.js'
import documentIntelligenceRouter from './routes/documentIntelligence.js'
import similarCasesRouter from './routes/similarCases.js'
import feedbackRouter from './routes/feedback.js'
import debateSimulationRouter from './routes/debateSimulation.js'
import casesRouter from './routes/cases.js'
import knowledgeGraphRouter from './routes/knowledgeGraph.js'
import { closeDatabaseConnection, connectDatabase } from './services/databaseService.js'
import { closeNeo4jDriver } from './graph/neo4jClient.js'

const __filename = fileURLToPath(import.meta.url)

function getCorsOptions() {
  const allowedOrigins = String(env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (!allowedOrigins.length) {
    return {}
  }

  return {
    origin(origin, callback) {
      if (!origin || matchesAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true)
        return
      }

      callback(null, false)
    },
  }
}

function matchesAllowedOrigin(origin, allowedOrigins = []) {
  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === origin) return true

    if (!allowedOrigin.includes('*')) return false

    try {
      const requestUrl = new URL(origin)
      const allowedUrl = new URL(allowedOrigin.replace('*.', 'placeholder.'))
      const allowedSuffix = allowedUrl.hostname.replace(/^placeholder\./, '')

      return (
        requestUrl.protocol === allowedUrl.protocol &&
        requestUrl.hostname.endsWith(`.${allowedSuffix}`)
      )
    } catch {
      return false
    }
  })
}

const app = express()

app.set('trust proxy', true)
app.use(cors(getCorsOptions()))
app.use(express.json({ limit: '4mb' }))
app.use(attachRequestContext)

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'jurismind-ai-backend',
    environment: env.NODE_ENV,
    uptime_seconds: Number(process.uptime().toFixed(1)),
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/analyze-case', analyzeCaseRouter)
app.use('/api/document-intelligence', documentIntelligenceRouter)
app.use('/api/cases', casesRouter)
app.use('/api/similar-cases', similarCasesRouter)
app.use('/api/debate-simulation', debateSimulationRouter)
app.use('/api/feedback', feedbackRouter)
app.use('/api/knowledge-graph', knowledgeGraphRouter)

app.use(errorHandler)

let activeServer = null

async function shutdown(signal = 'SIGTERM') {
  logger.info('Shutting down backend service.', { signal })

  if (activeServer) {
    await new Promise((resolve) => {
      activeServer.close(() => resolve())
    })
    activeServer = null
  }

  await Promise.allSettled([closeDatabaseConnection(), closeNeo4jDriver()])
}

export async function startServer() {
  try {
    const databaseStatus = await connectDatabase()
    activeServer = app.listen(env.PORT, env.HOST, () => {
      logger.info('JurisMind backend listening.', {
        host: env.HOST,
        port: env.PORT,
        environment: env.NODE_ENV,
        database: databaseStatus,
        cors_restricted: Boolean(String(env.CORS_ALLOWED_ORIGINS || '').trim()),
      })
    })
    return activeServer
  } catch (error) {
    logger.error('Failed to start server', error)
    process.exit(1)
  }
}

process.on('SIGINT', () => {
  shutdown('SIGINT').finally(() => process.exit(0))
})

process.on('SIGTERM', () => {
  shutdown('SIGTERM').finally(() => process.exit(0))
})

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer()
}

export { app, shutdown }
