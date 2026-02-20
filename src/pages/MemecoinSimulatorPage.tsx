import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

type Position = {
  side: 'long' | 'short'
  entryMarketCap: number
  collateral: number
}

type Candle = {
  open: number
  high: number
  low: number
  close: number
}

type LeaderboardEntry = {
  rank: number
  name: string
  score: number
}

const STARTING_BALANCE = 1000
const STARTING_MARKET_CAP = 1_000_000
const SIMULATION_INTERVAL_MS = 1000
const SIMULATION_POLL_MS = 120
const VISIBLE_CANDLES = 56
const MAX_CANDLE_HISTORY = 320
const LEVERAGE = 5

function generatePretendHistory(count: number, seed: number) {
  let current = seed
  let trendBias = 0
  let trendTicks = 0
  const history: Candle[] = []

  for (let i = 0; i < count; i += 1) {
    if (trendTicks <= 0) {
      trendBias = (Math.random() - 0.5) * 0.02
      trendTicks = 3 + Math.floor(Math.random() * 8)
    }
    trendTicks -= 1

    const open = current
    let high = open
    let low = open

    for (let tick = 0; tick < 1; tick += 1) {
      const noise = (Math.random() - 0.5) * 0.036
      const meanReversion = ((seed - current) / seed) * 0.004
      const shock = Math.random() < 0.09 ? (Math.random() - 0.5) * 0.18 : 0
      current = Math.max(25_000, current * (1 + trendBias + noise + meanReversion + shock))
      high = Math.max(high, current)
      low = Math.min(low, current)
    }

    history.push({
      open,
      high,
      low,
      close: current,
    })
  }

  return history
}

const INITIAL_CANDLES = generatePretendHistory(MAX_CANDLE_HISTORY, STARTING_MARKET_CAP)
const INITIAL_MARKET_CAP = INITIAL_CANDLES[INITIAL_CANDLES.length - 1]?.close ?? STARTING_MARKET_CAP

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function formatMarketCap(value: number) {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  return `$${Math.round(value).toLocaleString()}`
}

function getPnlMultiple(position: Position | null, currentMarketCap: number) {
  if (!position) {
    return 0
  }

  if (position.side === 'long') {
    return (currentMarketCap / position.entryMarketCap - 1) * LEVERAGE
  }

  return (position.entryMarketCap / currentMarketCap - 1) * LEVERAGE
}

function formatPnlPercent(pnlMultiple: number) {
  const capped = Math.max(pnlMultiple, -1)
  const percent = capped * 100
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
}

export default function MemecoinSimulatorPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [balance, setBalance] = useState(STARTING_BALANCE)
  const [marketCap, setMarketCap] = useState(INITIAL_MARKET_CAP)
  const [candles, setCandles] = useState<Candle[]>(() => INITIAL_CANDLES)
  const [chartOffset, setChartOffset] = useState(0)
  const [chartVerticalOffset, setChartVerticalOffset] = useState(0)
  const [position, setPosition] = useState<Position | null>(null)
  const [tradeAmount, setTradeAmount] = useState(250)
  const [status, setStatus] = useState('')
  const [leaderboardStatus, setLeaderboardStatus] = useState('')
  const trendBiasRef = useRef(0)
  const trendTicksRemainingRef = useRef(0)
  const trendDirectionStreakRef = useRef(0)
  const lastTrendDirectionRef = useRef<-1 | 0 | 1>(0)
  const anchorMarketCapRef = useRef(INITIAL_MARKET_CAP)
  const lastSimulationTickRef = useRef(0)
  const dragStartXRef = useRef(0)
  const dragStartYRef = useRef(0)
  const dragStartOffsetRef = useRef(0)
  const dragStartVerticalOffsetRef = useRef(0)

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/memecoin-leaderboard')
      if (!response.ok) {
        throw new Error('Failed to load leaderboard')
      }

      const data = await response.json()
      setEntries(Array.isArray(data.entries) ? data.entries : [])
    } catch {
      setLeaderboardStatus('Leaderboard unavailable locally. It will work once deployed with Upstash env vars.')
    }
  }

  const pickTrendBias = () => {
    const trendModes = [-0.014, -0.01, -0.006, 0, 0.006, 0.01, 0.014]
    let candidates = trendModes

    if (trendDirectionStreakRef.current >= 2 && lastTrendDirectionRef.current !== 0) {
      candidates = trendModes.filter((mode) => Math.sign(mode) !== lastTrendDirectionRef.current)
    } else if (lastTrendDirectionRef.current !== 0 && Math.random() < 0.45) {
      candidates = trendModes.filter((mode) => Math.sign(mode) !== lastTrendDirectionRef.current || mode === 0)
    }

    const nextBias = candidates[Math.floor(Math.random() * candidates.length)]
    const nextDirection = Math.sign(nextBias) as -1 | 0 | 1

    if (nextDirection !== 0 && nextDirection === lastTrendDirectionRef.current) {
      trendDirectionStreakRef.current += 1
    } else if (nextDirection !== 0) {
      trendDirectionStreakRef.current = 1
    } else {
      trendDirectionStreakRef.current = 0
    }

    lastTrendDirectionRef.current = nextDirection
    return nextBias
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now()
      if (now - lastSimulationTickRef.current < SIMULATION_INTERVAL_MS) {
        return
      }
      lastSimulationTickRef.current = now

      setMarketCap((previous) => {
        if (trendTicksRemainingRef.current <= 0 || Math.random() < 0.08) {
          trendBiasRef.current = pickTrendBias()
          trendTicksRemainingRef.current = 4 + Math.floor(Math.random() * 7)
        }

        trendTicksRemainingRef.current -= 1

        const noise = (Math.random() - 0.5) * 0.044
        const towardAnchor = ((anchorMarketCapRef.current - previous) / anchorMarketCapRef.current) * 0.0038
        const hasShock = Math.random() < 0.1
        const directionalSign = trendBiasRef.current === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(trendBiasRef.current)
        const shockSign = Math.random() < 0.65 ? directionalSign : -directionalSign
        const shock = hasShock ? shockSign * (0.04 + Math.random() * 0.13) : 0
        const next = Math.max(25_000, previous * (1 + trendBiasRef.current + noise + towardAnchor + shock))

        anchorMarketCapRef.current = anchorMarketCapRef.current * 0.995 + next * 0.005

        setCandles((current) => {
          const nextCandles = [...current]
          const last = nextCandles[nextCandles.length - 1]

          const previousClose = last.close
          nextCandles.push({
            open: previousClose,
            high: Math.max(previousClose, next),
            low: Math.min(previousClose, next),
            close: next,
          })

          return nextCandles.slice(-MAX_CANDLE_HISTORY)
        })

        setChartOffset((currentOffset) => {
          if (currentOffset <= 0) {
            return 0
          }

          const maxOffset = Math.max(candles.length + 1 - VISIBLE_CANDLES, 0)
          return Math.min(currentOffset + 1, maxOffset)
        })

        return next
      })
    }, SIMULATION_POLL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    void loadLeaderboard()
  }, [])

  const pnlMultiple = getPnlMultiple(position, marketCap)
  const projectedValue = position ? Math.max(0, position.collateral * (1 + pnlMultiple)) : 0
  const maxTradeAmount = Number(Math.max(balance, 10).toFixed(2))

  const visibleCandles = useMemo(() => {
    const maxOffset = Math.max(candles.length - VISIBLE_CANDLES, 0)
    const safeOffset = Math.min(chartOffset, maxOffset)
    const start = Math.max(candles.length - VISIBLE_CANDLES - safeOffset, 0)
    return candles.slice(start, start + VISIBLE_CANDLES)
  }, [candles, chartOffset])

  const candleStep = 100 / Math.max(visibleCandles.length, 1)
  const gridSpacingX = candleStep * 4
  const gridSpacingY = 12
  const gridShiftX = (chartOffset * candleStep) % gridSpacingX
  const gridShiftY = chartVerticalOffset % gridSpacingY

  const candleGeometry = useMemo(() => {
    const min = Math.min(...visibleCandles.map((candle) => candle.low))
    const max = Math.max(...visibleCandles.map((candle) => candle.high))
    const span = Math.max(max - min, 1)

    const toY = (value: number) => 100 - ((value - min) / span) * 100 + chartVerticalOffset
    const bodyWidth = candleStep * 0.58

    return visibleCandles.map((candle, index) => {
      const centerX = index * candleStep + candleStep / 2
      const openY = toY(candle.open)
      const closeY = toY(candle.close)
      const highY = toY(candle.high)
      const lowY = toY(candle.low)
      const bodyTop = Math.min(openY, closeY)
      const bodyHeight = Math.max(0.9, Math.abs(closeY - openY))

      return {
        centerX,
        highY,
        lowY,
        bodyX: centerX - bodyWidth / 2,
        bodyTop,
        bodyWidth,
        bodyHeight,
        isUp: candle.close >= candle.open,
      }
    })
  }, [chartVerticalOffset, visibleCandles])

  useEffect(() => {
    if (!position) {
      return
    }

    const livePnl = getPnlMultiple(position, marketCap)
    if (livePnl <= -1) {
      setPosition(null)
      setStatus('Liquidated at -100.00%')
    }
  }, [marketCap, position])

  const openTrade = (side: 'long' | 'short') => {
    if (position) {
      return
    }

    const collateral = Math.max(10, Math.min(tradeAmount, balance))
    if (collateral > balance || collateral <= 0) {
      return
    }

    setBalance((current) => current - collateral)
    setPosition({
      side,
      entryMarketCap: marketCap,
      collateral,
    })
    setStatus(`${side === 'long' ? 'Long' : 'Short'} opened at ${formatMarketCap(marketCap)}`)
  }

  const closeTrade = () => {
    if (!position) {
      return
    }

    const payout = Math.max(0, position.collateral * (1 + pnlMultiple))
    setBalance((current) => current + payout)
    setPosition(null)
    setStatus(`Trade closed at ${formatPnlPercent(pnlMultiple)}`)
  }

  const resetRun = () => {
    const freshHistory = generatePretendHistory(MAX_CANDLE_HISTORY, STARTING_MARKET_CAP)
    const nextMarketCap = freshHistory[freshHistory.length - 1]?.close ?? STARTING_MARKET_CAP

    setBalance(STARTING_BALANCE)
    setPosition(null)
    setTradeAmount(250)
    setMarketCap(nextMarketCap)
    setCandles(freshHistory)
    setChartOffset(0)
    setChartVerticalOffset(0)
    trendBiasRef.current = 0
    trendTicksRemainingRef.current = 0
    trendDirectionStreakRef.current = 0
    lastTrendDirectionRef.current = 0
    anchorMarketCapRef.current = nextMarketCap
    lastSimulationTickRef.current = Date.now()
    setStatus('Reset to $1,000')
  }

  const submitScore = async () => {
    if (balance <= STARTING_BALANCE) {
      setLeaderboardStatus('Score must be above $1,000 to submit.')
      return
    }

    try {
      const response = await fetch('/api/memecoin-leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: balance }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit score')
      }

      const data = await response.json()
      setEntries(Array.isArray(data.entries) ? data.entries : [])
      setLeaderboardStatus('Score submitted!')
    } catch {
      setLeaderboardStatus('Could not submit score right now.')
    }
  }

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
          Memecoin Futures Simulator
        </h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-300">
          <span>Balance: {formatCurrency(balance)}</span>
          <span>Market cap: {formatMarketCap(marketCap)}</span>
        </div>

        <p className="m-0 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{LEVERAGE}x futures mode · liquidation at -100%</p>

        <div
          className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-zinc-300 bg-zinc-100 p-2 touch-none dark:border-zinc-700 dark:bg-zinc-900"
          onPointerDown={(event) => {
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            dragStartXRef.current = event.clientX
            dragStartYRef.current = event.clientY
            dragStartOffsetRef.current = chartOffset
            dragStartVerticalOffsetRef.current = chartVerticalOffset
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
              return
            }

            const deltaX = event.clientX - dragStartXRef.current
            const deltaY = event.clientY - dragStartYRef.current
            const candlesDelta = Math.round(deltaX / 10)
            const maxOffset = Math.max(candles.length - VISIBLE_CANDLES, 0)
            const nextOffset = Math.max(0, Math.min(dragStartOffsetRef.current + candlesDelta, maxOffset))
            setChartOffset(nextOffset)

            const nextVerticalOffset = Math.max(-30, Math.min(dragStartVerticalOffsetRef.current + deltaY / 6, 30))
            setChartVerticalOffset(nextVerticalOffset)
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
          }}
          onPointerCancel={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
          }}
        >
          <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <pattern
                height={gridSpacingY}
                id="memecoin-grid-pattern"
                patternTransform={`translate(${gridShiftX} ${gridShiftY})`}
                patternUnits="userSpaceOnUse"
                width={gridSpacingX}
              >
                <path
                  className="stroke-zinc-300 dark:stroke-zinc-700"
                  d={`M ${gridSpacingX} 0 L 0 0 0 ${gridSpacingY}`}
                  fill="none"
                  strokeWidth="0.28"
                />
              </pattern>
            </defs>

            <rect fill="url(#memecoin-grid-pattern)" height="100" width="100" x="0" y="0" />

            {candleGeometry.map((candle, index) => (
              <g key={index}>
                <line
                  className={
                    candle.isUp ? 'stroke-emerald-300 dark:stroke-emerald-400' : 'stroke-rose-300 dark:stroke-rose-400'
                  }
                  strokeWidth="0.55"
                  x1={candle.centerX}
                  x2={candle.centerX}
                  y1={candle.highY}
                  y2={candle.lowY}
                />
                <rect
                  className={
                    candle.isUp ? 'fill-emerald-300 dark:fill-emerald-400' : 'fill-rose-300 dark:fill-rose-400'
                  }
                  height={candle.bodyHeight}
                  rx="0.3"
                  width={candle.bodyWidth}
                  x={candle.bodyX}
                  y={candle.bodyTop}
                />
              </g>
            ))}
          </svg>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
            <span>Trade size</span>
            <input
              className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              inputMode="decimal"
              max={maxTradeAmount}
              min={10}
              onChange={(event) => {
                const rawValue = Number(event.target.value)
                if (!Number.isFinite(rawValue)) {
                  setTradeAmount(0)
                  return
                }

                const normalizedValue = Math.max(0, rawValue)
                if (normalizedValue > maxTradeAmount) {
                  setTradeAmount(maxTradeAmount)
                  return
                }

                setTradeAmount(Number(normalizedValue.toFixed(2)))
              }}
              onKeyDown={(event) => {
                if (['e', 'E', '+', '-'].includes(event.key)) {
                  event.preventDefault()
                }
              }}
              pattern="[0-9]+([.][0-9]{0,2})?"
              step={0.01}
              type="number"
              value={tradeAmount}
            />
          </label>

          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition-colors hover:text-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100"
            disabled={Boolean(position) || balance < 10}
            onClick={() => openTrade('long')}
            type="button"
          >
            Long
          </button>

          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition-colors hover:text-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100"
            disabled={Boolean(position) || balance < 10}
            onClick={() => openTrade('short')}
            type="button"
          >
            Short
          </button>

          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition-colors hover:text-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100"
            disabled={!position}
            onClick={closeTrade}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">
            Live trade: {position ? `${position.side.toUpperCase()} @ ${formatMarketCap(position.entryMarketCap)}` : 'No open trade'}
          </span>
          <span
            className={
              pnlMultiple > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : pnlMultiple < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-zinc-500 dark:text-zinc-400'
            }
          >
            {position ? formatPnlPercent(pnlMultiple) : '+0.00%'}
          </span>
        </div>

        {position ? (
          <p className="m-0 text-sm text-zinc-600 dark:text-zinc-300">Projected close value: {formatCurrency(projectedValue)}</p>
        ) : null}

        <div className="pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100"
              onClick={resetRun}
              type="button"
            >
              Reset run
            </button>
            <button
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100"
              disabled={balance <= STARTING_BALANCE}
              onClick={() => void submitScore()}
              type="button"
            >
              Submit score
            </button>
          </div>
        </div>

        {status ? <p className="m-0 text-sm text-zinc-500 dark:text-zinc-400">{status}</p> : null}
        {leaderboardStatus ? <p className="m-0 text-sm text-zinc-500 dark:text-zinc-400">{leaderboardStatus}</p> : null}

        <div className="space-y-2 pt-2">
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
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(entry.score)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
