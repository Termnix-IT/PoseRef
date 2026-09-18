import { BACKGROUNDS, BACKGROUND_MAP } from '../../constants/backgrounds'
import { useAppStore } from '../../store'
import { Section } from '../ui/Section'
import { SegmentedControl } from '../ui/SegmentedControl'
import { Toggle } from '../ui/Toggle'

export function BackgroundPanel() {
  const background = useAppStore((state) => state.background)
  const showGrid = useAppStore((state) => state.showGrid)
  const showShadow = useAppStore((state) => state.showShadow)
  const setBackground = useAppStore((state) => state.setBackground)
  const setShowGrid = useAppStore((state) => state.setShowGrid)
  const setShowShadow = useAppStore((state) => state.setShowShadow)

  return (
    <Section title="Background" subtitle={BACKGROUND_MAP[background].label}>
      <SegmentedControl options={BACKGROUNDS} value={background} onChange={setBackground} ariaLabel="Background" />
      <div className="toggle-row">
        <Toggle label="Floor grid" checked={showGrid} onChange={setShowGrid} />
        <Toggle label="Ground shadow" checked={showShadow} onChange={setShowShadow} />
      </div>
    </Section>
  )
}
