import type { BoneRotations, Vec3 } from '../types/index.ts'
import { forwardKinematics, landmarkPosition } from './ik.ts'
import { DEG2RAD } from './math.ts'

export type FigureSide = 'left' | 'right' | 'center'

export interface FigureSegment {
  from: [number, number]
  to: [number, number]
  side: FigureSide
}

/** A pose drawn as a stick figure: 2D points in a box whose height is 100 units. */
export interface PoseFigure {
  segments: FigureSegment[]
  head: { center: [number, number]; radius: number }
  width: number
  height: number
}

/** Seen from the character's front-left and a little above, like the default camera, so poses read in depth. */
const VIEW_YAW = 35 * DEG2RAD
const VIEW_PITCH = 12 * DEG2RAD
const HEAD_RADIUS = 0.11
const PADDING = 6

/** Landmark pairs that make up the figure, drawn back to front by depth. */
const CHAINS: Array<[string, string, FigureSide]> = [
  ['pelvis', 'neckBase', 'center'],
  ['neckBase', 'headCenter', 'center'],
  ...(['left', 'right'] as const).flatMap((side) =>
    (
      [
        ['neckBase', `${side}Shoulder`],
        [`${side}Shoulder`, `${side}Elbow`],
        [`${side}Elbow`, `${side}Wrist`],
        [`${side}Wrist`, `${side}Fingertips`],
        ['pelvis', `${side}Hip`],
        [`${side}Hip`, `${side}Knee`],
        [`${side}Knee`, `${side}Ankle`],
        [`${side}Ankle`, `${side}Toe`],
      ] as Array<[string, string]>
    ).map(([from, to]): [string, string, FigureSide] => [from, to, side]),
  ),
]

const RIGHT = { x: Math.cos(VIEW_YAW), y: 0, z: -Math.sin(VIEW_YAW) }
const UP = { x: -Math.sin(VIEW_PITCH) * Math.sin(VIEW_YAW), y: Math.cos(VIEW_PITCH), z: -Math.sin(VIEW_PITCH) * Math.cos(VIEW_YAW) }
const TOWARD_VIEWER = { x: Math.sin(VIEW_YAW), y: 0, z: Math.cos(VIEW_YAW) }

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z

/** Projects a pose with forward kinematics into a stick figure that fits a box 100 units tall. */
export function poseFigure(bones: BoneRotations, rootOffset: Vec3): PoseFigure {
  const worlds = forwardKinematics({ bones, rootOffset, characterPosition: { x: 0, y: 0, z: 0 }, characterYaw: 0 })
  const cache = new Map<string, { x: number; y: number; depth: number }>()
  const project = (id: string) => {
    let point = cache.get(id)
    if (!point) {
      const world = landmarkPosition(worlds, id)
      point = { x: dot(world, RIGHT), y: -dot(world, UP), depth: dot(world, TOWARD_VIEWER) }
      cache.set(id, point)
    }
    return point
  }

  const raw = CHAINS.map(([from, to, side]) => {
    const a = project(from)
    const b = project(to)
    return { a, b, side, depth: (a.depth + b.depth) / 2 }
  }).sort((p, q) => p.depth - q.depth)
  const head = project('headCenter')

  const xs = [...cache.values()].map((p) => p.x).concat(head.x - HEAD_RADIUS, head.x + HEAD_RADIUS)
  const ys = [...cache.values()].map((p) => p.y).concat(head.y - HEAD_RADIUS, head.y + HEAD_RADIUS)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const spanX = Math.max(...xs) - minX
  const spanY = Math.max(...ys) - minY
  // Scale by the larger span so lying and standing poses keep their real proportions.
  const scale = (100 - PADDING * 2) / Math.max(spanX, spanY)
  const map = (p: { x: number; y: number }): [number, number] => [
    PADDING + (p.x - minX) * scale + ((100 - PADDING * 2) - spanX * scale) / 2,
    PADDING + (p.y - minY) * scale + ((100 - PADDING * 2) - spanY * scale) / 2,
  ]

  return {
    segments: raw.map(({ a, b, side }) => ({ from: map(a), to: map(b), side })),
    head: { center: map(head), radius: HEAD_RADIUS * scale },
    width: 100,
    height: 100,
  }
}
