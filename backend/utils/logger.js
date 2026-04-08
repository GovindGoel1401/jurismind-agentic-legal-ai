function timestamp() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

function serializeData(data) {
  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack,
    }
  }

  if (data === undefined) return undefined

  try {
    return JSON.parse(JSON.stringify(data))
  } catch {
    return String(data)
  }
}

function log(level, message, data) {
  const payload = {
    timestamp: timestamp(),
    level,
    message,
    ...(data !== undefined ? { data: serializeData(data) } : {}),
  }

  const serialized = JSON.stringify(payload)
  if (level === 'ERROR') console.error(serialized)
  else if (level === 'WARN') console.warn(serialized)
  else console.log(serialized)
}

export function logInfo(message, data) {
  log('INFO', message, data)
}

export function logWarn(message, data) {
  log('WARN', message, data)
}

export function logError(message, data) {
  log('ERROR', message, data)
}

// Backward-compatible logger interface.
export const logger = {
  info: logInfo,
  warn: logWarn,
  error: logError,
}
