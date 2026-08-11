import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

type Base = { label: string; error?: string }
export function InputField({ label, error, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  return <div className="field"><label htmlFor={props.id}>{label}</label><input className="input" {...props}/>{error && <span className="error-box">{error}</span>}</div>
}
export function SelectField({ label, error, children, ...props }: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  return <div className="field"><label htmlFor={props.id}>{label}</label><select className="select" {...props}>{children}</select>{error && <span className="error-box">{error}</span>}</div>
}
export function TextareaField({ label, error, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <div className="field"><label htmlFor={props.id}>{label}</label><textarea className="textarea" {...props}/>{error && <span className="error-box">{error}</span>}</div>
}
