import { create } from 'zustand'
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
  ResetSlice

export const useAppStore = create<AppStore>()((set, get, api) => ({
  ...createCharacterSlice(set, get, api),
  ...createPoseSlice(set, get, api),
  ...createCameraSlice(set, get, api),
  ...createViewSlice(set, get, api),
  ...createExportSlice(set, get, api),
  ...createAgentSlice(set, get, api),
  resetAll: () => {
    const state = get()
    state.pushUndo()
    state.resetCharacter()
    state.resetPose()
    state.resetCamera()
    state.resetAspectRatio()
  },
}))
