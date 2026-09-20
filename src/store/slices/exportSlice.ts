import type { StateCreator } from 'zustand'
import { DEFAULT_PROMPT_LANGUAGE } from '../../constants/prompts'
import type { ExportRenderer, ExportScale, PromptLanguage } from '../../types'
import type { AppStore } from '../index'

export interface ExportSlice {
  exportScale: ExportScale
  /** Registered by the 3D view once the renderer is ready. */
  exportRenderer: ExportRenderer | null
  isExporting: boolean
  includePromptDetails: boolean
  /** Which language the prompt panel currently shows. */
  promptLanguage: PromptLanguage
  setExportScale: (scale: ExportScale) => void
  registerExportRenderer: (renderer: ExportRenderer | null) => void
  setExporting: (value: boolean) => void
  setIncludePromptDetails: (value: boolean) => void
  setPromptLanguage: (language: PromptLanguage) => void
}

export const createExportSlice: StateCreator<AppStore, [], [], ExportSlice> = (set) => ({
  exportScale: 1,
  exportRenderer: null,
  isExporting: false,
  includePromptDetails: true,
  promptLanguage: DEFAULT_PROMPT_LANGUAGE,
  setExportScale: (exportScale) => set({ exportScale }),
  registerExportRenderer: (exportRenderer) => set({ exportRenderer }),
  setExporting: (isExporting) => set({ isExporting }),
  setIncludePromptDetails: (includePromptDetails) => set({ includePromptDetails }),
  setPromptLanguage: (promptLanguage) => set({ promptLanguage }),
})
