import { Box3, Vector3 } from 'three'
import type { Object3D, Scene } from 'three'
import { JOINT_LANDMARKS } from '../constants/bones'
import type { BoneId, JointReport } from '../types'
import { round } from './math'

function collectBoneGroups(scene: Scene): Map<BoneId, Object3D> {
  const groups = new Map<BoneId, Object3D>()
  scene.traverse((object) => {
    const id = object.userData.boneGroup as BoneId | undefined
    if (id) groups.set(id, object)
  })
  return groups
}

/** Bounding box of the mannequin's body parts only; drag handles are left out. */
function bodyBounds(scene: Scene): Box3 {
  const box = new Box3()
  scene.traverse((object) => {
    if (object.userData.boneId && !object.userData.poseHandle) box.expandByObject(object)
  })
  return box
}

/**
 * Reads the world position of every joint landmark from the live scene graph,
 * so the numbers match exactly what is rendered. Used by agents to check that
 * body parts touch and that the body rests on the floor.
 */
export function measureJoints(scene: Scene): JointReport {
  scene.updateMatrixWorld(true)
  const groups = collectBoneGroups(scene)
  const joints: JointReport['joints'] = {}
  const point = new Vector3()
  for (const landmark of JOINT_LANDMARKS) {
    const group = groups.get(landmark.bone)
    if (!group) continue
    point.set(landmark.offset.x, landmark.offset.y, landmark.offset.z)
    group.localToWorld(point)
    joints[landmark.id] = { x: round(point.x), y: round(point.y), z: round(point.z) }
  }
  const bounds = bodyBounds(scene)
  return { joints, lowestY: bounds.isEmpty() ? 0 : round(bounds.min.y) }
}
