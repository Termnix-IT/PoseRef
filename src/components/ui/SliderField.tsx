import { useId } from 'react'
import { NumberInput } from './NumberInput'

export interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  decimals?: number
  onChange: (value: number) => void
  /** When provided, a small reset button is shown next to the label. */
  onReset?: () => void
}

/** Slider paired with an editable number field. */
export function SliderField({ label, value, min, max, step = 1, unit, decimals, onChange, onReset }: SliderFieldProps) {
  const id = useId()
  return (
    <div className="field">
      <div className="field__head">
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        {onReset ? (
          <button
            type="button"
            className="field__reset"
            onClick={onReset}
            title={`Reset ${label}`}
            aria-label={`Reset ${label}`}
          >
            {'\u21BA'}
          </button>
        ) : null}
      </div>
      <div className="field__controls">
        <input
          id={id}
          type="range"
          className="slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <NumberInput
          value={value}
          min={min}
          max={max}
          step={step}
          decimals={decimals}
          unit={unit}
          onChange={onChange}
          ariaLabel={`${label} value`}
        />
      </div>
    </div>
  )
}
