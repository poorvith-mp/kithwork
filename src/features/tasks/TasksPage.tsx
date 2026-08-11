import {
  CheckSquare2,
  Clock3,
  List,
  Pause,
  Play,
  Plus,
  Rows3,
  Trash2,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { InputField, SelectField, TextareaField } from '@/components/ui/Field'
import { Drawer } from '@/components/ui/Overlay'
import { Badge, Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRows } from '@/hooks/useRows'
import { insertRow, shortDate, trashRow, updateRow } from '@/lib/data'
import { ownerIdForWrite } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import type { Project, Task } from '@/types/domain'

import {
  emptyTaskForm,
  taskFormFromRecord,
  taskWritePayload,
} from './taskForm'

type TimeEntry = {
  id: string
  task_id: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  source: string
}

const statuses = ['backlog', 'todo', 'in_progress', 'blocked', 'done', 'cancelled']

export function TasksPage() {
  const { access } = useAuth()
  const { data, loading, error, refresh } = useRows<Task>('tasks')
  const { data: projects } = useRows<Project>('projects')
  const { data: entries, refresh: refreshEntries } = useRows<TimeEntry>('time_entries', 'started_at')
  const [view, setView] = useState<'board' | 'list' | 'workload'>('board')
  const [selected, setSelected] = useState<Task | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyTaskForm)
  const grouped = useMemo(
    () => Object.fromEntries(statuses.map((status) => [status, data.filter((task) => task.status === status)])),
    [data],
  )
  const active = entries.find((entry) => !entry.ended_at)

  const edit = (task?: Task) => {
    setSelected(task ?? null)
    setForm(task ? taskFormFromRecord(task) : emptyTaskForm)
    setOpen(true)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const value = taskWritePayload(
      form,
      ownerIdForWrite(access),
      !selected,
    )
    if (selected) await updateRow('tasks', selected.id, value)
    else await insertRow('tasks', value)
    setOpen(false)
    await refresh()
  }

  const timer = async (task?: Task) => {
    const result = active
      ? await supabase.rpc('stop_task_timer')
      : task
        ? await supabase.rpc('start_task_timer', { p_task_id: task.id, p_description: null })
        : null
    if (result && 'error' in result && result.error) alert(result.error.message)
    await refreshEntries()
  }

  const list = (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Project</th><th>Due</th><th>Estimate</th><th></th></tr></thead>
        <tbody>
          {data.map((task) => (
            <tr key={task.id} data-clickable="true" onClick={() => edit(task)}>
              <td><strong>{task.title}</strong></td>
              <td><Badge tone={task.status === 'done' ? 'success' : task.status === 'blocked' ? 'danger' : ''}>{task.status.replace('_', ' ')}</Badge></td>
              <td>{task.priority}</td>
              <td>{projects.find((project) => project.id === task.project_id)?.title || 'Personal'}</td>
              <td>{shortDate(task.due_at)}</td>
              <td>{task.estimate_minutes ? `${task.estimate_minutes} min` : '—'}</td>
              <td>
                <Button
                  variant="ghost"
                  iconOnly
                  aria-label="Move task to Trash"
                  onClick={async (event) => {
                    event.stopPropagation()
                    if (confirm('Move this task to Trash?')) {
                      await trashRow('tasks', task.id)
                      await refresh()
                    }
                  }}
                >
                  <Trash2 size={15} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <main className="page">
      <PageHeader
        eyebrow="Delivery"
        title="Tasks"
        description="Dependencies, deadlines, recurrence, time, and personal workload."
        actions={(
          <>
            <Button variant={active ? 'danger' : 'secondary'} onClick={() => void timer()} disabled={!active}>
              {active ? <><Pause size={16} />Stop timer</> : <><Clock3 size={16} />No active timer</>}
            </Button>
            <Button onClick={() => edit()}><Plus size={17} />New task</Button>
          </>
        )}
      />
      <div className="toolbar">
        <Button variant={view === 'board' ? 'primary' : 'secondary'} onClick={() => setView('board')}><Rows3 size={16} />Board</Button>
        <Button variant={view === 'list' ? 'primary' : 'secondary'} onClick={() => setView('list')}><List size={16} />List</Button>
        <Button variant={view === 'workload' ? 'primary' : 'secondary'} onClick={() => setView('workload')}><Clock3 size={16} />Workload</Button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading ? (
        <div className="empty"><div className="spinner" /></div>
      ) : !data.length ? (
        <Panel><div className="empty"><CheckSquare2 size={40} /><h2>No tasks yet</h2><p>Create project work or a personal operational task.</p></div></Panel>
      ) : view === 'list' ? (
        <Panel>{list}</Panel>
      ) : view === 'board' ? (
        <div className="pipeline-board">
          {statuses.map((status) => (
            <section className="pipeline-column" key={status}>
              <header><strong>{status.replace('_', ' ')}</strong><Badge>{grouped[status]?.length ?? 0}</Badge></header>
              <div className="stack">
                {grouped[status]?.map((task) => (
                  <article className="opportunity-card" key={task.id} onClick={() => edit(task)}>
                    <strong>{task.title}</strong>
                    <small>{projects.find((project) => project.id === task.project_id)?.title || 'Personal'}</small>
                    <small>Due {shortDate(task.due_at)}</small>
                    <div className="row">
                      <Badge tone={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : ''}>{task.priority}</Badge>
                      <Button variant="ghost" iconOnly style={{ marginLeft: 'auto' }} onClick={(event) => { event.stopPropagation(); void timer(task) }} aria-label="Start timer"><Play size={15} /></Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid two">
          <Panel title="Upcoming estimated work">
            {data.filter((task) => task.due_at && task.status !== 'done').sort((a, b) => (a.due_at || '').localeCompare(b.due_at || '')).slice(0, 12).map((task) => (
              <div className="attention-row" key={task.id}><Clock3 size={17} /><div><strong>{task.title}</strong><small>{shortDate(task.due_at)} · {task.estimate_minutes ?? 0} min</small></div></div>
            ))}
          </Panel>
          <Panel title="Recorded time">
            {entries.filter((entry) => entry.ended_at).slice(0, 12).map((entry) => (
              <div className="attention-row" key={entry.id}><CheckSquare2 size={17} /><div><strong>{data.find((task) => task.id === entry.task_id)?.title || 'Unlinked work'}</strong><small>{entry.duration_minutes ?? 0} minutes · {shortDate(entry.started_at)}</small></div></div>
            ))}
          </Panel>
        </div>
      )}

      <Drawer title={selected ? 'Task details' : 'New task'} open={open} onClose={() => setOpen(false)}>
        <form className="stack" onSubmit={save}>
          <InputField label="Task title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          <TextareaField label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <SelectField label="Project" value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })}>
            <option value="">Personal / no project</option>
            {projects.map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}
          </SelectField>
          <div className="grid two">
            <SelectField label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {statuses.map((status) => <option value={status} key={status}>{status.replace('_', ' ')}</option>)}
            </SelectField>
            <SelectField label="Priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </SelectField>
          </div>
          <div className="grid two">
            <InputField label="Starts" type="datetime-local" value={form.start_at} onChange={(event) => setForm({ ...form, start_at: event.target.value })} />
            <InputField label="Due" type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} />
          </div>
          <InputField label="Estimate minutes" type="number" min="0" value={form.estimate_minutes} onChange={(event) => setForm({ ...form, estimate_minutes: event.target.value })} />
          <SelectField label="Parent task" value={form.parent_task_id} onChange={(event) => setForm({ ...form, parent_task_id: event.target.value })}>
            <option value="">None</option>
            {data.filter((task) => task.id !== selected?.id).map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}
          </SelectField>
          <Button>{selected ? 'Save task' : 'Create task'}</Button>
          {selected && <Button type="button" variant="secondary" onClick={() => void timer(selected)}>{active?.task_id === selected.id ? 'Stop timer' : 'Start timer'}</Button>}
        </form>
      </Drawer>
    </main>
  )
}
