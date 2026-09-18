import type { PromptLanguage } from '../types'

/** Base prompt text handed to the image-generation AI together with the exported PNG. */
export const BASE_PROMPTS: Record<PromptLanguage, string> = {
  ja: [
    '添付した3D参考画像の人物のポーズ、カメラアングル、人物配置、画角、構図を参考にしてください。',
    '',
    '3Dモデルそのもののキャラクターデザイン、顔、服装、材質、色は生成画像に反映せず、ポーズと構図情報のみを参考にしてください。',
  ].join('\n'),
  en: [
    'Use the attached 3D reference image only as a reference for the pose, body orientation, camera angle, framing, and composition.',
    '',
    "Do not reproduce the mannequin's character design, face, clothing, colors, or materials. Use only its pose and composition information.",
  ].join('\n'),
}

export const PROMPT_LANGUAGES: Array<{ id: PromptLanguage; label: string; buttonLabel: string }> = [
  { id: 'ja', label: '日本語', buttonLabel: 'Copy Japanese Prompt' },
  { id: 'en', label: 'English', buttonLabel: 'Copy English Prompt' },
]
