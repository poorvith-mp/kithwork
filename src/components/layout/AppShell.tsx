import { createContext, useContext, useState, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from '@/components/ui/CommandPalette'

type SidebarState = { collapsed: boolean; toggle: () => void }
const SidebarContext = createContext<SidebarState>({ collapsed: false, toggle: () => {} })
export const useSidebar = () => useContext(SidebarContext)

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('kw-sidebar') === 'collapsed' } catch { return false }
  })

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('kw-sidebar', next ? 'collapsed' : 'expanded') } catch {}
      return next
    })
  }

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <div
        className="flex min-h-screen"
        style={{
          '--sidebar-w': collapsed ? '48px' : '250px',
        } as React.CSSProperties}
      >
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <Outlet />
        </main>
        <MobileNav />
        <CommandPalette />
      </div>
    </SidebarContext.Provider>
  )
}
