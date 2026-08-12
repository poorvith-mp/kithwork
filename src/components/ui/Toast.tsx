import { type ReactNode, createContext, useCallback, useContext, useState } from 'react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

type ToastItem = {
  id: string
  message: string
  variant: ToastVariant
  duration: number
}

type ToastContextValue = {
  toasts: ToastItem[]
  toast: (message: string, variant?: ToastVariant, duration?: number) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev, { id, message, variant, duration }])
      if (duration > 0) setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  const variantStyles: Record<ToastVariant, string> = {
    success: 'border-accent/30 bg-accent-soft text-accent-strong',
    error: 'border-danger/30 bg-danger-soft text-danger',
    warning: 'border-warning/30 bg-warning-soft text-warning',
    info: 'border-line bg-surface text-ink',
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed right-4 bottom-4 z-[100] flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-md animate-slide-up ${variantStyles[t.variant]}`}
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 text-current/60 hover:text-current transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
