export interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        className="toggle__input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle__track" aria-hidden>
        <span className="toggle__thumb" />
      </span>
      <span className="toggle__label">{label}</span>
    </label>
  )
}
