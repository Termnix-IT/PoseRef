import { useMemo } from 'react'
import { POSE_PRESET_MAP } from '../../constants/posePresets'
import { PROMPT_LANGUAGES } from '../../constants/prompts'
import { UI } from '../../constants/uiText'
import { useCopyText } from '../../hooks/useCopyText'
import { useAppStore } from '../../store'
import type { PromptLanguage } from '../../types'
import { describeComposition } from '../../utils/composition'
import { buildPrompt, type PromptContext } from '../../utils/promptBuilder'
import { Button } from '../ui/Button'
import { Toggle } from '../ui/Toggle'

/** Bottom panel: generates the prompt text to hand to the image AI along with the PNG. */
export function PromptPanel() {
  const includeDetails = useAppStore((state) => state.includePromptDetails)
  const setIncludeDetails = useAppStore((state) => state.setIncludePromptDetails)
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

  return (
    <section className="prompt-panel" aria-label={UI.prompt.title}>
      <header className="prompt-panel__header">
        <div>
          <h2 className="prompt-panel__title">{UI.prompt.title}</h2>
          <p className="prompt-panel__desc">{UI.prompt.description}</p>
        </div>
        <Toggle label={UI.prompt.appendDetails} checked={includeDetails} onChange={setIncludeDetails} />
      </header>
      <div className="prompt-panel__grid">
        {PROMPT_LANGUAGES.map((language) => (
          <PromptCard
            key={language.id}
            language={language.id}
            title={language.label}
            buttonLabel={language.buttonLabel}
            text={buildPrompt(language.id, includeDetails, context)}
          />
        ))}
      </div>
    </section>
  )
}

interface PromptCardProps {
  language: PromptLanguage
  title: string
  buttonLabel: string
  text: string
}

function PromptCard({ language, title, buttonLabel, text }: PromptCardProps) {
  const { status, copy } = useCopyText()
  const label = status === 'copied' ? UI.prompt.copied : status === 'error' ? UI.prompt.copyFailed : buttonLabel

  return (
    <div className="prompt-card">
      <div className="prompt-card__head">
        <span className="prompt-card__lang">{title}</span>
        <Button size="sm" variant={status === 'copied' ? 'primary' : 'secondary'} onClick={() => void copy(text)}>
          {label}
        </Button>
      </div>
      <textarea
        className="prompt-card__text"
        readOnly
        value={text}
        rows={4}
        lang={language}
        aria-label={UI.prompt.textareaOf(title)}
        onFocus={(event) => event.currentTarget.select()}
      />
    </div>
  )
}
