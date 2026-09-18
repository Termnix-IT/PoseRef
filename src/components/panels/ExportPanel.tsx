import { getExportSize } from '../../constants/aspectRatios'
import { BACKGROUND_MAP } from '../../constants/backgrounds'
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

export function ExportPanel() {
  const aspectRatio = useAppStore((state) => state.aspectRatio)
  const background = useAppStore((state) => state.background)
  const exportScale = useAppStore((state) => state.exportScale)
  const setExportScale = useAppStore((state) => state.setExportScale)
  const { status, downloadPng, copyPng, canCopyImage } = useExport()

  const size = getExportSize(aspectRatio, exportScale)
  const busy = status.kind === 'busy'

  return (
    <Section title={UI.export.title}>
      <div className="control-group">
        <div className="control-group__label">{UI.export.baseSize}</div>
        <SegmentedControl
          options={SCALE_OPTIONS}
          value={String(exportScale) as '1' | '2'}
          onChange={(id) => setExportScale(Number(id) as ExportScale)}
          ariaLabel={UI.export.baseSize}
        />
      </div>
      <p className="hint">{UI.export.hint(size.width, size.height, BACKGROUND_MAP[background].label)}</p>
      <Button variant="primary" block onClick={() => void downloadPng()} disabled={busy}>
        {busy && status.action === 'download' ? UI.export.rendering : UI.export.exportPng}
      </Button>
      {canCopyImage ? (
        <Button block onClick={() => void copyPng()} disabled={busy}>
          {busy && status.action === 'copy' ? UI.export.rendering : UI.export.copyImage}
        </Button>
      ) : null}
      <ExportStatusLine status={status} />
    </Section>
  )
}

function ExportStatusLine({ status }: { status: ReturnType<typeof useExport>['status'] }) {
  if (status.kind === 'success') return <p className="status status--success">{status.message}</p>
  if (status.kind === 'error') return <p className="status status--error">{status.message}</p>
  return <p className="status status--muted">{status.kind === 'busy' ? UI.export.renderingHint : ''}</p>
}
