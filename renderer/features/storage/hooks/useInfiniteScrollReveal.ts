import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function getScrollParent(node: HTMLElement | null): Element | null {
  let current: HTMLElement | null = node
  while (current) {
    const style = window.getComputedStyle(current)
    const overflowY = style.overflowY
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current
    }
    current = current.parentElement
  }
  return null
}

export interface InfiniteScrollRevealResult<T> {
  visibleItems: T[]
  sentinelRef: (node: HTMLElement | null) => void
  hasMore: boolean
  visibleCount: number
  total: number
}

/**
 * Renders a growing window of `items` as the user scrolls near the bottom.
 * Resets when `resetKey` changes (filters/sort) or the item list shrinks.
 */
export function useInfiniteScrollReveal<T>(
  items: T[],
  options?: {
    pageSize?: number
    /** Change this when filters/sort change so the window resets to the first page. */
    resetKey?: string | number
  }
): InfiniteScrollRevealResult<T> {
  const pageSize = options?.pageSize ?? 40
  const resetKey = options?.resetKey ?? ''
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null)
  const itemsLengthRef = useRef(items.length)

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [resetKey, pageSize])

  useEffect(() => {
    // If list shrinks below the current window (delete/filter), clamp
    if (items.length < itemsLengthRef.current) {
      setVisibleCount((count) => Math.min(count, Math.max(pageSize, items.length)))
    }
    itemsLengthRef.current = items.length
  }, [items.length, pageSize])

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  )
  const hasMore = visibleCount < items.length

  const loadMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + pageSize, items.length))
  }, [items.length, pageSize])

  useEffect(() => {
    if (!sentinel || !hasMore) return

    const root = getScrollParent(sentinel)
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore()
        }
      },
      {
        root,
        rootMargin: '240px 0px',
        threshold: 0
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, hasMore, loadMore, visibleCount])

  return {
    visibleItems,
    sentinelRef: setSentinel,
    hasMore,
    visibleCount: Math.min(visibleCount, items.length),
    total: items.length
  }
}
