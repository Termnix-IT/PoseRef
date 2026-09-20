import { useMemo, useState } from 'react'
import { POSE_PRESET_MAP } from '../../constants/posePresets'
import { PROMPT_LANGUAGES } from '../../constants/prompts'
import { UI } from '../../constants/uiText'
import { useCopyText } from '../../hooks/useCopyText'
import { useAppStore } from '../../store'
import { describeComposition } from '../../utils/composition'
import { buildPrompt, type PromptContext } from '../../utils/promptBuilder'
import { Button } from '../ui/Button'
import { SegmentedControl } from '../ui/SegmentedControl'
import { Toggle } from '../ui/Toggle'

/**
 * Bottom panel: generates the prompt text to hand to the image AI along with
 * the PNG. One language is shown at a time, and the whole panel collapses to a
 * single bar so the 3D view can take the space when the prompt is not needed.
 * Copying stays available while collapsed.
 */
export function PromptPanel() {
  const [open, setOpen] = useState(true)
  const language = useAppStore((state) => state.promptLanguage)
  const setLanguage = useAppStore((state) => state.setPromptLanguage)
  const includeDetails = useAppStore((state) => state.includePromptDetails)
  const setIncludeDetails = useAppStore((state) => state.setIncludePromptDetails)
  const camera = useAppStore((state) => state.camera)
  const character = useAppStore((state) => state.character)
  const presetId = useAppStore((state) => state.pose.presetId)
  const aspectRatio = useAppStore((state) => state.aspectRatio)
  const { status, copy } = useCopyText()

  const context = useMemo<PromptContext>(() => {
    const preset = presetId === 'custom' ? null : POSE_PRESET_MAP[presetId]
    return {
      poseLabel: preset ? { ja: preset.label, en: preset.labelEn } : { ja: UI.common.custom, en: 'Custom' },
      aspectRatio,
      composition: describeComposition(camera, character),
    }
  }, [presetId, aspectRatio, camera, character])

  const text = useMemo(
    () => buildPrompt(language, includeDetails, context),
    [language, includeDetails, context],
  )

  const languageLabel = PROMPT_LANGUAGES.find((item) => item.id === language)?.label ?? ''
  const copyLabel = status === 'copied' ? UI.prompt.copied : status === 'error' ? UI.prompt.copyFailed : UI.prompt.copy

  return (
    <section className={`prompt-panel${open ? ' is-open' : ''}`} aria-label={UI.prompt.title}>
      <div className="prompt-panel__bar">
        <button
          type="button"
          className="prompt-panel__toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          title={open ? UI.prompt.collapse : UI.prompt.expand}
        >
          <span className="section__chevron" aria-hidden>
            {'▸'}
          </span>
          <h2 className="prompt-panel__title">{UI.prompt.title}</h2>
        </button>
        <div className="prompt-panel__actions">
          <SegmentedControl
            compact
            options={PROMPT_LANGUAGES}
            value={language}
            onChange={setLanguage}
            ariaLabel={UI.prompt.language}
          />
          <Button
            size="sm"
            variant={status === 'copied' ? 'primary' : 'secondary'}
            onClick={() => void copy(text)}
          >
            {copyLabel}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="prompt-panel__body">
          <div className="prompt-panel__meta">
            <p className="prompt-panel__desc">{UI.prompt.description}</p>
            <Toggle label={UI.prompt.appendDetails} checked={includeDetails} onChange={setIncludeDetails} />
          </div>
          <textarea
            className="prompt-panel__text"
            readOnly
            value={text}
            rows={3}
            lang={language}
            aria-label={UI.prompt.textareaOf(languageLabel)}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      ) : null}
    </section>
  )
}
