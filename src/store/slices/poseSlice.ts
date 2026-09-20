import type { StateCreator } from 'zustand'
import { BONE_IDS, createZeroRotations } from '../../constants/bones'
import { DEFAULT_POSE_PRESET, POSE_PRESET_MAP } from '../../constants/posePresets'
import type { Axis, BoneId, PosePresetId, PoseState, Vec3 } from '../../types'
import type { AppStore } from '../index'

export interface PoseSlice {
  pose: PoseState
  selectedBone: BoneId | null
  selectBone: (bone: BoneId | null) => void
  setBoneRotation: (bone: BoneId, axis: Axis, value: number) => void
  /** Replaces all three axes at once; used by the drag interaction. */
  setBoneRotationVec: (bone: BoneId, rotation: Vec3) => void
  /** Sets the bone back to zero rotation. */
  resetBone: (bone: BoneId) => void
  applyPosePreset: (id: PosePresetId) => void
  resetPose: () => void
}

export function createPoseFromPreset(id: PosePresetId): PoseState {
  const preset = POSE_PRESET_MAP[id]
  const bones = createZeroRotations()
  for (const boneId of BONE_IDS) {
    const rotation = preset.bones[boneId]
    if (rotation) bones[boneId] = { ...rotation }
  }
  return {
    bones,
    rootOffset: preset.rootOffset ? { ...preset.rootOffset } : { x: 0, y: 0, z: 0 },
    presetId: id,
  }
}

export const createPoseSlice: StateCreator<AppStore, [], [], PoseSlice> = (set) => ({
  pose: createPoseFromPreset(DEFAULT_POSE_PRESET),
  selectedBone: null,
  selectBone: (bone) => set({ selectedBone: bone }),
  setBoneRotation: (bone, axis, value) =>
    set((state) => ({
      pose: {
        ...state.pose,
        presetId: 'custom',
        bones: { ...state.pose.bones, [bone]: { ...state.pose.bones[bone], [axis]: value } },
      },
    })),
  setBoneRotationVec: (bone, rotation) =>
    set((state) => ({
      pose: {
        ...state.pose,
        presetId: 'custom',
        bones: { ...state.pose.bones, [bone]: { ...rotation } },
      },
    })),
  resetBone: (bone) =>
    set((state) => ({
      pose: {
        ...state.pose,
        presetId: 'custom',
        bones: { ...state.pose.bones, [bone]: { x: 0, y: 0, z: 0 } },
      },
    })),
  applyPosePreset: (id) => set({ pose: createPoseFromPreset(id) }),
  resetPose: () => set({ pose: createPoseFromPreset(DEFAULT_POSE_PRESET), selectedBone: null }),
})
