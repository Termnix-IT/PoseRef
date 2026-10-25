import { ASPECT_RATIOS } from '../../constants/aspectRatios'
import { UI } from '../../constants/uiText'
import { useExport } from '../../hooks/useExport'
import { useAppStore } from '../../store'
import type { ExportScale } from '../../types'
import { Button } from '../ui/Button'
import { Section } from '../ui/Section'
import { SegmentedControl } from '../ui/SegmentedControl'

const SCALE_OPTIONS: Array<{ id: '1' | '2'; label: string }> = [
  { id: '1', label: '1024 px' },
  { id: '2', label: '2048 px' },
]

/** Output settings next to the buttons they affect: aspect ratio, base size, save and copy. */
export function ExportPanel() {
  const aspectRatio = useAppStore((state) => state.aspectRatio)
  const setAspectRatio = useAppStore((state) => state.setAspectRatio)
  const exportScale = useAppStore((state) => state.exportScale)
  const setExportScale = useAppStore((state) => state.setExportScale)
  const { status, downloadPng, copyPng, canCopyImage } = useExport()

  const busy = status.kind === 'busy'

  return (
    <Section title={UI.export.title} subtitle={aspectRatio}>
      <SegmentedControl options={ASPECT_RATIOS} value={aspectRatio} onChange={setAspectRatio} ariaLabel={UI.export.aspect} />
      <SegmentedControl
        options={SCALE_OPTIONS}
        value={String(exportScale) as '1' | '2'}
        onChange={(id) => setExportScale(Number(id) as ExportScale)}
        ariaLabel={UI.export.baseSize}
      />
      <div className="button-row">
        <Button variant="primary" onClick={() => void downloadPng()} disabled={busy}>
          {busy && status.action === 'download' ? UI.export.rendering : UI.export.exportPng}
        </Button>
        {canCopyImage ? (
          <Button onClick={() => void copyPng()} disabled={busy} title={UI.export.copyImageTitle}>
            {busy && status.action === 'copy' ? UI.export.rendering : UI.export.copyImage}
          </Button>
        ) : null}
      </div>
      <ExportStatusLine status={status} />
    </Section>
  )
}

function ExportStatusLine({ status }: { status: ReturnType<typeof useExport>['status'] }) {
  const tone = status.kind === 'success' ? ' status--success' : status.kind === 'error' ? ' status--error' : ''
  const message = status.kind === 'success' || status.kind === 'error' ? status.message : ''
  // Always rendered so the line keeps its height and screen readers hear the result.
  return (
    <p className={`status${tone}`} aria-live="polite">
      {message}
    </p>
  )
}
