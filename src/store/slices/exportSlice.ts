import type { StateCreator } from 'zustand'
import type { ExportRenderer, ExportScale } from '../../types'
import type { AppStore } from '../index'

export interface ExportSlice {
  exportScale: ExportScale
  /** Registered by the 3D view once the renderer is ready. */
  exportRenderer: ExportRenderer | null
  isExporting: boolean
  includePromptDetails: boolean
  setExportScale: (scale: ExportScale) => void
  registerExportRenderer: (renderer: ExportRenderer | null) => void
  setExporting: (value: boolean) => void
  setIncludePromptDetails: (value: boolean) => void
}

export const createExportSlice: StateCreator<AppStore, [], [], ExportSlice> = (set) => ({
  exportScale: 1,
  exportRenderer: null,
  isExporting: false,
  includePromptDetails: true,
  setExportScale: (exportScale) => set({ exportScale }),
  registerExportRenderer: (exportRenderer) => set({ exportRenderer }),
  setExporting: (isExporting) => set({ isExporting }),
  setIncludePromptDetails: (includePromptDetails) => set({ includePromptDetails }),
})
