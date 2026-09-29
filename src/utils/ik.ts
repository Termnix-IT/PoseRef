import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { BALL_LIMITS, BONE_MAP, BONES, HINGE_LIMITS, JOINT_LANDMARK_MAP, ROOT_BONE } from '../constants/bones.ts'
import type { BoneId, BoneRotations, Vec3 } from '../types/index.ts'
import { clamp, DEG2RAD, RAD2DEG, round } from './math.ts'
import { eulerDegreesFromQuaternion } from './rotation.ts'

/** Everything forward kinematics needs; mirrors how Mannequin.tsx builds the scene graph. */
export interface PoseFrame {
  bones: BoneRotations
  rootOffset: Vec3
  characterPosition: Vec3
  /** Degrees around Y. */
  characterYaw: number
}

export interface IkGoal {
  /** Landmark to move (see JOINT_LANDMARKS). */
  effector: string
  /** Landmark or world point (meters) to move it to. */
  target: string | Vec3
  /** World-space offset added to the target, e.g. { y: 0.11 } to rest an elbow on top of a knee. */
  offset?: Vec3
  /** Bones to rotate, root side first. Defaults to the effector's ikChain minus bones claimed by earlier goals. */
  chain?: BoneId[]
}

export interface IkGoalResult {
  effector: string
  chain: BoneId[]
  /** Remaining distance to the target in meters. */
  error: number
}

export interface IkResult {
  bones: BoneRotations
  changed: BoneId[]
  goals: IkGoalResult[]
}

const MAX_PASSES = 60
const TOLERANCE = 0.003
/** Largest rotation a single CCD step may apply; keeps the solve from flipping limbs around. */
const MAX_STEP = 40 * DEG2RAD

const scratchEuler = new Euler(0, 0, 0, 'XYZ')
const X_AXIS = new Vector3(1, 0, 0)
const ONE = new Vector3(1, 1, 1)

function eulerQuaternion(rotation: Vec3): Quaternion {
  scratchEuler.set(rotation.x * DEG2RAD, rotation.y * DEG2RAD, rotation.z * DEG2RAD, 'XYZ')
  return new Quaternion().setFromEuler(scratchEuler)
}

/** World matrix of every bone, in the same order and with the same transforms as the rendered mannequin. */
export function forwardKinematics(frame: PoseFrame): Map<BoneId, Matrix4> {
  const character = new Matrix4().compose(
    new Vector3(frame.characterPosition.x, frame.characterPosition.y, frame.characterPosition.z),
    eulerQuaternion({ x: 0, y: frame.characterYaw, z: 0 }),
    ONE,
  )
  const worlds = new Map<BoneId, Matrix4>()
  // BONES lists parents before children.
  for (const bone of BONES) {
    const offset = bone.id === ROOT_BONE ? frame.rootOffset : { x: 0, y: 0, z: 0 }
    const local = new Matrix4().compose(
      new Vector3(bone.offset.x + offset.x, bone.offset.y + offset.y, bone.offset.z + offset.z),
      eulerQuaternion(frame.bones[bone.id]),
      ONE,
    )
    const parent = bone.parent ? worlds.get(bone.parent)! : character
    worlds.set(bone.id, parent.clone().multiply(local))
  }
  return worlds
}

export function landmarkPosition(worlds: Map<BoneId, Matrix4>, id: string): Vector3 {
  const landmark = JOINT_LANDMARK_MAP[id]
  return new Vector3(landmark.offset.x, landmark.offset.y, landmark.offset.z).applyMatrix4(worlds.get(landmark.bone)!)
}

function isAncestorOrSelf(bone: BoneId, of: BoneId): boolean {
  for (let current: BoneId | null = of; current; current = BONE_MAP[current].parent) {
    if (current === bone) return true
  }
  return false
}

/** Returns an error message when the goal cannot be solved as given, otherwise null. */
export function checkGoal(goal: IkGoal, chain: BoneId[]): string | null {
  const landmark = JOINT_LANDMARK_MAP[goal.effector]
  if (!landmark) return `Unknown effector "${goal.effector}".`
  if (typeof goal.target === 'string' && !JOINT_LANDMARK_MAP[goal.target]) return `Unknown target "${goal.target}".`
  if (chain.length === 0) return `${goal.effector} has no bones left to rotate; pass a chain explicitly.`
  const stray = chain.find((bone) => !isAncestorOrSelf(bone, landmark.bone))
  if (stray) return `${stray} does not move ${goal.effector}; a chain may only contain ${landmark.bone} and its parents.`
  return null
}

function targetPosition(worlds: Map<BoneId, Matrix4>, goal: IkGoal): Vector3 {
  const base =
    typeof goal.target === 'string'
      ? landmarkPosition(worlds, goal.target)
      : new Vector3(goal.target.x, goal.target.y, goal.target.z)
  if (goal.offset) base.add(new Vector3(goal.offset.x, goal.offset.y, goal.offset.z))
  return base
}

function worldQuaternion(matrix: Matrix4): Quaternion {
  const position = new Vector3()
  const quaternion = new Quaternion()
  matrix.decompose(position, quaternion, new Vector3())
  return quaternion
}

function parentQuaternion(worlds: Map<BoneId, Matrix4>, bone: BoneId, frame: PoseFrame): Quaternion {
  const parent = BONE_MAP[bone].parent
  return parent ? worldQuaternion(worlds.get(parent)!) : eulerQuaternion({ x: 0, y: frame.characterYaw, z: 0 })
}

function clampBall(bone: BoneId, rotation: Vec3): Vec3 {
  const limits = BALL_LIMITS[bone]
  if (!limits) return rotation
  return {
    x: clamp(rotation.x, limits.x.min, limits.x.max),
    y: clamp(rotation.y, limits.y.min, limits.y.max),
    z: clamp(rotation.z, limits.z.min, limits.z.max),
  }
}

/** One CCD step: turn `bone` so the effector swings toward the target. */
function stepBone(frame: PoseFrame, bone: BoneId, goal: IkGoal): void {
  const worlds = forwardKinematics(frame)
  const pivot = new Vector3().setFromMatrixPosition(worlds.get(bone)!)
  const toEffector = landmarkPosition(worlds, goal.effector).sub(pivot)
  const toTarget = targetPosition(worlds, goal).sub(pivot)
  if (toEffector.lengthSq() < 1e-8 || toTarget.lengthSq() < 1e-8) return
  const current = frame.bones[bone]
  const hinge = HINGE_LIMITS[bone]

  if (hinge) {
    // Changing the Euler X angle (the outermost rotation) turns the bone about its parent's X axis.
    const axis = X_AXIS.clone().applyQuaternion(parentQuaternion(worlds, bone, frame))
    const from = toEffector.clone().sub(axis.clone().multiplyScalar(toEffector.dot(axis)))
    const to = toTarget.clone().sub(axis.clone().multiplyScalar(toTarget.dot(axis)))
    if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return
    const angle = Math.atan2(axis.dot(from.clone().cross(to)), from.dot(to))
    const limited = clamp(angle, -MAX_STEP, MAX_STEP) * RAD2DEG
    frame.bones[bone] = { ...current, x: clamp(current.x + limited, hinge.min, hinge.max) }
    return
  }

  const delta = new Quaternion().setFromUnitVectors(toEffector.normalize(), toTarget.normalize())
  const angle = 2 * Math.acos(clamp(delta.w, -1, 1))
  if (angle > MAX_STEP) delta.slerp(new Quaternion(), 1 - MAX_STEP / angle)
  const boneWorld = worldQuaternion(worlds.get(bone)!)
  const local = parentQuaternion(worlds, bone, frame).invert().multiply(delta.multiply(boneWorld))
  frame.bones[bone] = clampBall(bone, eulerDegreesFromQuaternion(local, current))
}

/** Rotates `bone` by a world-space rotation, keeping everything else fixed. */
function rotateInWorld(frame: PoseFrame, bone: BoneId, delta: Quaternion): void {
  const worlds = forwardKinematics(frame)
  const boneWorld = worldQuaternion(worlds.get(bone)!)
  const local = parentQuaternion(worlds, bone, frame).invert().multiply(delta.clone().multiply(boneWorld))
  frame.bones[bone] = clampBall(bone, eulerDegreesFromQuaternion(local, frame.bones[bone]))
}

/** Direction the elbow or knee should point when the limb starts out straight. */
function defaultPole(worlds: Map<BoneId, Matrix4>, upper: BoneId, frame: PoseFrame): Vector3 {
  const side = upper.startsWith('left') ? 1 : -1
  const isArm = upper.endsWith('UpperArm')
  // Elbows hang down, a little out and back; knees go forward.
  const local = isArm ? new Vector3(side * 0.6, -1, -0.4) : new Vector3(side * 0.2, 0, 1)
  return local.normalize().applyQuaternion(parentQuaternion(worlds, upper, frame))
}

/**
 * Analytic two-bone step for upper arm + forearm or thigh + lower leg: bend the
 * hinge until the limb is exactly as long as the distance to the target, point
 * the limb at the target, then swivel it about that line so the elbow or knee
 * faces the pole. CCD alone gets stuck here because it never twists the upper
 * bone to line the hinge up with a target off to the side.
 */
function stepTwoBone(frame: PoseFrame, upper: BoneId, hinge: BoneId, goal: IkGoal): void {
  const limits = HINGE_LIMITS[hinge]!
  let worlds = forwardKinematics(frame)
  const shoulder = new Vector3().setFromMatrixPosition(worlds.get(upper)!)
  const target = targetPosition(worlds, goal)
  const wanted = target.distanceTo(shoulder)
  const current = frame.bones[hinge]
  // Keep the bend plane the user or agent already chose; fall back to a natural one for a straight limb.
  const pole =
    Math.abs(current.x) > 15
      ? new Vector3().setFromMatrixPosition(worlds.get(hinge)!).sub(shoulder)
      : defaultPole(worlds, upper, frame)

  const reachAt = (x: number) => {
    frame.bones[hinge] = { ...current, x }
    return landmarkPosition(forwardKinematics(frame), goal.effector).distanceTo(shoulder)
  }
  let bestX = current.x
  let bestMiss = Infinity
  for (let x = limits.min; x <= limits.max; x += 5) {
    const miss = Math.abs(reachAt(x) - wanted)
    if (miss < bestMiss) [bestX, bestMiss] = [x, miss]
  }
  for (let x = bestX - 5; x <= bestX + 5; x += 0.25) {
    const clamped = clamp(x, limits.min, limits.max)
    const miss = Math.abs(reachAt(clamped) - wanted)
    if (miss < bestMiss) [bestX, bestMiss] = [clamped, miss]
  }
  frame.bones[hinge] = { ...current, x: bestX }

  worlds = forwardKinematics(frame)
  const toEffector = landmarkPosition(worlds, goal.effector).sub(shoulder).normalize()
  const toTarget = target.clone().sub(shoulder)
  if (toTarget.lengthSq() < 1e-8) return
  toTarget.normalize()
  rotateInWorld(frame, upper, new Quaternion().setFromUnitVectors(toEffector, toTarget))

  worlds = forwardKinematics(frame)
  const elbow = new Vector3().setFromMatrixPosition(worlds.get(hinge)!).sub(shoulder)
  const along = (v: Vector3) => v.clone().sub(toTarget.clone().multiplyScalar(v.dot(toTarget)))
  const from = along(elbow)
  const to = along(pole)
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return
  const swivel = Math.atan2(toTarget.dot(from.clone().cross(to)), from.dot(to))
  rotateInWorld(frame, upper, new Quaternion().setFromAxisAngle(toTarget, swivel))
}

/**
 * Twists `upper` about its own length (the line from its pivot to the hinge)
 * so the hinge's bend plane swings toward the target. The hinge pivot lies on
 * that line, so an elbow or knee placed by an earlier goal stays where it is;
 * only the forearm or lower leg sweeps around. Without this a hinge-only chain
 * can bend but never aim sideways.
 */
function stepTwist(frame: PoseFrame, upper: BoneId, hinge: BoneId, goal: IkGoal): void {
  const worlds = forwardKinematics(frame)
  const pivot = new Vector3().setFromMatrixPosition(worlds.get(upper)!)
  const joint = new Vector3().setFromMatrixPosition(worlds.get(hinge)!)
  const axis = joint.clone().sub(pivot)
  if (axis.lengthSq() < 1e-8) return
  axis.normalize()
  const across = (point: Vector3) => {
    const offset = point.clone().sub(joint)
    return offset.sub(axis.clone().multiplyScalar(offset.dot(axis)))
  }
  const from = across(landmarkPosition(worlds, goal.effector))
  const to = across(targetPosition(worlds, goal))
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return
  const angle = clamp(Math.atan2(axis.dot(from.clone().cross(to)), from.dot(to)), -MAX_STEP, MAX_STEP)
  rotateInWorld(frame, upper, new Quaternion().setFromAxisAngle(axis, angle))
}

/** Hinges in the chain whose parent bone is not in it: their parent may still twist (see stepTwist). */
function twistableHinges(chain: BoneId[]): Array<[BoneId, BoneId]> {
  return chain
    .filter((bone) => HINGE_LIMITS[bone] && !chain.includes(BONE_MAP[bone].parent!))
    .map((hinge) => [BONE_MAP[hinge].parent!, hinge])
}

/** The [upper, hinge] pair a chain ends with, when the effector sits past the hinge. */
function twoBonePair(chain: BoneId[], effector: string): [BoneId, BoneId] | null {
  if (chain.length < 2) return null
  const [upper, hinge] = chain.slice(-2)
  if (!HINGE_LIMITS[hinge] || BONE_MAP[hinge].parent !== upper) return null
  const landmark = JOINT_LANDMARK_MAP[effector]
  const pastHinge = landmark.bone !== hinge || landmark.offset.x !== 0 || landmark.offset.y !== 0 || landmark.offset.z !== 0
  return isAncestorOrSelf(hinge, landmark.bone) && pastHinge ? [upper, hinge] : null
}

function goalError(frame: PoseFrame, goal: IkGoal): number {
  const worlds = forwardKinematics(frame)
  return landmarkPosition(worlds, goal.effector).distanceTo(targetPosition(worlds, goal))
}

/** Resolves each goal's chain: explicit, or the default chain minus bones earlier goals already use. */
export function resolveChains(goals: IkGoal[]): BoneId[][] {
  const claimed = new Set<BoneId>()
  return goals.map((goal) => {
    const chain = goal.chain ?? (JOINT_LANDMARK_MAP[goal.effector]?.ikChain ?? []).filter((bone) => !claimed.has(bone))
    for (const bone of chain) claimed.add(bone)
    return chain
  })
}

/**
 * Cyclic coordinate descent over all goals. Goals are visited in order on every
 * pass, so an earlier goal is re-satisfied after a later one disturbs it.
 * Returns the new rotations and each goal's remaining error; check the errors,
 * because an out-of-reach target leaves the limb pointing at it but short.
 */
export function solveIk(start: PoseFrame, goals: IkGoal[], chains: BoneId[][]): IkResult {
  const frame: PoseFrame = { ...start, bones: structuredClone(start.bones) }
  const twists = chains.map(twistableHinges)
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    goals.forEach((goal, index) => {
      const pair = twoBonePair(chains[index], goal.effector)
      const rest = pair ? chains[index].slice(0, -2) : chains[index]
      if (pair) stepTwoBone(frame, pair[0], pair[1], goal)
      // CCD walks from the bone nearest the effector toward the root.
      for (const bone of [...rest].reverse()) stepBone(frame, bone, goal)
      for (const [upper, hinge] of twists[index]) stepTwist(frame, upper, hinge, goal)
    })
    if (goals.every((goal) => goalError(frame, goal) < TOLERANCE)) break
  }

  const changed = [...new Set([...chains.flat(), ...twists.flat().map(([upper]) => upper)])]
  for (const bone of changed) {
    const r = frame.bones[bone]
    frame.bones[bone] = { x: round(r.x, 1), y: round(r.y, 1), z: round(r.z, 1) }
  }
  return {
    bones: frame.bones,
    changed,
    goals: goals.map((goal, index) => ({
      effector: goal.effector,
      chain: chains[index],
      error: round(goalError(frame, goal)),
    })),
  }
}
