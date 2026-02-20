import { enforceRateLimit, getClientIp, getRedis } from './_redis.js'

const LIKES_KEY = 'stats:likes'

export default async function handler(req, res) {
  try {
    const redis = getRedis()
    const clientIp = getClientIp(req)

    if (req.method === 'GET') {
      const likes = (await redis.get(LIKES_KEY)) ?? 0
      return res.status(200).json({ likes: Number(likes) })
    }

    if (req.method === 'POST') {
      const rateLimit = await enforceRateLimit(redis, {
        scope: 'likes',
        identifier: clientIp,
        limit: 20,
        windowSeconds: 60,
      })

      if (!rateLimit.allowed) {
        return res.status(429).json({ error: 'Too many requests' })
      }

      const likes = await redis.incr(LIKES_KEY)
      return res.status(200).json({ likes: Number(likes) })
    }

    if (req.method === 'DELETE') {
      const rateLimit = await enforceRateLimit(redis, {
        scope: 'likes',
        identifier: clientIp,
        limit: 20,
        windowSeconds: 60,
      })

      if (!rateLimit.allowed) {
        return res.status(429).json({ error: 'Too many requests' })
      }

      const currentLikes = Number((await redis.get(LIKES_KEY)) ?? 0)
      if (currentLikes <= 0) {
        return res.status(200).json({ likes: 0 })
      }

      const likes = await redis.decr(LIKES_KEY)
      return res.status(200).json({ likes: Math.max(Number(likes), 0) })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
