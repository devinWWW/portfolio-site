import { enforceRateLimit, getClientIp, getRedis, parseJsonBody } from './_redis.js'

const LEADERBOARD_KEY = 'game:memecoin:leaderboard'
const MAX_ENTRIES = 10
const MIN_SUBMIT_SCORE = 1000

function hashIdentifier(value) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash).toString(16)
}

function buildPlayerMember(clientIp) {
  const hash = hashIdentifier(clientIp || 'unknown')
  return `player:${hash}`
}

function buildPlayerName(member) {
  const hash = String(member).replace('player:', '')
  return `Player-${hash.slice(0, 6).toUpperCase()}`
}

function normalizeBalance(balance) {
  const parsed = Number(balance)
  if (!Number.isFinite(parsed)) {
    return null
  }

  const clamped = Math.min(Math.max(0, parsed), 1000000000)
  return Math.round(clamped * 100) / 100
}

function mapLeaderboardRows(rows) {
  if (!Array.isArray(rows)) {
    return []
  }

  if (rows.length > 0 && typeof rows[0] === 'object' && rows[0] !== null && 'member' in rows[0]) {
    return rows.map((entry, index) => ({
      rank: index + 1,
      name: buildPlayerName(String(entry.member)),
      score: Number(entry.score),
    }))
  }

  const mapped = []
  for (let index = 0; index < rows.length; index += 2) {
    const name = rows[index]
    const score = rows[index + 1]
    if (name === undefined || score === undefined) {
      continue
    }

    mapped.push({
      rank: mapped.length + 1,
      name: buildPlayerName(String(name)),
      score: Number(score),
    })
  }

  return mapped
}

async function readLeaderboard(redis) {
  const rows = await redis.zrange(LEADERBOARD_KEY, 0, MAX_ENTRIES - 1, {
    rev: true,
    withScores: true,
  })

  return mapLeaderboardRows(rows)
}

export default async function handler(req, res) {
  try {
    const redis = getRedis()
    const clientIp = getClientIp(req)

    if (req.method === 'GET') {
      const entries = await readLeaderboard(redis)
      return res.status(200).json({ entries })
    }

    if (req.method === 'POST') {
      const rateLimit = await enforceRateLimit(redis, {
        scope: 'memecoin-leaderboard-submit',
        identifier: clientIp,
        limit: 6,
        windowSeconds: 60,
      })

      if (!rateLimit.allowed) {
        return res.status(429).json({ error: 'Too many requests' })
      }

      const body = parseJsonBody(req)
      const score = normalizeBalance(body.score)
      const member = buildPlayerMember(clientIp)

      if (score === null) {
        return res.status(400).json({ error: 'Invalid score' })
      }

      if (score <= MIN_SUBMIT_SCORE) {
        return res.status(400).json({ error: 'Score must be above 1000' })
      }

      const existingScore = await redis.zscore(LEADERBOARD_KEY, member)
      if (existingScore === null || score > Number(existingScore)) {
        await redis.zadd(LEADERBOARD_KEY, { score, member })
      }

      const entries = await readLeaderboard(redis)
      return res.status(200).json({ entries })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
