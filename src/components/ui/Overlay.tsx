import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Button } from './Button'

export function Drawer({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey) }, [onClose])
  if (!open) return null
  return <div className="drawer-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><aside className="drawer" role="dialog" aria-modal="true" aria-label={title}><div className="row"><h2 className="grow">{title}</h2><Button variant="ghost" iconOnly onClick={onClose} aria-label="Close"><X size={19}/></Button></div>{children}</aside></div>
}

export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey) }, [onClose])
  if (!open) return null
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="row"><h2 className="grow">{title}</h2><Button variant="ghost" iconOnly onClick={onClose} aria-label="Close"><X size={19}/></Button></div>{children}</section></div>
}
