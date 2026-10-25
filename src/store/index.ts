import { create } from 'zustand'
import { createHistorySlice, installHistoryTracking, type HistorySlice } from './history'
import { installAutosave, restoreSavedScene } from './persistence'
import { createAgentSlice, type AgentSlice } from './slices/agentSlice'
import { createCameraSlice, type CameraSlice } from './slices/cameraSlice'
import { createCharacterSlice, type CharacterSlice } from './slices/characterSlice'
import { createExportSlice, type ExportSlice } from './slices/exportSlice'
import { createPoseSlice, type PoseSlice } from './slices/poseSlice'
import { createViewSlice, type ViewSlice } from './slices/viewSlice'

export interface ResetSlice {
  /** Resets character transform, pose, camera (incl. FOV) and aspect ratio. */
  resetAll: () => void
}

export type AppStore = CharacterSlice &
  PoseSlice &
  CameraSlice &
  ViewSlice &
  ExportSlice &
  AgentSlice &
  HistorySlice &
  ResetSlice

export const useAppStore = create<AppStore>()((set, get, api) => ({
  ...createCharacterSlice(set, get, api),
  ...createPoseSlice(set, get, api),
  ...createCameraSlice(set, get, api),
  ...createViewSlice(set, get, api),
  ...createExportSlice(set, get, api),
  ...createAgentSlice(set, get, api),
  ...createHistorySlice(set, get, api),
  resetAll: () => {
    const state = get()
    state.checkpoint()
    state.resetCharacter()
    state.resetPose()
    state.resetCamera()
    state.resetAspectRatio()
    state.checkpoint()
  },
}))

// Restore first, so the saved scene is where undo history starts, not a step in it.
restoreSavedScene(useAppStore)
installHistoryTracking(useAppStore)
installAutosave(useAppStore)
