import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

type LeaderboardEntry = {
  rank: number
  name: string
  score: number
}

type Obstacle = {
  id: number
  kind: 'ground' | 'flying'
  x: number
  y: number
  width: number
  height: number
}

const GAME_WIDTH = 620
const GAME_HEIGHT = 220
const GROUND_Y = 180
const PLAYER_X = 54
const PLAYER_WIDTH = 34
const PLAYER_HEIGHT = 34
const PLAYER_CROUCH_WIDTH = 34
const PLAYER_CROUCH_HEIGHT = 24
const GRAVITY = 0.58
const JUMP_VELOCITY = 10.6
const SPEED_DROP_ACCEL = 0.95
const MAX_FALL_VELOCITY = -16
const FIXED_TIMESTEP_MS = 1000 / 60
const BASE_SPEED = 5
const MAX_SPEED = 8.1
const SCORE_RATE_PER_SECOND = 14
const FLYING_CLEARANCES = [18, 34, 50]
const ROTATION_FRAMES_PER_JUMP = 40
const ROTATION_EASE_POWER = 1.65

function getObstacleHitbox(obstacle: Obstacle) {
  if (obstacle.kind === 'flying') {
    const insetX = obstacle.width * 0.28
    const insetY = obstacle.height * 0.2

    return {
      x: obstacle.x + insetX,
      y: obstacle.y + insetY,
      width: obstacle.width - insetX * 1.45,
      height: obstacle.height - insetY * 2,
    }
  }

  const sideInset = obstacle.width * 0.22
  const topInset = obstacle.height * 0.18

  return {
    x: obstacle.x + sideInset,
    y: obstacle.y + topInset,
    width: obstacle.width - sideInset * 2,
    height: obstacle.height - topInset,
  }
}

function isColliding(player: { x: number; y: number; width: number; height: number }, obstacle: Obstacle) {
  const hitbox = getObstacleHitbox(obstacle)

  return (
    player.x < hitbox.x + hitbox.width &&
    player.x + player.width > hitbox.x &&
    player.y < hitbox.y + hitbox.height &&
    player.y + player.height > hitbox.y
  )
}

export default function FunPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [status, setStatus] = useState('')
  const [score, setScore] = useState(0)
  const [bestLocalScore, setBestLocalScore] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [hasSubmittedCurrentScore, setHasSubmittedCurrentScore] = useState(false)
  const [playerLift, setPlayerLift] = useState(0)
  const [playerRotation, setPlayerRotation] = useState(0)
  const [isCrouching, setIsCrouching] = useState(false)
  const [obstacles, setObstacles] = useState<Obstacle[]>([])

  const rafRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef(0)
  const accumulatorRef = useRef(0)
  const velocityRef = useRef(0)
  const liftRef = useRef(0)
  const scoreRef = useRef(0)
  const obstaclesRef = useRef<Obstacle[]>([])
  const spawnTimerRef = useRef(900)
  const obstacleIdRef = useRef(0)
  const crouchRef = useRef(false)
  const jumpHeldRef = useRef(false)
  const playerRotationRef = useRef(0)
  const rotationTargetRef = useRef(0)
  const rotationStartRef = useRef(0)
  const rotationFrameProgressRef = useRef(0)

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard')
      if (!response.ok) {
        throw new Error('Failed to load leaderboard')
      }

      const data = await response.json()
      setEntries(Array.isArray(data.entries) ? data.entries : [])
    } catch {
      setStatus('Leaderboard unavailable locally. It will work once deployed with Upstash env vars.')
    }
  }

  const startGame = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    velocityRef.current = 0
    liftRef.current = 0
    scoreRef.current = 0
    spawnTimerRef.current = 800
    obstaclesRef.current = []
    crouchRef.current = false
    jumpHeldRef.current = false
    playerRotationRef.current = 0
    rotationTargetRef.current = 0
    rotationStartRef.current = 0
    rotationFrameProgressRef.current = 0
    setIsCrouching(false)
    setPlayerRotation(0)
    setObstacles([])
    setScore(0)
    setPlayerLift(0)
    setIsGameOver(false)
    setIsRunning(true)
    setHasSubmittedCurrentScore(false)
    setStatus('')
    lastFrameTimeRef.current = 0
    accumulatorRef.current = 0
  }

  const applyJumpImpulse = () => {
    velocityRef.current = JUMP_VELOCITY
    rotationStartRef.current = playerRotationRef.current
    rotationTargetRef.current += 90
    rotationFrameProgressRef.current = 0
  }

  const submitScore = async () => {
    if (hasSubmittedCurrentScore || score <= 0) {
      return
    }

    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit score')
      }

      const data = await response.json()
      setEntries(Array.isArray(data.entries) ? data.entries : [])
      setHasSubmittedCurrentScore(true)
      setStatus('Score submitted!')
    } catch {
      setStatus('Could not submit score right now.')
    }
  }

  const triggerJump = () => {
    if (!isRunning) {
      startGame()
      applyJumpImpulse()
      return
    }

    if (liftRef.current === 0) {
      applyJumpImpulse()
    }
  }

  useEffect(() => {
    void loadLeaderboard()
  }, [])

  useEffect(() => {
    const controlKeys = new Set(['ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyS'])

    const onKeyDown = (event: KeyboardEvent) => {
      const wantsJump = event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW'
      const wantsCrouch = event.code === 'ArrowDown' || event.code === 'KeyS'

      if (controlKeys.has(event.code)) {
        event.preventDefault()
        event.stopPropagation()

        const activeElement = document.activeElement
        if (activeElement instanceof HTMLButtonElement) {
          activeElement.blur()
        }
      }

      if (wantsJump && !event.repeat) {
        jumpHeldRef.current = true
        triggerJump()
      }

      if (wantsCrouch && !event.repeat && !isRunning) {
        startGame()
      }

      if (wantsCrouch && isRunning) {
        crouchRef.current = true
        setIsCrouching(true)
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      const wantsJump = event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW'
      const wantsCrouch = event.code === 'ArrowDown' || event.code === 'KeyS'

      if (wantsJump) {
        jumpHeldRef.current = false
      }

      if (wantsCrouch && isRunning) {
        crouchRef.current = false
        setIsCrouching(false)
      }
    }

    window.addEventListener('keydown', onKeyDown, { passive: false })
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [isRunning])

  useEffect(() => {
    if (!isRunning) {
      return
    }

    const frame = (timestamp: number) => {
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp
      }

      const deltaMs = Math.min(timestamp - lastFrameTimeRef.current, 100)
      lastFrameTimeRef.current = timestamp
      accumulatorRef.current += deltaMs

      let gameOver = false

      while (accumulatorRef.current >= FIXED_TIMESTEP_MS) {
        velocityRef.current -= GRAVITY

        if (crouchRef.current && liftRef.current > 0) {
          velocityRef.current -= SPEED_DROP_ACCEL
        }

        velocityRef.current = Math.max(velocityRef.current, MAX_FALL_VELOCITY)
        liftRef.current = Math.max(0, liftRef.current + velocityRef.current)

        if (liftRef.current === 0 && velocityRef.current < 0) {
          velocityRef.current = 0
        }

        if (liftRef.current === 0 && jumpHeldRef.current) {
          applyJumpImpulse()
          liftRef.current = Math.max(0, liftRef.current + velocityRef.current)
        }

        if (liftRef.current > 0) {
          rotationFrameProgressRef.current += 1
          const progress = Math.min(rotationFrameProgressRef.current / ROTATION_FRAMES_PER_JUMP, 1)
          const easedProgress = 1 - (1 - progress) ** ROTATION_EASE_POWER
          const span = rotationTargetRef.current - rotationStartRef.current
          playerRotationRef.current = rotationStartRef.current + span * easedProgress
        } else {
          playerRotationRef.current = rotationTargetRef.current
        }

        const speed = Math.min(BASE_SPEED + scoreRef.current / 220, MAX_SPEED)
        spawnTimerRef.current -= FIXED_TIMESTEP_MS

        if (spawnTimerRef.current <= 0) {
          const groundObstacle = Math.random() > 0.35
          const width = groundObstacle ? 20 + Math.random() * 16 : 34
          const height = groundObstacle ? 26 + Math.random() * 26 : 22
          const clearance = FLYING_CLEARANCES[Math.floor(Math.random() * FLYING_CLEARANCES.length)]
          const y = groundObstacle ? GROUND_Y - height : GROUND_Y - height - clearance

          obstaclesRef.current = [
            ...obstaclesRef.current,
            {
              id: obstacleIdRef.current++,
              kind: groundObstacle ? 'ground' : 'flying',
              x: GAME_WIDTH + 10,
              y,
              width,
              height,
            },
          ]

          spawnTimerRef.current = 780 + Math.random() * 620 - Math.min(scoreRef.current * 2, 260)
        }

        obstaclesRef.current = obstaclesRef.current
          .map((obstacle) => ({ ...obstacle, x: obstacle.x - speed }))
          .filter((obstacle) => obstacle.x + obstacle.width > -20)

        const crouching = crouchRef.current
        const playerWidth = crouching ? PLAYER_CROUCH_WIDTH : PLAYER_WIDTH
        const playerHeight = crouching ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT
        const playerTop = GROUND_Y - playerHeight - liftRef.current

        const hitObstacle = obstaclesRef.current.some((obstacle) =>
          isColliding(
            {
              x: PLAYER_X,
              y: playerTop,
              width: playerWidth,
              height: playerHeight,
            },
            obstacle,
          ),
        )

        if (hitObstacle) {
          gameOver = true
          break
        }

        scoreRef.current += SCORE_RATE_PER_SECOND / 60
        accumulatorRef.current -= FIXED_TIMESTEP_MS
      }

      const crouching = crouchRef.current
      if (gameOver) {
        setIsRunning(false)
        setIsGameOver(true)
        crouchRef.current = false
        setIsCrouching(false)

        const finalScore = Math.floor(scoreRef.current)
        const best = Math.max(bestLocalScore, finalScore)
        setBestLocalScore(best)
        localStorage.setItem('dinoBestScore', String(best))
      } else {
        setScore(Math.floor(scoreRef.current))
        setPlayerLift(liftRef.current)
        setPlayerRotation(playerRotationRef.current)
        setIsCrouching(crouching)
        setObstacles([...obstaclesRef.current])
        rafRef.current = requestAnimationFrame(frame)
      }
    }

    rafRef.current = requestAnimationFrame(frame)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [bestLocalScore, isRunning])

  useEffect(() => {
    const storedBest = Number(localStorage.getItem('dinoBestScore') ?? '0')
    if (Number.isFinite(storedBest)) {
      setBestLocalScore(storedBest)
    }
  }, [])

  return (
    <section className="min-h-[52vh] space-y-6">
      <div className="flex items-center gap-3">
        <Link
          aria-label="Back to fun"
          className="inline-flex items-center text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          to="/fun"
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </Link>
        <h2 className="m-0 text-[1.7rem] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-[1.9rem]">
          Geometry Trash
        </h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-300">
          <span>Score: {score}</span>
          <span>Best: {bestLocalScore}</span>
        </div>

        <div
          className="relative w-full overflow-hidden touch-none"
          onPointerDown={(event) => {
            event.preventDefault()
            jumpHeldRef.current = true
            event.currentTarget.setPointerCapture(event.pointerId)
            triggerJump()
          }}
          onPointerUp={() => {
            jumpHeldRef.current = false
          }}
          onPointerCancel={() => {
            jumpHeldRef.current = false
          }}
          onPointerLeave={() => {
            jumpHeldRef.current = false
          }}
        >
          <div className="relative" style={{ height: `${GAME_HEIGHT}px` }}>
            <div className="absolute inset-x-0" style={{ top: `${GROUND_Y}px`, height: '2px' }}>
              <div className="h-full w-full bg-zinc-300 dark:bg-zinc-600" />
            </div>

            <div
              className="absolute origin-center bg-zinc-900 transition-none dark:bg-zinc-100"
              style={{
                left: `${PLAYER_X}px`,
                width: `${isCrouching ? PLAYER_CROUCH_WIDTH : PLAYER_WIDTH}px`,
                height: `${isCrouching ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT}px`,
                top: `${GROUND_Y - (isCrouching ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT) - playerLift}px`,
                transform: `rotate(${isCrouching ? 0 : playerRotation}deg)`,
              }}
            />

            {obstacles.map((obstacle) => (
              <div
                className="absolute opacity-75"
                key={obstacle.id}
                style={{
                  left: `${obstacle.x}px`,
                  top: `${obstacle.y}px`,
                  width: `${obstacle.width}px`,
                  height: `${obstacle.height}px`,
                }}
              >
                {obstacle.kind === 'ground' ? (
                  <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <polygon className="fill-zinc-700 dark:fill-zinc-300" points="0,100 50,0 100,100" />
                  </svg>
                ) : (
                  <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <polygon
                      className="fill-zinc-700 dark:fill-zinc-300"
                      points="100,35 35,35 35,15 0,50 35,85 35,65 100,65"
                    />
                  </svg>
                )}
              </div>
            ))}

            {!isRunning ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="space-y-2 text-center">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {isGameOver ? 'Game over' : 'Tap/click or press jump/crouch to start'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100"
            disabled={!isGameOver || score <= 0 || hasSubmittedCurrentScore}
            onClick={() => void submitScore()}
            type="button"
          >
            {hasSubmittedCurrentScore ? 'Score submitted' : 'Submit score'}
          </button>
        </div>

        {status ? (
          <p className="m-0 text-sm text-zinc-500 dark:text-zinc-400">{status}</p>
        ) : null}
      </div>

      <div className="space-y-2 pt-2">
        <h3 className="m-0 text-[1.08rem] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Leaderboard</h3>
        {entries.length === 0 ? (
          <p className="m-0 text-[0.98rem] leading-7 text-zinc-700 dark:text-zinc-300">
            No scores yet — be the first.
          </p>
        ) : (
          entries.map((entry) => (
            <div
              className="flex items-center justify-between text-[0.98rem] text-zinc-700 dark:text-zinc-300"
              key={`${entry.name}-${entry.rank}`}
            >
              <span>
                {entry.rank}. {entry.name}
              </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{entry.score}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
