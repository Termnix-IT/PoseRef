import type { Axis, Vec3 } from '../../types'
import { AXES } from '../../utils/math'
import { NumberInput } from './NumberInput'

export interface VectorFieldsProps {
  label: string
  value: Vec3
  min: number
  max: number
  step?: number
  decimals?: number
  onChange: (axis: Axis, value: number) => void
}

/** Compact X / Y / Z number inputs on a single row. */
export function VectorFields({ label, value, min, max, step = 0.01, decimals = 2, onChange }: VectorFieldsProps) {
  return (
    <div className="vector-row">
      <span className="vector-row__label">{label}</span>
      {AXES.map((axis) => (
        <div key={axis} className="vector-row__axis">
          <span className="vector-row__axis-name">{axis.toUpperCase()}</span>
          <NumberInput
            value={value[axis]}
            min={min}
            max={max}
            step={step}
            decimals={decimals}
            onChange={(next) => onChange(axis, next)}
            ariaLabel={`${label} ${axis.toUpperCase()}`}
          />
        </div>
      ))}
    </div>
  )
}
