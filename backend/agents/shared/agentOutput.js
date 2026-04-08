export function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function clamp01(value, fallback = 0.5) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(1, n))
}

export function clampRange(value, minimum, maximum, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(minimum, Math.min(maximum, n))
}

export function ensureStringArray(value, fallback = []) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : fallback
}
