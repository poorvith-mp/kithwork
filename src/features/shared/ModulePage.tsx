import { Database } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
export function ModulePage({title,description}:{title:string;description:string}){return <main className="page"><header className="page-header"><div><p className="eyebrow">Kithwork</p><h1 className="page-title">{title}</h1><p className="muted">{description}</p></div></header><Panel><div className="empty"><Database size={38}/><h2>No records yet</h2><p>This workspace will populate only from records you create.</p></div></Panel></main>}
