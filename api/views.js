import { enforceRateLimit, getClientIp, getRedis } from './_redis.js'

const VIEWS_KEY = 'stats:views'
const VIEW_DEDUPE_TTL_SECONDS = 60 * 10

export default async function handler(req, res) {
  try {
    const redis = getRedis()
    const clientIp = getClientIp(req)

    if (req.method === 'GET') {
      const views = (await redis.get(VIEWS_KEY)) ?? 0
      return res.status(200).json({ views: Number(views) })
    }

    if (req.method === 'POST') {
      const rateLimit = await enforceRateLimit(redis, {
        scope: 'views',
        identifier: clientIp,
        limit: 30,
        windowSeconds: 60,
      })

      if (!rateLimit.allowed) {
        return res.status(429).json({ error: 'Too many requests' })
      }

      const viewId = String(req.headers['x-view-id'] ?? '').trim().slice(0, 120)

      if (viewId) {
        const dedupeKey = `dedupe:view:${clientIp}:${viewId}`
        const dedupeSet = await redis.set(dedupeKey, '1', {
          nx: true,
          ex: VIEW_DEDUPE_TTL_SECONDS,
        })

        if (!dedupeSet) {
          const existingViews = (await redis.get(VIEWS_KEY)) ?? 0
          return res.status(200).json({ views: Number(existingViews) })
        }
      }

      const views = await redis.incr(VIEWS_KEY)
      return res.status(200).json({ views: Number(views) })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
