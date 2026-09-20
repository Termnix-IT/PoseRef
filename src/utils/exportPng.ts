import { Vector2 } from 'three'
import type { Material, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { UI } from '../constants/uiText'

export interface RenderPngParams {
  gl: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  width: number
  height: number
}

function isMesh(object: unknown): object is Mesh {
  return typeof object === 'object' && object !== null && (object as Mesh).isMesh === true
}

function hasEmissive(material: Material): material is MeshStandardMaterial {
  return 'emissiveIntensity' in material
}

/**
 * Temporarily removes everything that belongs to the editing UI rather than the
 * picture: the emissive glow of the selected bone and the joint drag handles.
 * Returns a function that puts the scene back the way it was.
 */
function suppressEditingVisuals(scene: Scene): () => void {
  const savedMaterials: Array<{ material: MeshStandardMaterial; intensity: number }> = []
  const hidden: Object3D[] = []
  scene.traverse((object) => {
    if (object.userData.poseHandle) {
      if (object.visible) {
        object.visible = false
        hidden.push(object)
      }
      return
    }
    if (!isMesh(object) || !object.userData.boneId) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (hasEmissive(material) && material.emissiveIntensity > 0) {
        savedMaterials.push({ material, intensity: material.emissiveIntensity })
        material.emissiveIntensity = 0
      }
    }
  })
  return () => {
    for (const entry of savedMaterials) entry.material.emissiveIntensity = entry.intensity
    for (const object of hidden) object.visible = true
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error(UI.export.encodeFailed))
    }, 'image/png')
  })
}

/**
 * Renders the scene at an explicit pixel size (independent from the on-screen
 * canvas size) and returns the result as a PNG blob. The renderer state is
 * restored synchronously so the interactive view is not affected.
 */
export function renderScenePng({ gl, scene, camera, width, height }: RenderPngParams): Promise<Blob> {
  const prevSize = gl.getSize(new Vector2())
  const prevPixelRatio = gl.getPixelRatio()
  const prevAspect = camera.aspect
  const restoreEditingVisuals = suppressEditingVisuals(scene)

  const output = document.createElement('canvas')
  output.width = width
  output.height = height
  const context = output.getContext('2d')
  if (!context) return Promise.reject(new Error(UI.export.canvasUnavailable))

  try {
    gl.setPixelRatio(1)
    gl.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    gl.render(scene, camera)
    // Copy the freshly rendered frame before the renderer is resized back.
    context.drawImage(gl.domElement, 0, 0, width, height)
  } finally {
    restoreEditingVisuals()
    gl.setPixelRatio(prevPixelRatio)
    gl.setSize(prevSize.x, prevSize.y, false)
    camera.aspect = prevAspect
    camera.updateProjectionMatrix()
  }

  return canvasToBlob(output)
}
