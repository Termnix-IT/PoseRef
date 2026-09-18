import { useLayoutEffect, useState, type RefObject } from 'react'

export interface FitSize {
  width: number
  height: number
}

/**
 * Computes the largest box with the given aspect ratio that fits inside the
 * referenced container (minus padding). Re-computes on container resize.
 */
export function useFitAspect(containerRef: RefObject<HTMLElement | null>, ratio: number, padding = 24): FitSize {
  const [size, setSize] = useState<FitSize>({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return

    const compute = () => {
      const availableWidth = Math.max(0, element.clientWidth - padding * 2)
      const availableHeight = Math.max(0, element.clientHeight - padding * 2)
      let width = availableWidth
      let height = availableWidth / ratio
      if (height > availableHeight) {
        height = availableHeight
        width = availableHeight * ratio
      }
      const next = { width: Math.floor(width), height: Math.floor(height) }
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next))
    }

    compute()
    const observer = new ResizeObserver(compute)
    observer.observe(element)
    return () => observer.disconnect()
  }, [containerRef, ratio, padding])

  return size
}
