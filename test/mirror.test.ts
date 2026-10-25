import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createZeroRotations } from '../src/constants/bones.ts'
import { POSE_PRESET_MAP } from '../src/constants/posePresets.ts'
import type { BoneId, BoneRotations, PosePresetId, Vec3 } from '../src/types/index.ts'
import { forwardKinematics, landmarkPosition } from '../src/utils/ik.ts'
import { boneWithDescendants, copyToOppositeSide, mirrorPose, oppositeBone } from '../src/utils/mirror.ts'

const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 }

function presetPose(id: PosePresetId): { bones: BoneRotations; rootOffset: Vec3 } {
  const preset = POSE_PRESET_MAP[id]
  const bones = createZeroRotations()
  for (const [bone, rotation] of Object.entries(preset.bones)) bones[bone as BoneId] = { ...rotation }
  return { bones, rootOffset: preset.rootOffset ? { ...preset.rootOffset } : { ...ORIGIN } }
}

function landmark(pose: { bones: BoneRotations; rootOffset: Vec3 }, id: string) {
  const worlds = forwardKinematics({ ...pose, characterPosition: ORIGIN, characterYaw: 0 })
  return landmarkPosition(worlds, id)
}

/** 'leftWrist' <-> 'rightWrist'; center landmarks map to themselves. */
function oppositeLandmark(id: string): string {
  if (id.startsWith('left')) return `right${id.slice(4)}`
  if (id.startsWith('right')) return `left${id.slice(5)}`
  return id
}

describe('mirroring poses', () => {
  test('pairs left and right bones and keeps center bones', () => {
    assert.equal(oppositeBone('leftForearm'), 'rightForearm')
    assert.equal(oppositeBone('rightLowerLeg'), 'leftLowerLeg')
    assert.equal(oppositeBone('chest'), 'chest')
    assert.deepEqual(boneWithDescendants('rightUpperArm'), ['rightUpperArm', 'rightForearm', 'rightHand'])
  })

  test('a flipped pose puts every joint at its mirror image', () => {
    for (const id of ['waving', 'pointing', 'kneeling', 'lookingBack'] as PosePresetId[]) {
      const pose = presetPose(id)
      const flipped = mirrorPose(pose.bones, pose.rootOffset)
      for (const point of ['headCenter', 'nose', 'leftWrist', 'rightElbow', 'leftToe', 'rightKnee']) {
        const original = landmark(pose, point)
        const mirrored = landmark(flipped, oppositeLandmark(point))
        assert.ok(Math.abs(mirrored.x + original.x) < 1e-6, `${id} ${point} x`)
        assert.ok(Math.abs(mirrored.y - original.y) < 1e-6, `${id} ${point} y`)
        assert.ok(Math.abs(mirrored.z - original.z) < 1e-6, `${id} ${point} z`)
      }
    }
  })

  test('flipping twice gives the original pose back', () => {
    const pose = presetPose('pointing')
    const once = mirrorPose(pose.bones, pose.rootOffset)
    assert.deepEqual(mirrorPose(once.bones, once.rootOffset), pose)
  })

  test('copying one arm to the other side mirrors only that arm', () => {
    const pose = presetPose('waving')
    const copied = copyToOppositeSide(pose.bones, 'rightUpperArm')
    for (const point of ['Elbow', 'Wrist', 'Fingertips']) {
      const right = landmark(pose, `right${point}`)
      const left = landmark({ ...pose, bones: copied }, `left${point}`)
      assert.ok(Math.abs(left.x + right.x) < 1e-6 && Math.abs(left.y - right.y) < 1e-6 && Math.abs(left.z - right.z) < 1e-6, point)
    }
    assert.deepEqual(copied.rightUpperArm, pose.bones.rightUpperArm)
    assert.deepEqual(copied.leftThigh, pose.bones.leftThigh)
    assert.equal(copyToOppositeSide(pose.bones, 'chest'), pose.bones)
  })
})
