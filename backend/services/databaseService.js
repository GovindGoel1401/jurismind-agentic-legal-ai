import mongoose from 'mongoose'
import { env } from '../config/envConfig.js'
import { logger } from '../utils/logger.js'

let connectionPromise = null

export async function connectDatabase() {
  if (!env.CASE_PERSISTENCE_ENABLED) {
    logger.info('Case persistence is disabled. Running without MongoDB.')
    return {
      connected: false,
      reason: 'case_persistence_disabled',
    }
  }

  if (!env.MONGO_URI) {
    logger.warn('MONGO_URI is not set. Running without MongoDB persistence.')
    return {
      connected: false,
      reason: 'missing_mongo_uri',
    }
  }

  if (mongoose.connection.readyState === 1) {
    return {
      connected: true,
      reason: 'already_connected',
    }
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
      })
      .then(() => {
        logger.info('MongoDB connected for JurisMind persistence.')
        return mongoose.connection
      })
      .catch((error) => {
        connectionPromise = null
        logger.error('Failed to connect MongoDB. Falling back to in-memory persistence.', {
          message: error?.message || String(error),
        })
        return null
      })
  }

  const connection = await connectionPromise
  return {
    connected: Boolean(connection && mongoose.connection.readyState === 1),
    reason: connection ? 'connected' : 'connection_failed',
  }
}

export async function closeDatabaseConnection() {
  if (mongoose.connection.readyState === 0) return

  try {
    await mongoose.connection.close()
    connectionPromise = null
    logger.info('MongoDB connection closed.')
  } catch (error) {
    logger.warn('Failed to close MongoDB connection cleanly.', {
      message: error?.message || String(error),
    })
  }
}
