import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight, CornerDownLeft } from 'lucide-react'

type CommandItem = {
  id: string
  label: string
  group: string
  href?: string
  icon?: React.ReactNode
  onSelect?: () => void
}

const defaultPages: CommandItem[] = [
  { id: 'home', label: 'Home', group: 'Pages', href: '/' },
  { id: 'people', label: 'People', group: 'Pages', href: '/people' },
  { id: 'companies', label: 'Companies', group: 'Pages', href: '/companies' },
  { id: 'pipeline', label: 'Pipeline', group: 'Pages', href: '/pipeline' },
  { id: 'projects', label: 'Projects', group: 'Pages', href: '/projects' },
  { id: 'tasks', label: 'Tasks', group: 'Pages', href: '/tasks' },
  { id: 'calendar', label: 'Calendar', group: 'Pages', href: '/calendar' },
  { id: 'inbox', label: 'Inbox', group: 'Pages', href: '/inbox' },
  { id: 'files', label: 'Files', group: 'Pages', href: '/files' },
  { id: 'analytics', label: 'Analytics', group: 'Pages', href: '/analytics' },
  { id: 'logs', label: 'Activity Log', group: 'Pages', href: '/logs' },
  { id: 'reports', label: 'Reports', group: 'Pages', href: '/reports' },
  { id: 'marketing', label: 'Marketing', group: 'Pages', href: '/marketing' },
  { id: 'settings', label: 'Settings', group: 'Pages', href: '/settings' },
  { id: 'profile', label: 'Profile', group: 'Pages', href: '/profile' },
  { id: 'notifications', label: 'Notifications', group: 'Pages', href: '/notifications' },
]

export function CommandPalette({ extraItems = [] }: { extraItems?: CommandItem[] }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const allItems = [...defaultPages, ...extraItems]
  const filtered = query.trim()
    ? allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : allItems

  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    ;(acc[item.group] ??= []).push(item)
    return acc
  }, {})

  const flatFiltered = Object.values(groups).flat()

  const selectItem = useCallback(
    (item: CommandItem) => {
      setOpen(false)
      setQuery('')
      if (item.onSelect) item.onSelect()
      else if (item.href) navigate(item.href)
    },
    [navigate],
  )

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (open) {
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, flatFiltered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && flatFiltered[active]) {
      e.preventDefault()
      selectItem(flatFiltered[active])
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-ink/20 pt-[15vh] backdrop-blur-[2px] animate-fade-in"
      onClick={() => { setOpen(false); setQuery('') }}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-line bg-surface shadow-lg animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search size={18} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, people, actions…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
            aria-label="Command palette search"
          />
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[0.6rem] font-bold text-muted/60 sm:inline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {flatFiltered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">No results for "{query}"</p>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="px-4 pt-2 pb-1 text-[0.65rem] font-bold uppercase tracking-widest text-muted">
                  {group}
                </p>
                {items.map((item) => {
                  const idx = flatFiltered.indexOf(item)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectItem(item)}
                      onMouseEnter={() => setActive(idx)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                        idx === active
                          ? 'bg-accent-soft text-accent-strong'
                          : 'text-ink hover:bg-surface-muted'
                      }`}
                    >
                      {item.icon ?? <ArrowRight size={14} className="shrink-0 text-muted" />}
                      <span className="flex-1">{item.label}</span>
                      {idx === active ? <CornerDownLeft size={12} className="text-muted" /> : null}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[0.6rem] text-muted/60">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line px-1 py-px font-bold">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line px-1 py-px font-bold">↵</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line px-1 py-px font-bold">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
