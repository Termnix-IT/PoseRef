import { Vector2 } from 'three'
import type { Material, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
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
 * Temporarily removes selection highlights (emissive glow) from mannequin parts
 * so they never end up in the exported image. Returns a restore function.
 */
function suppressHighlights(scene: Scene): () => void {
  const saved: Array<{ material: MeshStandardMaterial; intensity: number }> = []
  scene.traverse((object) => {
    if (!isMesh(object) || !object.userData.boneId) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (hasEmissive(material) && material.emissiveIntensity > 0) {
        saved.push({ material, intensity: material.emissiveIntensity })
        material.emissiveIntensity = 0
      }
    }
  })
  return () => {
    for (const entry of saved) entry.material.emissiveIntensity = entry.intensity
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
  const restoreHighlights = suppressHighlights(scene)

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
    restoreHighlights()
    gl.setPixelRatio(prevPixelRatio)
    gl.setSize(prevSize.x, prevSize.y, false)
    camera.aspect = prevAspect
    camera.updateProjectionMatrix()
  }

  return canvasToBlob(output)
}
