import { useCallback, useEffect, useRef, useState } from 'react'
import { UI } from '../../constants/uiText'
import { useDismiss } from '../../hooks/useDismiss'
import { useExport } from '../../hooks/useExport'
import { useAppStore } from '../../store'
import type { ExportScale } from '../../types'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { SegmentedControl } from '../ui/SegmentedControl'

const SCALE_OPTIONS: Array<{ id: '1' | '2'; label: string }> = [
  { id: '1', label: '1024 px' },
  { id: '2', label: '2048 px' },
]

/** The main action of the tool: a menu with the base size, save (Ctrl+S) and copy. Results go to the status bar. */
export function ExportMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const exportScale = useAppStore((state) => state.exportScale)
  const setExportScale = useAppStore((state) => state.setExportScale)
  const showNotice = useAppStore((state) => state.showNotice)
  const { status, downloadPng, copyPng, canCopyImage } = useExport()
  const busy = status.kind === 'busy'
  const close = useCallback(() => setOpen(false), [])
  useDismiss(rootRef, open, close)

  useEffect(() => {
    if (status.kind === 'success') showNotice(status.message, 'success')
    if (status.kind === 'error') showNotice(status.message, 'error')
  }, [status, showNotice])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 's') return
      // Keep the browser's "save page" dialog from opening.
      event.preventDefault()
      void downloadPng()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [downloadPng])

  const run = (action: () => Promise<void>) => {
    setOpen(false)
    void action()
  }

  return (
    <div className="menu" ref={rootRef}>
      <Button size="sm" variant="primary" aria-expanded={open} aria-haspopup="true" disabled={busy} onClick={() => setOpen((value) => !value)}>
        <Icon name="download" size={14} />
        {busy ? UI.export.rendering : UI.export.title}
        <Icon name="chevronDown" size={14} />
      </Button>
      {open ? (
        <div className="menu__panel menu__panel--right" role="dialog" aria-label={UI.export.title}>
          <SegmentedControl
            options={SCALE_OPTIONS}
            value={String(exportScale) as '1' | '2'}
            onChange={(id) => setExportScale(Number(id) as ExportScale)}
            ariaLabel={UI.export.baseSize}
          />
          <Button variant="primary" block onClick={() => run(downloadPng)}>
            {UI.export.exportPng}
            <kbd className="kbd kbd--on-accent">{UI.export.exportShortcut}</kbd>
          </Button>
          {canCopyImage ? (
            <Button block onClick={() => run(copyPng)}>
              {UI.export.copyImage}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
