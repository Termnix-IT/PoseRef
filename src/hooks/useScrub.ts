import { useRef, type PointerEvent } from 'react'
import { clamp } from '../utils/math'

export interface ScrubOptions {
  value: number
  min: number
  max: number
  /** Change per pixel of horizontal movement. */
  step: number
  disabled?: boolean
  onChange: (value: number) => void
}

/** Shift moves 10 times faster and Alt 10 times slower, as in Photoshop's scrubby sliders. */
function speed(event: PointerEvent): number {
  if (event.shiftKey) return 10
  if (event.altKey) return 0.1
  return 1
}

/**
 * Pointer handlers that turn a label into a scrubby control: dragging it left
 * or right changes the value by `step` per pixel. Movement is measured from
 * the previous event, so pressing or releasing a modifier mid-drag only
 * changes the speed from then on.
 */
export function useScrub({ value, min, max, step, disabled = false, onChange }: ScrubOptions) {
  const drag = useRef<{ lastX: number; value: number } | null>(null)

  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (disabled || event.button !== 0) return
      // Keep the press from selecting text while dragging.
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = { lastX: event.clientX, value }
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const state = drag.current
      if (!state) return
      const delta = event.clientX - state.lastX
      if (delta === 0) return
      state.lastX = event.clientX
      state.value = clamp(state.value + delta * step * speed(event), min, max)
      onChange(state.value)
    },
    onPointerUp: () => {
      drag.current = null
    },
    onPointerCancel: () => {
      drag.current = null
    },
  }
}
