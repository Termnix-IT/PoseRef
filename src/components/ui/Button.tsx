import type { ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  active?: boolean
  block?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  active = false,
  block = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    active ? 'is-active' : null,
    block ? 'btn--block' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <button type={type} className={classes} aria-pressed={active || undefined} {...rest} />
}
