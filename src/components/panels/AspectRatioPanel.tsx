import { ASPECT_RATIOS, getExportSize } from '../../constants/aspectRatios'
import { useAppStore } from '../../store'
import { Section } from '../ui/Section'
import { SegmentedControl } from '../ui/SegmentedControl'

export function AspectRatioPanel() {
  const aspectRatio = useAppStore((state) => state.aspectRatio)
  const exportScale = useAppStore((state) => state.exportScale)
  const setAspectRatio = useAppStore((state) => state.setAspectRatio)
  const size = getExportSize(aspectRatio, exportScale)

  return (
    <Section title="Aspect Ratio" subtitle={aspectRatio}>
      <SegmentedControl options={ASPECT_RATIOS} value={aspectRatio} onChange={setAspectRatio} ariaLabel="Aspect ratio" />
      <p className="hint hint--mono">
        Export size: {size.width} {'\u00D7'} {size.height} px
      </p>
    </Section>
  )
}
