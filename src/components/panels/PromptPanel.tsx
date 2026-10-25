import { useState } from 'react'
import { PROMPT_LANGUAGES } from '../../constants/prompts'
import { UI } from '../../constants/uiText'
import { useCopyText } from '../../hooks/useCopyText'
import { usePromptText } from '../../hooks/usePromptText'
import { useAppStore } from '../../store'
import { Button } from '../ui/Button'
import { SegmentedControl } from '../ui/SegmentedControl'
import { Toggle } from '../ui/Toggle'

/**
 * Bottom panel: generates the prompt text to hand to the image AI along with
 * the PNG. One language is shown at a time, and the whole panel collapses to a
 * single bar so the 3D view can take the space when the prompt is not needed.
 * The options and the copy button live in the bar, so they work while collapsed.
 */
export function PromptPanel() {
  const [open, setOpen] = useState(false)
  const language = useAppStore((state) => state.promptLanguage)
  const setLanguage = useAppStore((state) => state.setPromptLanguage)
  const includeDetails = useAppStore((state) => state.includePromptDetails)
  const setIncludeDetails = useAppStore((state) => state.setIncludePromptDetails)
  const { status, copy } = useCopyText()
  const text = usePromptText()

  const languageLabel = PROMPT_LANGUAGES.find((item) => item.id === language)?.label ?? ''
  const copyLabel = status === 'copied' ? UI.prompt.copied : status === 'error' ? UI.prompt.copyFailed : UI.prompt.copy

  return (
    <section className={`prompt-panel${open ? ' is-open' : ''}`} aria-label={UI.prompt.regionLabel}>
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
          <Toggle
            label={UI.prompt.appendDetails}
            title={UI.prompt.appendDetailsTitle}
            checked={includeDetails}
            onChange={setIncludeDetails}
          />
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
