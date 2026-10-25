import { UI } from '../../constants/uiText'
import { useAppStore } from '../../store'
import { normalizeDegrees, orbitFromPositionTarget } from '../../utils/math'

/** Matches the cube size in layout.css (.viewcube). */
const SIZE = 54
const HALF = SIZE / 2
/** How close (degrees) the camera must be to a face's direction for the face to show as current. */
const ALIGNED = 1.5

interface CubeTarget {
  id: string
  label: string
  /** Camera direction relative to the character's facing. */
  yaw: number
  pitch: number
  transform: string
}

/**
 * Faces in the character's frame: the front face is where the character
 * faces. The character's left is screen right when seen from the front, so
 * its face turns right (rotateY(90deg)).
 */
const FACES: CubeTarget[] = [
  { id: 'front', label: UI.viewCube.front, yaw: 0, pitch: 0, transform: `translateZ(${HALF}px)` },
  { id: 'left', label: UI.viewCube.left, yaw: 90, pitch: 0, transform: `rotateY(90deg) translateZ(${HALF}px)` },
  { id: 'back', label: UI.viewCube.back, yaw: 180, pitch: 0, transform: `rotateY(180deg) translateZ(${HALF}px)` },
  { id: 'right', label: UI.viewCube.right, yaw: -90, pitch: 0, transform: `rotateY(-90deg) translateZ(${HALF}px)` },
  { id: 'top', label: UI.viewCube.top, yaw: 0, pitch: 89, transform: `rotateX(90deg) translateZ(${HALF}px)` },
  { id: 'bottom', label: UI.viewCube.bottom, yaw: 0, pitch: -89, transform: `rotateX(-90deg) translateZ(${HALF}px)` },
]

/** Thin strips on the vertical edges give the three-quarter views between two faces. */
const EDGES: CubeTarget[] = [45, 135, -135, -45].map((yaw) => ({
  id: `edge${yaw}`,
  label: UI.viewCube.edge(yaw),
  yaw,
  pitch: 0,
  transform: `rotateY(${yaw}deg) translateZ(${HALF * Math.SQRT2 - 1}px)`,
}))

/**
 * Orientation cube drawn over the 3D view (HTML, so it never appears in the
 * exported PNG). It turns with the camera, shows which side of the character
 * is in view, and snaps the camera to a face or edge when clicked.
 */
export function ViewCube() {
  const camera = useAppStore((state) => state.camera)
  const characterYaw = useAppStore((state) => state.character.yaw)
  const setCameraOrbit = useAppStore((state) => state.setCameraOrbit)

  const orbit = orbitFromPositionTarget(camera.position, camera.target)
  const relativeYaw = normalizeDegrees(orbit.yaw - characterYaw)
  const isCurrent = (target: CubeTarget) =>
    Math.abs(orbit.pitch - target.pitch) < ALIGNED &&
    (Math.abs(target.pitch) > 80 || Math.abs(normalizeDegrees(relativeYaw - target.yaw)) < ALIGNED)

  const renderTarget = (target: CubeTarget, className: string) => (
    <button
      key={target.id}
      type="button"
      className={`${className}${isCurrent(target) ? ' is-current' : ''}`}
      style={{ transform: target.transform }}
      title={target.label}
      aria-label={target.label}
      onClick={() => setCameraOrbit({ yaw: characterYaw + target.yaw, pitch: target.pitch })}
    >
      {className === 'viewcube__face' ? target.label : null}
    </button>
  )

  return (
    <div className="viewcube" role="group" aria-label={UI.viewCube.label}>
      <div
        className="viewcube__cube"
        style={{ transform: `rotateX(${-orbit.pitch}deg) rotateY(${-relativeYaw}deg)` }}
      >
        {FACES.map((face) => renderTarget(face, 'viewcube__face'))}
        {EDGES.map((edge) => renderTarget(edge, 'viewcube__edge'))}
      </div>
    </div>
  )
}
