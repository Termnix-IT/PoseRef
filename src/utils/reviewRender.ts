import { Box3, PerspectiveCamera, Sphere, Vector3 } from 'three'
import type { Object3D, Scene, WebGLRenderer } from 'three'
import { ASPECT_RATIO_MAP } from '../constants/aspectRatios'
import { ROOT_BONE } from '../constants/bones'
import type { AspectRatioId, CameraState, ReviewViewId } from '../types'
import { canvasToBlob, renderSceneCanvas } from './exportPng'
import { DEG2RAD } from './math'

export interface ReviewRenderParams {
  gl: WebGLRenderer
  scene: Scene
  views: ReviewViewId[]
  /** Tile height in pixels. */
  size: number
  camera: CameraState
  aspectRatio: AspectRatioId
  /** Character yaw in degrees; the framed views follow it. */
  characterYaw: number
}

/** A narrow field of view keeps the review views close to orthographic, so angles read true. */
const REVIEW_FOV = 30
const LABEL_HEIGHT = 26
const GAP = 4
const TILE_BACKGROUND = '#9a9a9a'

const VIEW_LABELS: Record<ReviewViewId, string> = {
  current: 'CURRENT (user camera)',
  front: 'FRONT',
  back: 'BACK',
  left: "LEFT SIDE (character's left)",
  right: "RIGHT SIDE (character's right)",
  top: 'TOP (character front = up)',
}

function findRootBone(scene: Scene): Object3D | null {
  let found: Object3D | null = null
  scene.traverse((object) => {
    if (!found && object.userData.boneGroup === ROOT_BONE) found = object
  })
  return found
}

/** World-space bounding sphere of the mannequin, so any pose (lying, crouching) stays in frame. */
function measureCharacter(scene: Scene): Sphere {
  const root = findRootBone(scene)
  const sphere = new Sphere(new Vector3(0, 0.9, 0), 1)
  if (!root) return sphere
  new Box3().setFromObject(root).getBoundingSphere(sphere)
  return sphere
}

function framedCamera(view: Exclude<ReviewViewId, 'current'>, bounds: Sphere, yawDegrees: number): PerspectiveCamera {
  const yaw = yawDegrees * DEG2RAD
  const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw))
  const left = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
  const distance = (bounds.radius / Math.sin((REVIEW_FOV / 2) * DEG2RAD)) * 1.02
  const direction = {
    front: forward,
    back: forward.clone().negate(),
    left,
    right: left.clone().negate(),
    top: new Vector3(0, 1, 0),
  }[view]

  const camera = new PerspectiveCamera(REVIEW_FOV, 1, 0.05, 100)
  // Looking straight down needs an explicit up vector; put the character's front at the top.
  if (view === 'top') camera.up.copy(forward)
  camera.position.copy(bounds.center).addScaledVector(direction, distance)
  camera.lookAt(bounds.center)
  camera.updateMatrixWorld()
  return camera
}

function userCamera(state: CameraState): PerspectiveCamera {
  const camera = new PerspectiveCamera(state.fov, 1, 0.05, 100)
  camera.position.set(state.position.x, state.position.y, state.position.z)
  camera.lookAt(state.target.x, state.target.y, state.target.z)
  camera.updateMatrixWorld()
  return camera
}

/**
 * Renders the requested views next to each other with a label above each, so
 * an agent can check a pose from several sides in a single image. The user's
 * own camera and the on-screen view are left untouched.
 */
export function renderReviewSheet(params: ReviewRenderParams): Promise<Blob> {
  const { gl, scene, views, size } = params
  scene.updateMatrixWorld(true)
  const bounds = measureCharacter(scene)
  const aspect = ASPECT_RATIO_MAP[params.aspectRatio]

  const tiles = views.map((view) => {
    const isCurrent = view === 'current'
    const width = isCurrent ? Math.round((size * aspect.width) / aspect.height) : size
    const camera = isCurrent ? userCamera(params.camera) : framedCamera(view, bounds, params.characterYaw)
    return { view, canvas: renderSceneCanvas({ gl, scene, camera, width, height: size }) }
  })

  const sheet = document.createElement('canvas')
  sheet.width = tiles.reduce((sum, tile) => sum + tile.canvas.width, 0) + GAP * (tiles.length - 1)
  sheet.height = size + LABEL_HEIGHT
  const context = sheet.getContext('2d')
  if (!context) return Promise.reject(new Error('2D canvas is unavailable'))

  context.fillStyle = '#1c2029'
  context.fillRect(0, 0, sheet.width, sheet.height)
  context.font = '600 14px sans-serif'
  context.textBaseline = 'middle'
  let x = 0
  for (const tile of tiles) {
    context.fillStyle = TILE_BACKGROUND
    context.fillRect(x, LABEL_HEIGHT, tile.canvas.width, size)
    context.drawImage(tile.canvas, x, LABEL_HEIGHT)
    context.fillStyle = '#e7e9ee'
    context.fillText(VIEW_LABELS[tile.view], x + 8, LABEL_HEIGHT / 2, tile.canvas.width - 16)
    x += tile.canvas.width + GAP
  }
  return canvasToBlob(sheet)
}
