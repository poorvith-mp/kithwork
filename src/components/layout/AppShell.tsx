import { Outlet } from 'react-router-dom'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
export function AppShell(){return <div className="app-shell"><Sidebar/><main className="app-main"><Topbar/><Outlet/></main><MobileNav/></div>}
