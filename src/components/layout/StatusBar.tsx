import { useEffect, useState } from 'react'
import { UI } from '../../constants/uiText'
import { useAppStore } from '../../store'

const NOTICE_MS = 3000

/**
 * Bottom strip: on the left, what each key or mouse action does right now
 * (changes with the drag mode and the selection); on the right, the latest
 * result such as a saved PNG, which fades after a few seconds.
 */
export function StatusBar() {
  const poseMode = useAppStore((state) => state.interactionMode === 'pose')
  const hasSelection = useAppStore((state) => state.selectedBone !== null)
  const notice = useAppStore((state) => state.notice)
  const [visibleId, setVisibleId] = useState<number | null>(null)

  useEffect(() => {
    if (!notice) return
    setVisibleId(notice.id)
    const timer = window.setTimeout(() => setVisibleId(null), NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  const hints = UI.status.hints[`${poseMode ? 'pose' : 'camera'}${hasSelection ? 'Selected' : ''}` as const]
  const shown = notice && notice.id === visibleId ? notice : null

  return (
    <footer className="statusbar" aria-label={UI.status.label}>
      <ul className="statusbar__hints">
        {hints.map(([key, action]) => (
          <li key={key}>
            <kbd className="kbd">{key}</kbd>
            {action}
          </li>
        ))}
      </ul>
      <p className={`statusbar__notice${shown ? ` statusbar__notice--${shown.tone}` : ''}`} aria-live="polite">
        {shown?.text ?? ''}
      </p>
    </footer>
  )
}
