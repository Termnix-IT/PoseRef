import { ASPECT_RATIOS, getExportSize } from '../../constants/aspectRatios'
import { UI } from '../../constants/uiText'
import { useAppStore } from '../../store'
import { Section } from '../ui/Section'
import { SegmentedControl } from '../ui/SegmentedControl'

export function AspectRatioPanel() {
  const aspectRatio = useAppStore((state) => state.aspectRatio)
  const exportScale = useAppStore((state) => state.exportScale)
  const setAspectRatio = useAppStore((state) => state.setAspectRatio)
  const size = getExportSize(aspectRatio, exportScale)

  return (
    <Section title={UI.aspect.title} subtitle={aspectRatio}>
      <SegmentedControl options={ASPECT_RATIOS} value={aspectRatio} onChange={setAspectRatio} ariaLabel={UI.aspect.title} />
      <p className="hint hint--mono">{UI.aspect.exportSize(size.width, size.height)}</p>
    </Section>
  )
}
