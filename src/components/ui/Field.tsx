import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const inputStyles = 'w-full rounded-[10px] border border-line-strong bg-surface px-3 py-2.5 text-ink transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15'

type Base = { label: string; error?: string }

export function InputField({ label, error, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={props.id} className="text-sm font-semibold">{label}</label>
      <input className={inputStyles} {...props} />
      {error ? <span className="rounded-[10px] border border-[#ffd5d0] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</span> : null}
    </div>
  )
}

export function SelectField({ label, error, children, ...props }: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={props.id} className="text-sm font-semibold">{label}</label>
      <select className={inputStyles} {...props}>{children}</select>
      {error ? <span className="rounded-[10px] border border-[#ffd5d0] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</span> : null}
    </div>
  )
}

export function TextareaField({ label, error, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={props.id} className="text-sm font-semibold">{label}</label>
      <textarea className={`${inputStyles} min-h-28 resize-y`} {...props} />
      {error ? <span className="rounded-[10px] border border-[#ffd5d0] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</span> : null}
    </div>
  )
}
