import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Button } from './Button'

export function Drawer({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-60 flex justify-end bg-ink/30 animate-fade-in"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="flex h-full w-full max-w-[560px] flex-col overflow-y-auto bg-surface p-5 shadow-lg animate-slide-in"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-center gap-3">
          <h2 className="flex-1 text-lg font-bold tracking-tight">{title}</h2>
          <Button variant="ghost" iconOnly size="sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        {children}
      </aside>
    </div>
  )
}

export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-70 grid place-items-center bg-ink/35 p-4 animate-fade-in"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="w-full max-w-[560px] max-h-[calc(100vh-36px)] overflow-y-auto rounded-2xl bg-surface p-5 shadow-lg animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-center gap-3">
          <h2 className="flex-1 text-lg font-bold tracking-tight">{title}</h2>
          <Button variant="ghost" iconOnly size="sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        {children}
      </section>
    </div>
  )
}
