import type { StateCreator } from 'zustand'
import { BONE_IDS, createZeroRotations } from '../../constants/bones'
import type {
  AgentBridgeStatus,
  BoneRotations,
  ReviewRenderer,
  SceneDocument,
  SceneSnapshot,
} from '../../types'
import type { AppStore } from '../index'

const UNDO_LIMIT = 50

export interface AgentSlice {
  agentStatus: AgentBridgeStatus
  /** Registered by the 3D view; renders the review views an agent asks for. */
  reviewRenderer: ReviewRenderer | null
  /**
   * Snapshots taken before discrete scene changes (AI edits, presets, resets).
   * Slider and drag edits are not recorded.
   */
  undoStack: SceneSnapshot[]
  setAgentStatus: (status: AgentBridgeStatus) => void
  registerReviewRenderer: (renderer: ReviewRenderer | null) => void
  /** Records the current scene so the next discrete change can be undone. */
  pushUndo: () => void
  undo: () => void
  /** Applies an already validated document as one undoable step. */
  applySceneDocument: (doc: SceneDocument) => void
}

function takeSnapshot(state: AppStore): SceneSnapshot {
  return {
    pose: state.pose,
    character: state.character,
    camera: state.camera,
    aspectRatio: state.aspectRatio,
  }
}

function sameSnapshot(a: SceneSnapshot, b: SceneSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function sceneDocumentFromState(state: AppStore): SceneDocument {
  return {
    version: 1,
    pose: { bones: state.pose.bones, rootOffset: state.pose.rootOffset },
    character: { yaw: state.character.yaw, position: state.character.position },
    camera: { ...state.camera },
    aspectRatio: state.aspectRatio,
  }
}

export const createAgentSlice: StateCreator<AppStore, [], [], AgentSlice> = (set, get) => ({
  agentStatus: 'disconnected',
  reviewRenderer: null,
  undoStack: [],
  setAgentStatus: (agentStatus) => set({ agentStatus }),
  registerReviewRenderer: (reviewRenderer) => set({ reviewRenderer }),
  pushUndo: () =>
    set((state) => {
      const snapshot = takeSnapshot(state)
      const last = state.undoStack[state.undoStack.length - 1]
      // Composite actions (e.g. reset all) push more than once; keep a single entry.
      if (last && sameSnapshot(last, snapshot)) return {}
      return { undoStack: [...state.undoStack, snapshot].slice(-UNDO_LIMIT) }
    }),
  undo: () =>
    set((state) => {
      const previous = state.undoStack[state.undoStack.length - 1]
      if (!previous) return {}
      return {
        pose: previous.pose,
        character: previous.character,
        camera: previous.camera,
        aspectRatio: previous.aspectRatio,
        cameraSyncId: state.cameraSyncId + 1,
        activeCameraPreset: 'custom',
        selectedBone: null,
        undoStack: state.undoStack.slice(0, -1),
      }
    }),
  applySceneDocument: (doc) => {
    get().pushUndo()
    set((state) => {
      const patch: Partial<AppStore> = {}
      if (doc.pose) {
        const base: BoneRotations =
          doc.pose.mode === 'merge' ? { ...state.pose.bones } : createZeroRotations()
        for (const id of BONE_IDS) {
          const rotation = doc.pose.bones?.[id]
          if (rotation) base[id] = { ...rotation }
        }
        patch.pose = {
          bones: base,
          rootOffset: doc.pose.rootOffset
            ? { ...doc.pose.rootOffset }
            : doc.pose.mode === 'merge'
              ? state.pose.rootOffset
              : { x: 0, y: 0, z: 0 },
          presetId: 'custom',
        }
      }
      if (doc.character) {
        patch.character = {
          ...state.character,
          ...(doc.character.yaw !== undefined ? { yaw: doc.character.yaw } : {}),
          ...(doc.character.position ? { position: { ...doc.character.position } } : {}),
        }
      }
      if (doc.camera) {
        patch.camera = {
          fov: doc.camera.fov ?? state.camera.fov,
          position: doc.camera.position ? { ...doc.camera.position } : state.camera.position,
          target: doc.camera.target ? { ...doc.camera.target } : state.camera.target,
        }
        patch.cameraSyncId = state.cameraSyncId + 1
        patch.activeCameraPreset = 'custom'
      }
      if (doc.aspectRatio) patch.aspectRatio = doc.aspectRatio
      return patch
    })
  },
})
