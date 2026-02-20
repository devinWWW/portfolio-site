import { Redis } from '@upstash/redis'

let redisClient

export function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Missing Upstash Redis environment variables')
  }

  if (!redisClient) {
    redisClient = Redis.fromEnv()
  }

  return redisClient
}

export function parseJsonBody(req) {
  if (!req.body) {
    return {}
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }

  return req.body
}

export function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for']

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return String(forwardedFor[0]).split(',')[0].trim()
  }

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim()
  }

  return 'unknown'
}

export async function enforceRateLimit(redis, { scope, identifier, limit, windowSeconds }) {
  const currentWindow = Math.floor(Date.now() / (windowSeconds * 1000))
  const rateLimitKey = `ratelimit:${scope}:${identifier}:${currentWindow}`

  const count = await redis.incr(rateLimitKey)
  if (count === 1) {
    await redis.expire(rateLimitKey, windowSeconds)
  }

  return {
    allowed: count <= limit,
    count,
    limit,
  }
}
