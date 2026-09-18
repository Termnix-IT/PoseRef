import type { CameraState, CharacterState } from '../types'
import { DEG2RAD, RAD2DEG } from './math'

export interface Bilingual {
  ja: string
  en: string
}

export interface CompositionSummary {
  /** Where the camera sits relative to the character facing (front, side, back...). */
  view: Bilingual
  /** Vertical angle (high angle / eye level / low angle). */
  angle: Bilingual
  /** Lens description derived from the FOV. */
  lens: Bilingual
  fov: number
  /** Horizontal camera angle relative to the character facing, in degrees. Positive = camera on the left side of the character. */
  azimuth: number
  /** Vertical camera angle relative to the look-at target, in degrees. */
  elevation: number
}

function describeView(azimuth: number): Bilingual {
  const abs = Math.abs(azimuth)
  const side: Bilingual = azimuth >= 0 ? { ja: '左', en: 'left' } : { ja: '右', en: 'right' }
  if (abs < 22.5) return { ja: '正面', en: 'front view' }
  if (abs < 67.5) {
    return { ja: `${side.ja}前からの斜め`, en: `three-quarter front view from the character's ${side.en}` }
  }
  if (abs < 112.5) return { ja: `${side.ja}側面`, en: `${side.en} side view` }
  if (abs < 157.5) {
    return { ja: `${side.ja}後ろからの斜め`, en: `three-quarter back view from the character's ${side.en}` }
  }
  return { ja: '背面', en: 'back view' }
}

function describeAngle(elevation: number): Bilingual {
  if (elevation > 55) return { ja: '真上に近い俯瞰', en: 'overhead view' }
  if (elevation > 20) return { ja: 'ハイアングル（俯瞰）', en: 'high angle' }
  if (elevation < -35) return { ja: '極端なローアングル（煽り）', en: 'extreme low angle' }
  if (elevation < -8) return { ja: 'ローアングル（煽り）', en: 'low angle' }
  return { ja: 'アイレベル', en: 'eye level' }
}

function describeLens(fov: number): Bilingual {
  if (fov <= 28) return { ja: '望遠レンズ', en: 'telephoto lens' }
  if (fov <= 60) return { ja: '標準レンズ', en: 'standard lens' }
  if (fov <= 90) return { ja: '広角レンズ', en: 'wide-angle lens' }
  return { ja: '超広角レンズ', en: 'ultra wide-angle lens' }
}

/** Summarizes the current camera setup in words usable inside an AI prompt. */
export function describeComposition(camera: CameraState, character: CharacterState): CompositionSummary {
  // Camera offset from the character, expressed in the local frame of the character.
  const dx = camera.position.x - character.position.x
  const dz = camera.position.z - character.position.z
  const yaw = -character.yaw * DEG2RAD
  const localX = dx * Math.cos(yaw) + dz * Math.sin(yaw)
  const localZ = -dx * Math.sin(yaw) + dz * Math.cos(yaw)
  const azimuth = Math.atan2(localX, localZ) * RAD2DEG

  const tx = camera.position.x - camera.target.x
  const ty = camera.position.y - camera.target.y
  const tz = camera.position.z - camera.target.z
  const elevation = Math.atan2(ty, Math.sqrt(tx * tx + tz * tz)) * RAD2DEG

  return {
    view: describeView(azimuth),
    angle: describeAngle(elevation),
    lens: describeLens(camera.fov),
    fov: Math.round(camera.fov),
    azimuth,
    elevation,
  }
}
