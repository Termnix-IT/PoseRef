import type { StateCreator } from 'zustand'
import { DEFAULT_ASPECT_RATIO } from '../../constants/aspectRatios'
import { DEFAULT_BACKGROUND } from '../../constants/backgrounds'
import type { AspectRatioId, BackgroundId, InteractionMode } from '../../types'
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
})
