import { useEffect, useRef, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import CustomScrollbar from './components/CustomScrollbar'
import ContactPage from './pages/ContactPage'
import FunHubPage from './pages/FunHubPage'
import FunPage from './pages/FunPage'
import HomePage from './pages/HomePage'
import MemecoinSimulatorPage from './pages/MemecoinSimulatorPage'
import WipPage from './pages/WipPage'

const navItems = [
  { label: 'home', path: '/' },
  { label: 'projects', path: '/projects' },
  { label: 'interests', path: '/interests' },
  { label: 'fun', path: '/fun' },
  { label: 'contact', path: '/contact' },
]

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M21 12.8A9 9 0 1111.2 3a7 7 0 109.8 9.8z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 21s-6.716-4.433-9.428-8.132C.607 10.207.871 6.603 3.343 4.71c2.29-1.753 5.57-1.283 7.657 1.043 2.088-2.326 5.368-2.796 7.657-1.043 2.472 1.893 2.736 5.497.771 8.158C18.716 16.567 12 21 12 21z" />
    </svg>
  )
}

function App() {
  const fullName = 'Devin Widmer'
  const caretBlinkDurationMs = 880
  const caretBlinkCount = 4
  const location = useLocation()
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedPreference = localStorage.getItem('theme')
    if (savedPreference === 'dark') {
      return true
    }
    return false
  })
  const [pageViews, setPageViews] = useState(0)
  const [heartCount, setHeartCount] = useState(0)
  const [hasLiked, setHasLiked] = useState(false)
  const [isGlobalCounterOnline, setIsGlobalCounterOnline] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [nameAnimationPhase, setNameAnimationPhase] = useState<'idle' | 'typing' | 'blinking'>('typing')
  const lastScrollY = useRef(0)

  useEffect(() => {
    setDisplayName('')
    setNameAnimationPhase('typing')

    let timeoutId: number | undefined
    let currentIndex = 0

    const typeNextCharacter = () => {
      currentIndex += 1
      setDisplayName(fullName.slice(0, currentIndex))

      if (currentIndex >= fullName.length) {
        setNameAnimationPhase('blinking')
        timeoutId = window.setTimeout(() => {
          setNameAnimationPhase('idle')
        }, caretBlinkDurationMs * caretBlinkCount)
        return
      }

      const nextDelay = 60 + Math.floor(Math.random() * 120)
      timeoutId = window.setTimeout(typeNextCharacter, nextDelay)
    }

    timeoutId = window.setTimeout(typeNextCharacter, 120)

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [caretBlinkCount, caretBlinkDurationMs, fullName])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  useEffect(() => {
    const syncCounters = async () => {
      const hasCountedView = localStorage.getItem('hasCountedView') === 'true'
      const currentLoadId = `load-${Math.floor(window.performance.timeOrigin)}`

      const viewRequest = hasCountedView
        ? fetch('/api/views', { method: 'GET' })
        : fetch('/api/views', {
            method: 'POST',
            headers: {
              'x-view-id': currentLoadId,
            },
          })

      try {
        const [viewsResponse, likesResponse] = await Promise.all([
          viewRequest,
          fetch('/api/likes'),
        ])

        if (!viewsResponse.ok || !likesResponse.ok) {
          throw new Error('Counter API unavailable')
        }

        const viewsData = await viewsResponse.json()
        const likesData = await likesResponse.json()

        if (!hasCountedView) {
          localStorage.setItem('hasCountedView', 'true')
        }

        setPageViews(Number(viewsData.views) || 0)
        setHeartCount(Number(likesData.likes) || 0)
        setHasLiked(localStorage.getItem('hasLikedSite') === 'true')
        setIsGlobalCounterOnline(true)
        return
      } catch {
        setIsGlobalCounterOnline(false)
      }

      const localViews = Number(localStorage.getItem('totalPageViews') ?? '0')
      if (hasCountedView) {
        setPageViews(Number.isFinite(localViews) ? localViews : 0)
      } else {
        const nextLocalViews = Number.isFinite(localViews) ? localViews + 1 : 1
        localStorage.setItem('totalPageViews', String(nextLocalViews))
        localStorage.setItem('hasCountedView', 'true')
        setPageViews(nextLocalViews)
      }

      const localHearts = Number(localStorage.getItem('totalHearts') ?? '0')
      setHeartCount(Number.isFinite(localHearts) ? localHearts : 0)
      setHasLiked(localStorage.getItem('hasLikedSite') === 'true')
    }

    void syncCounters()
  }, [])

  const toggleHearts = async () => {
    const nextLiked = !hasLiked

    if (isGlobalCounterOnline) {
      try {
        const response = await fetch('/api/likes', { method: nextLiked ? 'POST' : 'DELETE' })
        if (!response.ok) {
          throw new Error('Failed to update likes')
        }

        const data = await response.json()
        setHeartCount(Number(data.likes) || 0)
        setHasLiked(nextLiked)
        localStorage.setItem('hasLikedSite', String(nextLiked))
        return
      } catch {
        setIsGlobalCounterOnline(false)
      }
    }

    const nextHearts = Math.max(heartCount + (nextLiked ? 1 : -1), 0)
    setHeartCount(nextHearts)
    setHasLiked(nextLiked)
    localStorage.setItem('totalHearts', String(nextHearts))
    localStorage.setItem('hasLikedSite', String(nextLiked))
  }

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    const handleScroll = () => {
      lastScrollY.current = window.scrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: lastScrollY.current, behavior: 'auto' })
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [location.pathname])

  return (
    <div
      className={`mystery-theme ${isDarkMode ? 'theme-dark bg-zinc-950 text-zinc-100' : 'theme-light bg-zinc-100 text-zinc-900'} min-h-screen px-8 py-16 font-sans transition-colors duration-500 ease-out md:px-20 md:py-20 lg:px-28`}
    >
      <CustomScrollbar />
      <div className="mx-auto w-full max-w-[620px]">
        <header>
          <h1
            className="mystery-name m-0 text-center font-serif text-[48px] italic font-normal text-white -mt-2 transition-colors duration-500 sm:-mt-3 sm:text-[64px] md:text-[80px]"
          >
            <span className="mystery-name-inline">
              {displayName}
              {(nameAnimationPhase === 'typing' || nameAnimationPhase === 'blinking') && (
                <span
                  aria-hidden="true"
                  className={`mystery-typing-caret ${nameAnimationPhase === 'blinking' ? 'is-blinking' : ''}`}
                />
              )}
            </span>
          </h1>
          <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Last updated: February 19, 2026
          </p>

          <nav className="mt-12 border-b border-zinc-300 pb-4 dark:border-zinc-800">
            <ul className="no-scrollbar flex w-full flex-nowrap items-center justify-start gap-3 overflow-x-auto px-2 text-[0.92rem] text-zinc-500 dark:text-zinc-400 md:gap-4">
              <li>
                <button
                  aria-label="Toggle dark mode"
                  className="mystery-icon-button mystery-mode-toggle inline-flex items-center justify-center transition-colors duration-400 ease-out"
                  onClick={() => setIsDarkMode((value) => !value)}
                  type="button"
                >
                  {isDarkMode ? <SunIcon /> : <MoonIcon />}
                </button>
              </li>
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    className={({ isActive }) =>
                      `mystery-nav-link whitespace-nowrap transition-colors duration-400 ease-out ${
                        isActive
                          ? isDarkMode
                            ? 'is-active-dark'
                            : 'is-active-light'
                          : isDarkMode
                            ? 'is-idle-dark'
                            : 'is-idle-light'
                      }`
                    }
                    end={item.path === '/'}
                    to={item.path}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main className="py-14">
          <div className="route-fade" key={location.pathname}>
            <Routes location={location}>
              <Route element={<HomePage />} path="/" />
              <Route element={<WipPage title="Projects" />} path="/projects" />
              <Route element={<WipPage title="Interests" />} path="/interests" />
              <Route element={<FunHubPage />} path="/fun" />
              <Route element={<FunPage />} path="/fun/geometry-trash" />
              <Route element={<MemecoinSimulatorPage />} path="/fun/memecoin-simulator" />
              <Route element={<ContactPage />} path="/contact" />
              <Route element={<Navigate replace to="/" />} path="*" />
            </Routes>
          </div>
        </main>

        <footer className="mt-14 border-t border-zinc-300 pt-12 dark:border-zinc-800">
          <div className="flex items-center justify-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <span>{pageViews.toLocaleString()} views</span>
            <span aria-hidden="true">·</span>
            <button
              aria-label={hasLiked ? 'Unlike' : 'Like'}
              className={`mystery-text-button inline-flex items-center gap-1.5 transition-colors duration-400 ${
                hasLiked
                  ? isDarkMode
                    ? 'text-orange-300'
                    : 'text-blue-600'
                  : isDarkMode
                    ? 'text-zinc-500 hover:text-orange-300 dark:text-zinc-400 dark:hover:text-orange-300'
                    : 'text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-600'
              }`}
              onClick={toggleHearts}
              type="button"
            >
              <span>{heartCount.toLocaleString()}</span>
              <HeartIcon />
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
