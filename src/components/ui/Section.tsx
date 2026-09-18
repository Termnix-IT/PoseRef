import { useState, type ReactNode } from 'react'

export interface SectionProps {
  title: string
  /** Small mono-spaced text shown next to the title (e.g. active preset). */
  subtitle?: string
  /** Buttons rendered on the right side of the header. */
  actions?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

/** Collapsible sidebar section. */
export function Section({ title, subtitle, actions, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`section${open ? ' is-open' : ''}`}>
      <header className="section__header">
        <button
          type="button"
          className="section__toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span className="section__chevron" aria-hidden>
            {'\u25B8'}
          </span>
          <span className="section__title">{title}</span>
          {subtitle ? <span className="section__subtitle">{subtitle}</span> : null}
        </button>
        {actions ? <div className="section__actions">{actions}</div> : null}
      </header>
      {open ? <div className="section__body">{children}</div> : null}
    </section>
  )
}
