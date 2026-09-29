import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { Group, Scene, Vector3 } from 'three'
import type { Object3D } from 'three'
import {
  BALL_LIMITS,
  BONES,
  HINGE_LIMITS,
  ROOT_BONE,
  createZeroRotations,
} from '../src/constants/bones.ts'
import { POSE_PRESETS, POSE_PRESET_MAP } from '../src/constants/posePresets.ts'
import type { BoneId, PosePresetId, Vec3 } from '../src/types/index.ts'
import {
  checkGoal,
  forwardKinematics,
  landmarkPosition,
  resolveChains,
  solveIk,
  type IkGoal,
  type PoseFrame,
} from '../src/utils/ik.ts'
import { measureJoints } from '../src/utils/jointPositions.ts'
import { DEG2RAD } from '../src/utils/math.ts'

/** A contact within 2 cm reads as touching; the reach tool uses the same threshold. */
const REACHED = 0.02
const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 }

function presetFrame(id: PosePresetId, overrides: Partial<PoseFrame> = {}): PoseFrame {
  const preset = POSE_PRESET_MAP[id]
  const bones = createZeroRotations()
  for (const [bone, rotation] of Object.entries(preset.bones)) bones[bone as BoneId] = { ...rotation }
  return {
    bones,
    rootOffset: preset.rootOffset ? { ...preset.rootOffset } : { ...ORIGIN },
    characterPosition: { ...ORIGIN },
    characterYaw: 0,
    ...overrides,
  }
}

/** The same group hierarchy Mannequin.tsx renders, without meshes. */
function buildSceneGraph(frame: PoseFrame): Scene {
  const scene = new Scene()
  const character = new Group()
  character.position.set(frame.characterPosition.x, frame.characterPosition.y, frame.characterPosition.z)
  character.rotation.set(0, frame.characterYaw * DEG2RAD, 0)
  scene.add(character)
  const groups = new Map<BoneId, Object3D>()
  for (const bone of BONES) {
    const group = new Group()
    group.userData.boneGroup = bone.id
    const extra = bone.id === ROOT_BONE ? frame.rootOffset : ORIGIN
    group.position.set(bone.offset.x + extra.x, bone.offset.y + extra.y, bone.offset.z + extra.z)
    const r = frame.bones[bone.id]
    group.rotation.set(r.x * DEG2RAD, r.y * DEG2RAD, r.z * DEG2RAD)
    ;(bone.parent ? groups.get(bone.parent)! : character).add(group)
    groups.set(bone.id, group)
  }
  return scene
}

function position(frame: PoseFrame, landmark: string): Vector3 {
  return landmarkPosition(forwardKinematics(frame), landmark)
}

function solve(frame: PoseFrame, goals: IkGoal[]) {
  const chains = resolveChains(goals)
  goals.forEach((goal, index) => assert.equal(checkGoal(goal, chains[index]), null))
  const result = solveIk(frame, goals, chains)
  return { result, solved: { ...frame, bones: result.bones } }
}

function assertWithinLimits(frame: PoseFrame, start: PoseFrame): void {
  for (const [bone, range] of Object.entries(HINGE_LIMITS) as Array<[BoneId, { min: number; max: number }]>) {
    const rotation = frame.bones[bone]
    assert.ok(rotation.x >= range.min - 0.05 && rotation.x <= range.max + 0.05, `${bone}.x ${rotation.x} is outside its hinge range`)
    // A hinge only bends: its twist and sideways angles stay as they were.
    assert.equal(rotation.y, start.bones[bone].y, `${bone}.y changed`)
    assert.equal(rotation.z, start.bones[bone].z, `${bone}.z changed`)
  }
  for (const [bone, limits] of Object.entries(BALL_LIMITS) as Array<[BoneId, Record<'x' | 'y' | 'z', { min: number; max: number }>]>) {
    for (const axis of ['x', 'y', 'z'] as const) {
      const value = frame.bones[bone][axis]
      assert.ok(value >= limits[axis].min - 0.05 && value <= limits[axis].max + 0.05, `${bone}.${axis} ${value} is outside its limit`)
    }
  }
}

describe('forward kinematics', () => {
  test('matches the rendered scene graph for every preset, turned and moved', () => {
    for (const preset of POSE_PRESETS) {
      const frame = presetFrame(preset.id, { characterYaw: 37, characterPosition: { x: 0.4, y: 0.1, z: -0.3 } })
      const measured = measureJoints(buildSceneGraph(frame)).joints
      const worlds = forwardKinematics(frame)
      for (const [id, expected] of Object.entries(measured)) {
        const actual = landmarkPosition(worlds, id)
        const deviation = actual.distanceTo(new Vector3(expected.x, expected.y, expected.z))
        // measureJoints rounds to millimetres.
        assert.ok(deviation < 0.0015, `${preset.id} ${id} is off by ${deviation.toFixed(4)} m`)
      }
    }
  })

  test('puts the soles on the floor when standing at rest', () => {
    const frame = presetFrame('tPose')
    assert.ok(Math.abs(position(frame, 'leftSole').y) < 0.005)
    assert.ok(Math.abs(position(frame, 'rightSole').y) < 0.005)
  })

  test('follows the character yaw: +90 turns the left side to -Z', () => {
    const frame = presetFrame('tPose', { characterYaw: 90 })
    const shoulder = position(frame, 'leftShoulder')
    assert.ok(shoulder.z < -0.1 && Math.abs(shoulder.x) < 0.01)
  })
})

describe('reach (IK)', () => {
  test('puts both hands on the hips with the elbows out and slightly back', () => {
    const start = presetFrame('standing')
    const { result, solved } = solve(start, [
      { effector: 'leftPalm', target: 'pelvis', offset: { x: 0.17, y: 0.02, z: 0 } },
      { effector: 'rightPalm', target: 'pelvis', offset: { x: -0.17, y: 0.02, z: 0 } },
    ])
    for (const goal of result.goals) assert.ok(goal.error <= REACHED, `${goal.effector} missed by ${goal.error} m`)
    const leftElbow = position(solved, 'leftElbow')
    const rightElbow = position(solved, 'rightElbow')
    assert.ok(leftElbow.x > position(solved, 'leftShoulder').x, 'left elbow should point outward')
    assert.ok(rightElbow.x < position(solved, 'rightShoulder').x, 'right elbow should point outward')
    assert.ok(leftElbow.z < 0.05 && rightElbow.z < 0.05, 'elbows should not swing forward')
    assertWithinLimits(solved, start)
  })

  test('brings a hand to the face with the elbow below the shoulder', () => {
    const start = presetFrame('standing')
    const { result, solved } = solve(start, [{ effector: 'rightPalm', target: 'nose', offset: { x: 0, y: 0, z: 0.05 } }])
    assert.ok(result.goals[0].error <= REACHED)
    assert.ok(position(solved, 'rightElbow').y < position(solved, 'rightShoulder').y)
    assertWithinLimits(solved, start)
  })

  test('works in world space when the character is turned', () => {
    const start = presetFrame('standing', { characterYaw: 90 })
    // The character's left is world -Z at yaw 90.
    const { result } = solve(start, [{ effector: 'leftPalm', target: 'pelvis', offset: { x: 0, y: 0.02, z: -0.17 } }])
    assert.ok(result.goals[0].error <= REACHED)
  })

  test('rests an elbow on a knee and a hand under the chin when seated', () => {
    const start = presetFrame('sitting')
    start.bones.chest = { x: 40, y: 0, z: 0 }
    const { result, solved } = solve(start, [
      { effector: 'rightElbow', target: 'rightKnee', offset: { x: 0, y: 0.11, z: 0 }, chain: ['chest', 'rightUpperArm'] },
      { effector: 'rightPalm', target: 'chin', offset: { x: 0, y: -0.03, z: 0 } },
      { effector: 'chin', target: 'rightPalm', offset: { x: 0, y: 0.03, z: 0 } },
    ])
    for (const goal of result.goals) assert.ok(goal.error <= REACHED, `${goal.effector} missed by ${goal.error} m`)
    assertWithinLimits(solved, start)
  })

  test('reports a target out of reach and still points the limb at it', () => {
    const start = presetFrame('standing')
    const target = { x: -0.1, y: 0.85, z: 0.35 }
    const { result, solved } = solve(start, [{ effector: 'rightKnee', target }])
    // The thigh is 0.4 m long; the target is only 0.35 m from the hip.
    assert.ok(result.goals[0].error > REACHED)
    const hip = position(solved, 'rightHip')
    const toKnee = position(solved, 'rightKnee').sub(hip).normalize()
    const toTarget = new Vector3(target.x, target.y, target.z).sub(hip).normalize()
    assert.ok(toKnee.dot(toTarget) > 0.99)
  })

  test('leaves bones outside the chains untouched', () => {
    const start = presetFrame('standing')
    const { result } = solve(start, [{ effector: 'leftPalm', target: 'pelvis', offset: { x: 0.17, y: 0.02, z: 0 } }])
    assert.deepEqual(new Set(result.changed), new Set(['leftUpperArm', 'leftForearm']))
    for (const bone of BONES) {
      if (!result.changed.includes(bone.id)) assert.deepEqual(result.bones[bone.id], start.bones[bone.id], `${bone.id} changed`)
    }
  })
})

describe('reach goal set-up', () => {
  test('later goals skip bones an earlier goal already uses', () => {
    const chains = resolveChains([
      { effector: 'rightElbow', target: 'rightKnee' },
      { effector: 'rightPalm', target: 'chin' },
    ])
    assert.deepEqual(chains, [['rightUpperArm'], ['rightForearm']])
  })

  test('rejects unknown landmarks and bones that cannot move the effector', () => {
    assert.match(checkGoal({ effector: 'leftPinky', target: 'chin' }, ['leftUpperArm']) ?? '', /Unknown effector/)
    assert.match(checkGoal({ effector: 'leftPalm', target: 'nowhere' }, ['leftUpperArm']) ?? '', /Unknown target/)
    assert.match(checkGoal({ effector: 'leftPalm', target: 'chin' }, ['rightUpperArm']) ?? '', /does not move leftPalm/)
    assert.match(checkGoal({ effector: 'pelvis', target: 'chin' }, []) ?? '', /no bones left/)
  })
})
