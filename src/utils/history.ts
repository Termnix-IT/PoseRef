/**
 * Undo / redo stacks with change grouping, independent of the store and the
 * browser so it can be tested on its own.
 *
 * The owner reports every change with `record(previous)`. The first change of a
 * group saves the state from before it; further changes join the same group
 * until `close()` is called. The store closes a group when a gesture ends (the
 * pointer is released and the scene has been quiet for a moment) or around
 * discrete actions such as presets, so one drag or one preset is one step.
 */
export interface History<T> {
  /** Reports a change; `previous` is the state just before it. */
  record: (previous: T) => void
  /** Ends the current group, so the next change starts a new step. */
  close: () => void
  /** Returns the state to restore, or null when there is nothing to undo. */
  undo: (current: T) => T | null
  /** Returns the state to restore, or null when there is nothing to redo. */
  redo: (current: T) => T | null
  canUndo: () => boolean
  canRedo: () => boolean
}

export function createHistory<T>(limit: number): History<T> {
  let past: T[] = []
  let future: T[] = []
  let groupOpen = false

  return {
    record: (previous) => {
      if (groupOpen) return
      past = [...past, previous].slice(-limit)
      future = []
      groupOpen = true
    },
    close: () => {
      groupOpen = false
    },
    undo: (current) => {
      groupOpen = false
      const previous = past[past.length - 1]
      if (previous === undefined) return null
      past = past.slice(0, -1)
      future = [...future, current]
      return previous
    },
    redo: (current) => {
      groupOpen = false
      const next = future[future.length - 1]
      if (next === undefined) return null
      future = future.slice(0, -1)
      past = [...past, current].slice(-limit)
      return next
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  }
}
