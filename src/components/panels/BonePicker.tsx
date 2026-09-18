import { BONE_MAP, BONE_PICKER_CENTER, BONE_PICKER_PAIRS } from '../../constants/bones'
import { UI } from '../../constants/uiText'
import type { BoneId } from '../../types'
import { Button } from '../ui/Button'

export interface BonePickerProps {
  selected: BoneId | null
  onSelect: (bone: BoneId) => void
}

/** Grid of bone buttons: center bones on top, then left / right pairs. */
export function BonePicker({ selected, onSelect }: BonePickerProps) {
  return (
    <div className="bone-picker">
      <div className="bone-picker__center">
        {BONE_PICKER_CENTER.map((id) => (
          <Button key={id} size="sm" active={selected === id} onClick={() => onSelect(id)}>
            {BONE_MAP[id].label}
          </Button>
        ))}
      </div>
      <div className="bone-picker__pair">
        <span />
        <span className="bone-picker__side">{UI.common.left}</span>
        <span className="bone-picker__side">{UI.common.right}</span>
      </div>
      {BONE_PICKER_PAIRS.map((pair) => (
        <div key={pair.label} className="bone-picker__pair">
          <span className="bone-picker__pair-label">{pair.label}</span>
          <Button size="sm" active={selected === pair.left} title={BONE_MAP[pair.left].label} onClick={() => onSelect(pair.left)}>
            {UI.common.left}
          </Button>
          <Button size="sm" active={selected === pair.right} title={BONE_MAP[pair.right].label} onClick={() => onSelect(pair.right)}>
            {UI.common.right}
          </Button>
        </div>
      ))}
    </div>
  )
}
