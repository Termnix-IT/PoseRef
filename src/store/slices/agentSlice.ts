import type { StateCreator } from 'zustand'
import { BONE_IDS, createZeroRotations } from '../../constants/bones'
import type {
  AgentBridgeStatus,
  BoneRotations,
  JointReader,
  ReviewRenderer,
  SceneDocument,
} from '../../types'
import { clamp, round } from '../../utils/math'
import type { AppStore } from '../index'

/** Same limits as the server's rootOffset schema. */
const ROOT_OFFSET_LIMIT = 1.5

export interface AgentSlice {
  agentStatus: AgentBridgeStatus
  /** Registered by the 3D view; renders the review views an agent asks for. */
  reviewRenderer: ReviewRenderer | null
  /** Registered by the 3D view; reads joint landmark positions for agents. */
  jointReader: JointReader | null
  setAgentStatus: (status: AgentBridgeStatus) => void
  registerReviewRenderer: (renderer: ReviewRenderer | null) => void
  registerJointReader: (reader: JointReader | null) => void
  /**
   * Applies an already validated document as one undoable step. Unless
   * `pose.ground` is false, the hips are then moved so the body rests on the
   * floor; returns that vertical shift in meters, or null when not grounded.
   */
  applySceneDocument: (doc: SceneDocument) => number | null
  /** Moves the hips up or down so the lowest body point sits at the character's floor height. */
  groundPose: () => number | null
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
  setAgentStatus: (agentStatus) => set({ agentStatus }),
  registerReviewRenderer: (reviewRenderer) => set({ reviewRenderer }),
  registerJointReader: (jointReader) => set({ jointReader }),
  applySceneDocument: (doc) => {
    get().checkpoint()
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
    // Grounding is part of the same undo step; the checkpoint after it closes the step.
    const shift = doc.pose && doc.pose.ground !== false ? get().groundPose() : null
    get().checkpoint()
    return shift
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
