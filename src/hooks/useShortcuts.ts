import { useEffect } from 'react'
import { BONE_MAP, childrenOf } from '../constants/bones'
import { useAppStore } from '../store'

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** The backslash key; on Japanese keyboards it may be reported as the Yen or Ro key. */
const BACKSLASH_CODES = ['Backslash', 'IntlYen', 'IntlRo']

/**
 * Ctrl+K opens or closes the command palette from anywhere. The other keys
 * are ignored while typing in a field: Ctrl+\ hides or shows the UI,
 * Ctrl+Z undo, Ctrl+Shift+Z / Ctrl+Y redo, C / P switch the drag mode,
 * Escape clears the bone selection, [ and ] move it to the parent or child bone.
 * (Ctrl+S is handled by the export menu.)
 */
export function useShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const state = useAppStore.getState()
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && key === 'k') {
        event.preventDefault()
        state.setPaletteOpen(!state.paletteOpen)
        return
      }
      if (isTextEntry(event.target)) return
      if (event.ctrlKey || event.metaKey) {
        if (event.altKey) return
        if (BACKSLASH_CODES.includes(event.code) && !event.shiftKey) state.setUiHidden(!state.uiHidden)
        else if (key === 'z' && !event.shiftKey) state.undo()
        else if ((key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey)) state.redo()
        else return
        event.preventDefault()
        return
      }
      if (event.altKey || event.shiftKey) return
      if (key === 'c') state.setInteractionMode('camera')
      else if (key === 'p') state.setInteractionMode('pose')
      else if (key === 'escape') state.selectBone(null)
      else if (key === '[' && state.selectedBone) state.selectBone(BONE_MAP[state.selectedBone].parent ?? state.selectedBone)
      else if (key === ']' && state.selectedBone) state.selectBone(childrenOf(state.selectedBone)[0]?.id ?? state.selectedBone)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
