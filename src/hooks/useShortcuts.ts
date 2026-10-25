import { useEffect } from 'react'
import { useAppStore } from '../store'

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * App-wide keys, ignored while typing in a field:
 * Ctrl+Z undo, Ctrl+Shift+Z / Ctrl+Y redo, C / P switch the drag mode,
 * Escape clears the bone selection. (Ctrl+S is handled by the export menu.)
 */
export function useShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEntry(event.target)) return
      const state = useAppStore.getState()
      const key = event.key.toLowerCase()
      if (event.ctrlKey || event.metaKey) {
        if (event.altKey) return
        if (key === 'z' && !event.shiftKey) state.undo()
        else if ((key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey)) state.redo()
        else return
        event.preventDefault()
        return
      }
      if (event.altKey || event.shiftKey) return
      if (key === 'c') state.setInteractionMode('camera')
      else if (key === 'p') state.setInteractionMode('pose')
      else if (key === 'escape') state.selectBone(null)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
