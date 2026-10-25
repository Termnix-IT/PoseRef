import type { StateCreator, StoreApi } from 'zustand'
import type { SceneSnapshot } from '../types'
import { createHistory } from '../utils/history'
import type { AppStore } from './index'

const UNDO_LIMIT = 100
/** A gesture ends this long after the last change once the pointer is up (covers camera damping and typing). */
const QUIET_MS = 300

export interface HistorySlice {
  canUndo: boolean
  canRedo: boolean
  /**
   * Ends the current undo step. Discrete actions (presets, resets, AI edits)
   * call it before and after their change so they are one step of their own.
   */
  checkpoint: () => void
  undo: () => void
  redo: () => void
}

const history = createHistory<SceneSnapshot>(UNDO_LIMIT)
let applying = false
let closeTimer: ReturnType<typeof setTimeout> | undefined

function takeSnapshot(state: AppStore): SceneSnapshot {
  return {
    pose: state.pose,
    character: state.character,
    camera: state.camera,
    aspectRatio: state.aspectRatio,
    background: state.background,
    showGrid: state.showGrid,
    showShadow: state.showShadow,
  }
}

/** Store actions replace the objects they change, so comparing references finds every change. */
function sameSnapshot(a: SceneSnapshot, b: SceneSnapshot): boolean {
  return (Object.keys(a) as Array<keyof SceneSnapshot>).every((key) => a[key] === b[key])
}

function flags(): Pick<HistorySlice, 'canUndo' | 'canRedo'> {
  return { canUndo: history.canUndo(), canRedo: history.canRedo() }
}

function closeGroup() {
  clearTimeout(closeTimer)
  history.close()
}

export const createHistorySlice: StateCreator<AppStore, [], [], HistorySlice> = (set, get) => {
  const restore = (snapshot: SceneSnapshot | null) => {
    if (!snapshot) return
    applying = true
    set((state) => ({
      ...snapshot,
      // Push the restored camera into OrbitControls.
      cameraSyncId: state.cameraSyncId + 1,
      activeCameraPreset: 'custom',
      ...flags(),
    }))
    applying = false
  }
  return {
    canUndo: false,
    canRedo: false,
    checkpoint: closeGroup,
    undo: () => {
      clearTimeout(closeTimer)
      restore(history.undo(takeSnapshot(get())))
    },
    redo: () => {
      clearTimeout(closeTimer)
      restore(history.redo(takeSnapshot(get())))
    },
  }
}

/**
 * Records every scene change into the undo history. Changes made while a
 * pointer is held down (slider drags, 3D drags, camera orbits) form one step,
 * which ends QUIET_MS after the pointer is released and the scene stops moving.
 */
export function installHistoryTracking(store: StoreApi<AppStore>): void {
  let previous = takeSnapshot(store.getState())
  let pointersDown = 0

  const scheduleClose = () => {
    clearTimeout(closeTimer)
    if (pointersDown === 0) closeTimer = setTimeout(() => history.close(), QUIET_MS)
  }

  store.subscribe((state) => {
    const next = takeSnapshot(state)
    if (sameSnapshot(previous, next)) return
    if (!applying) {
      history.record(previous)
      scheduleClose()
    }
    previous = next
    const current = flags()
    if (current.canUndo !== state.canUndo || current.canRedo !== state.canRedo) store.setState(current)
  })

  window.addEventListener(
    'pointerdown',
    () => {
      pointersDown += 1
      clearTimeout(closeTimer)
    },
    true,
  )
  const release = () => {
    pointersDown = Math.max(0, pointersDown - 1)
    scheduleClose()
  }
  window.addEventListener('pointerup', release, true)
  window.addEventListener('pointercancel', release, true)
  // A release outside the window may never arrive; do not keep the step open forever.
  window.addEventListener('blur', () => {
    pointersDown = 0
    scheduleClose()
  })
}
