import { useMemo } from 'react'
import { POSE_PRESET_MAP } from '../constants/posePresets'
import { UI } from '../constants/uiText'
import { useAppStore } from '../store'
import { describeComposition } from '../utils/composition'
import { buildPrompt, type PromptContext } from '../utils/promptBuilder'

/** The prompt for the image AI in the selected language, rebuilt whenever the scene changes. */
export function usePromptText(): string {
  const language = useAppStore((state) => state.promptLanguage)
  const includeDetails = useAppStore((state) => state.includePromptDetails)
  const camera = useAppStore((state) => state.camera)
  const character = useAppStore((state) => state.character)
  const presetId = useAppStore((state) => state.pose.presetId)
  const aspectRatio = useAppStore((state) => state.aspectRatio)

  const context = useMemo<PromptContext>(() => {
    const preset = presetId === 'custom' ? null : POSE_PRESET_MAP[presetId]
    return {
      poseLabel: preset ? { ja: preset.label, en: preset.labelEn } : { ja: UI.common.custom, en: 'Custom' },
      aspectRatio,
      composition: describeComposition(camera, character),
    }
  }, [presetId, aspectRatio, camera, character])

  return useMemo(() => buildPrompt(language, includeDetails, context), [language, includeDetails, context])
}
