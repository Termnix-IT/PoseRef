import type { StateCreator } from 'zustand'
import { BONE_IDS, createZeroRotations } from '../../constants/bones'
import type {
  AgentBridgeStatus,
  BoneRotations,
  JointReader,
  ReviewRenderer,
  SceneDocument,
  SceneSnapshot,
} from '../../types'
import { clamp, round } from '../../utils/math'
import type { AppStore } from '../index'

const UNDO_LIMIT = 50
/** Same limits as the server's rootOffset schema. */
const ROOT_OFFSET_LIMIT = 1.5

export interface AgentSlice {
  agentStatus: AgentBridgeStatus
  /** Registered by the 3D view; renders the review views an agent asks for. */
  reviewRenderer: ReviewRenderer | null
  /** Registered by the 3D view; reads joint landmark positions for agents. */
  jointReader: JointReader | null
  /**
   * Snapshots taken before discrete scene changes (AI edits, presets, resets).
   * Slider and drag edits are not recorded.
   */
  undoStack: SceneSnapshot[]
  setAgentStatus: (status: AgentBridgeStatus) => void
  registerReviewRenderer: (renderer: ReviewRenderer | null) => void
  registerJointReader: (reader: JointReader | null) => void
  /** Records the current scene so the next discrete change can be undone. */
  pushUndo: () => void
  undo: () => void
  /**
   * Applies an already validated document as one undoable step. Unless
   * `pose.ground` is false, the hips are then moved so the body rests on the
   * floor; returns that vertical shift in meters, or null when not grounded.
   */
  applySceneDocument: (doc: SceneDocument) => number | null
  /** Moves the hips up or down so the lowest body point sits at the character's floor height. */
  groundPose: () => number | null
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
  jointReader: null,
  undoStack: [],
  setAgentStatus: (agentStatus) => set({ agentStatus }),
  registerReviewRenderer: (reviewRenderer) => set({ reviewRenderer }),
  registerJointReader: (jointReader) => set({ jointReader }),
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
    // Part of the same undo step: no snapshot is pushed in between.
    return doc.pose && doc.pose.ground !== false ? get().groundPose() : null
  },
  groundPose: () => {
    const reader = get().jointReader
    if (!reader) return null
    const floor = get().character.position.y
    const shift = round(floor - reader().lowestY)
    if (Math.abs(shift) < 0.001) return 0
    set((state) => ({
      pose: {
        ...state.pose,
        rootOffset: {
          ...state.pose.rootOffset,
          y: clamp(round(state.pose.rootOffset.y + shift), -ROOT_OFFSET_LIMIT, ROOT_OFFSET_LIMIT),
        },
      },
    }))
    return shift
  },
})
