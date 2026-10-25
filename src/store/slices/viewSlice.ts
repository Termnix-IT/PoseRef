import type { StateCreator } from 'zustand'
import { DEFAULT_ASPECT_RATIO } from '../../constants/aspectRatios'
import { DEFAULT_BACKGROUND } from '../../constants/backgrounds'
import type { AspectRatioId, BackgroundId, InteractionMode, Notice } from '../../types'
import type { AppStore } from '../index'

export interface ViewSlice {
  interactionMode: InteractionMode
  setInteractionMode: (mode: InteractionMode) => void
  aspectRatio: AspectRatioId
  background: BackgroundId
  showGrid: boolean
  showShadow: boolean
  setAspectRatio: (id: AspectRatioId) => void
  setBackground: (id: BackgroundId) => void
  setShowGrid: (value: boolean) => void
  setShowShadow: (value: boolean) => void
  resetAspectRatio: () => void
  /** Short message for the status bar (export results and the like). */
  notice: Notice | null
  showNotice: (text: string, tone?: Notice['tone']) => void
}

export const createViewSlice: StateCreator<AppStore, [], [], ViewSlice> = (set) => ({
  interactionMode: 'camera',
  setInteractionMode: (interactionMode) => set({ interactionMode }),
  aspectRatio: DEFAULT_ASPECT_RATIO,
  background: DEFAULT_BACKGROUND,
  showGrid: true,
  showShadow: true,
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setBackground: (background) => set({ background }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowShadow: (showShadow) => set({ showShadow }),
  resetAspectRatio: () => set({ aspectRatio: DEFAULT_ASPECT_RATIO }),
  notice: null,
  showNotice: (text, tone = 'info') =>
    set((state) => ({ notice: { id: (state.notice?.id ?? 0) + 1, text, tone } })),
})
