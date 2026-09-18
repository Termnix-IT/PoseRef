import { BASE_PROMPTS } from '../constants/prompts'
import type { AspectRatioId, PromptLanguage } from '../types'
import type { CompositionSummary } from './composition'

export interface PromptContext {
  poseLabel: string
  aspectRatio: AspectRatioId
  composition: CompositionSummary
}

function buildDetails(language: PromptLanguage, context: PromptContext): string {
  const { poseLabel, aspectRatio, composition } = context
  if (language === 'ja') {
    return (
      `【構図情報】ポーズ: ${poseLabel} / ` +
      `カメラ: ${composition.view.ja}・${composition.angle.ja}（FOV ${composition.fov}°・${composition.lens.ja}） / ` +
      `アスペクト比: ${aspectRatio}`
    )
  }
  return (
    `[Composition] Pose: ${poseLabel} / ` +
    `Camera: ${composition.view.en}, ${composition.angle.en} (FOV ${composition.fov}°, ${composition.lens.en}) / ` +
    `Aspect ratio: ${aspectRatio}`
  )
}

/** Builds the prompt text for the given language, optionally appending composition details. */
export function buildPrompt(language: PromptLanguage, includeDetails: boolean, context: PromptContext): string {
  const base = BASE_PROMPTS[language]
  if (!includeDetails) return base
  return `${base}\n\n${buildDetails(language, context)}`
}
