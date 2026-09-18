import { useState, type KeyboardEvent } from 'react'
import { round } from '../../utils/math'

export interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Decimals shown while the field is not being edited. */
  decimals?: number
  unit?: string
  ariaLabel?: string
  className?: string
}

/** Numeric text field that keeps a local draft while typing and commits valid numbers. */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  decimals = 2,
  unit,
  ariaLabel,
  className,
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const formatted = String(round(value, decimals))

  const commit = (raw: string) => {
    if (raw.trim() === '') return
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return
    let next = parsed
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    onChange(next)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur()
  }

  return (
    <div className={['number-input', className].filter(Boolean).join(' ')}>
      <input
        type="number"
        inputMode="decimal"
        className="number-input__field"
        value={draft ?? formatted}
        min={min}
        max={max}
        step={step}
        onFocus={() => setDraft(formatted)}
        onChange={(event) => {
          setDraft(event.target.value)
          commit(event.target.value)
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
      />
      {unit ? <span className="number-input__unit">{unit}</span> : null}
    </div>
  )
}
