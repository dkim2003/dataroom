// Dead-simple per-user sliding-window rate limiter.
// In-memory only — resets on server restart, doesn't survive across serverless
// invocations that don't share state. Good enough as a cost-ceiling for the
// Claude API endpoints (Sol, sort, sort-link); not a DoS defense.

const buckets = new Map() // key -> number[] of recent timestamps (ms)
let lastEviction = Date.now()
const EVICTION_INTERVAL = 60_000 // sweep stale entries every 60s

// Allow `limit` requests per `windowMs`. Returns true if allowed, false if throttled.
export function checkRateLimit(key, limit, windowMs) {
  const now = Date.now()

  // Periodically evict stale entries to prevent unbounded memory growth
  if (now - lastEviction > EVICTION_INTERVAL) {
    lastEviction = now
    for (const [k, timestamps] of buckets) {
      const fresh = timestamps.filter(t => now - t < windowMs)
      if (fresh.length === 0) buckets.delete(k)
      else buckets.set(k, fresh)
    }
  }

  const arr = buckets.get(key) || []
  const fresh = arr.filter(t => now - t < windowMs)
  if (fresh.length >= limit) {
    buckets.set(key, fresh)
    return false
  }
  fresh.push(now)
  buckets.set(key, fresh)
  return true
}
