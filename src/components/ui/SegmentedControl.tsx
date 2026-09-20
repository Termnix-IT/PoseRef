export interface SegmentedOption<T extends string> {
  id: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (id: T) => void
  ariaLabel?: string
  /** Narrow variant that sizes to its content, for use in the header. */
  compact?: boolean
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  compact = false,
}: SegmentedControlProps<T>) {
  return (
    <div className={`segmented${compact ? ' segmented--compact' : ''}`} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            className={`segmented__item${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
