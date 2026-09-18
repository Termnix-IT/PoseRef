import { MANNEQUIN_COLORS } from '../../constants/bones'
import { useAppStore } from '../../store'
import { Button } from '../ui/Button'
import { Section } from '../ui/Section'
import { SliderField } from '../ui/SliderField'

const DEGREE = '\u00B0'

export function CharacterPanel() {
  const position = useAppStore((state) => state.character.position)
  const yaw = useAppStore((state) => state.character.yaw)
  const color = useAppStore((state) => state.character.color)
  const setCharacterPosition = useAppStore((state) => state.setCharacterPosition)
  const setCharacterYaw = useAppStore((state) => state.setCharacterYaw)
  const setCharacterColor = useAppStore((state) => state.setCharacterColor)
  const resetCharacter = useAppStore((state) => state.resetCharacter)

  return (
    <Section
      title="Character"
      actions={
        <Button size="sm" variant="ghost" onClick={resetCharacter}>
          Reset
        </Button>
      }
    >
      <div className="control-group">
        <div className="control-group__label">Position</div>
        <SliderField label="X" value={position.x} min={-3} max={3} step={0.01} unit="m" onChange={(v) => setCharacterPosition('x', v)} onReset={() => setCharacterPosition('x', 0)} />
        <SliderField label="Y" value={position.y} min={-1} max={2} step={0.01} unit="m" onChange={(v) => setCharacterPosition('y', v)} onReset={() => setCharacterPosition('y', 0)} />
        <SliderField label="Z" value={position.z} min={-3} max={3} step={0.01} unit="m" onChange={(v) => setCharacterPosition('z', v)} onReset={() => setCharacterPosition('z', 0)} />
      </div>
      <div className="control-group">
        <div className="control-group__label">Rotation</div>
        <SliderField label="Yaw" value={yaw} min={-180} max={180} step={1} decimals={0} unit={DEGREE} onChange={setCharacterYaw} onReset={() => setCharacterYaw(0)} />
      </div>
      <div className="control-group">
        <div className="control-group__label">Color</div>
        <div className="swatches">
          {MANNEQUIN_COLORS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`swatch${color === option.value ? ' is-active' : ''}`}
              style={{ background: option.value }}
              title={option.label}
              aria-label={`${option.label} mannequin color`}
              aria-pressed={color === option.value}
              onClick={() => setCharacterColor(option.value)}
            />
          ))}
        </div>
      </div>
    </Section>
  )
}
