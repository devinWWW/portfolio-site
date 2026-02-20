import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const TRACK_MARGIN = 14
const MIN_THUMB_SIZE = 42

export default function CustomScrollbar() {
  const location = useLocation()
  const [thumbHeight, setThumbHeight] = useState(MIN_THUMB_SIZE)
  const [thumbTop, setThumbTop] = useState(TRACK_MARGIN)
  const [canScroll, setCanScroll] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragStartScrollY, setDragStartScrollY] = useState(0)

  const syncThumb = () => {
    const viewportHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    const scrollY = window.scrollY
    const scrollRange = Math.max(documentHeight - viewportHeight, 0)

    if (scrollRange === 0) {
      setCanScroll(false)
      setThumbHeight(MIN_THUMB_SIZE)
      setThumbTop(TRACK_MARGIN)
      return
    }

    const trackHeight = Math.max(viewportHeight - TRACK_MARGIN * 2, MIN_THUMB_SIZE)
    const nextThumbHeight = Math.max(
      Math.round((viewportHeight / documentHeight) * trackHeight),
      MIN_THUMB_SIZE,
    )
    const maxThumbTop = TRACK_MARGIN + (trackHeight - nextThumbHeight)
    const nextThumbTop = TRACK_MARGIN + (scrollY / scrollRange) * (trackHeight - nextThumbHeight)

    setCanScroll(true)
    setThumbHeight(nextThumbHeight)
    setThumbTop(Math.min(Math.max(nextThumbTop, TRACK_MARGIN), maxThumbTop))
  }

  useEffect(() => {
    syncThumb()

    const handleScroll = () => syncThumb()
    const handleResize = () => syncThumb()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => syncThumb())
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname])

  useEffect(() => {
    if (!isDragging) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const viewportHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollRange = Math.max(documentHeight - viewportHeight, 0)
      if (scrollRange === 0) {
        return
      }

      const trackHeight = Math.max(viewportHeight - TRACK_MARGIN * 2, MIN_THUMB_SIZE)
      const maxThumbTravel = trackHeight - thumbHeight
      if (maxThumbTravel <= 0) {
        return
      }

      const deltaY = event.clientY - dragStartY
      const scrollRatio = deltaY / maxThumbTravel
      const nextScroll = Math.min(
        Math.max(dragStartScrollY + scrollRatio * scrollRange, 0),
        scrollRange,
      )
      window.scrollTo({ top: nextScroll })
    }

    const handleMouseUp = () => setIsDragging(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragStartScrollY, dragStartY, isDragging, thumbHeight])

  if (!canScroll) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-y-0 right-0.5 z-50 w-4">
      <div
        aria-label="Page scrollbar"
        className="pointer-events-auto absolute left-1/2 w-2.5 -translate-x-1/2 cursor-grab rounded-full border border-blue-400/65 bg-blue-500/30 transition-colors hover:bg-blue-500/40 active:cursor-grabbing dark:border-orange-400/90 dark:bg-orange-500/35 dark:hover:bg-orange-400/45"
        onMouseDown={(event) => {
          setDragStartY(event.clientY)
          setDragStartScrollY(window.scrollY)
          setIsDragging(true)
        }}
        role="scrollbar"
        style={{ height: thumbHeight, top: thumbTop }}
      />
    </div>
  )
}
