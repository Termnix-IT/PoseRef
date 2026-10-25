import { useId } from 'react'
import { UI } from '../../constants/uiText'
import { NumberInput } from './NumberInput'

export interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  decimals?: number
  disabled?: boolean
  onChange: (value: number) => void
  /** When provided, a small reset button is shown at the end of the row. */
  onReset?: () => void
}

/** One row: short label, slider, editable number and an optional reset button. */
export function SliderField({ label, value, min, max, step = 1, unit, decimals, disabled = false, onChange, onReset }: SliderFieldProps) {
  const id = useId()
  return (
    <div className={`field${disabled ? ' is-disabled' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <NumberInput
        value={value}
        min={min}
        max={max}
        step={step}
        decimals={decimals}
        unit={unit}
        disabled={disabled}
        onChange={onChange}
        ariaLabel={UI.common.valueOf(label)}
      />
      {onReset ? (
        <button
          type="button"
          className="field__reset"
          onClick={onReset}
          disabled={disabled}
          title={UI.common.resetOf(label)}
          aria-label={UI.common.resetOf(label)}
        >
          {'↺'}
        </button>
      ) : (
        <span aria-hidden />
      )}
    </div>
  )
}
