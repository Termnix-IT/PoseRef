import type { StoreApi } from 'zustand'
import { parseSavedScene, pickSavedScene, SAVED_SCENE_KEYS, serializeSavedScene } from '../utils/savedScene'
import type { AppStore } from './index'

const STORAGE_KEY = 'poseref:scene'
/** Camera orbits change the scene many times a second; write once things settle. */
const WRITE_DELAY_MS = 300

/**
 * Puts back the scene saved by an earlier visit. Called right after the store
 * is created and before history tracking starts, so the restored scene is the
 * starting point rather than an undoable step. Storage that is unavailable
 * (private mode, blocked site data) simply means starting from the defaults.
 */
export function restoreSavedScene(store: StoreApi<AppStore>): void {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return
  }
  const saved = parseSavedScene(raw)
  if (Object.keys(saved).length > 0) store.setState(saved)
}

/** Saves the scene to the browser whenever it changes, a moment after the last change and when the page is left. */
export function installAutosave(store: StoreApi<AppStore>): void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let previous = pickSavedScene(store.getState())

  const write = () => {
    clearTimeout(timer)
    timer = undefined
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeSavedScene(store.getState()))
    } catch {
      // Full or blocked storage: keep working without saving.
    }
  }

  store.subscribe((state) => {
    const next = pickSavedScene(state)
    // Store actions replace the objects they change, so comparing references finds every change.
    if (SAVED_SCENE_KEYS.every((key) => next[key] === previous[key])) return
    previous = next
    clearTimeout(timer)
    timer = setTimeout(write, WRITE_DELAY_MS)
  })

  // A reload right after a change must not lose it.
  window.addEventListener('pagehide', () => {
    if (timer !== undefined) write()
  })
}
