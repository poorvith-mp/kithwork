import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  iconOnly?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', iconOnly, className, children, ...props }: Props) {
  return <button className={clsx('button', variant, iconOnly && 'icon', className)} {...props}>{children}</button>
}
