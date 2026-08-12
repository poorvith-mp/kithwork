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
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable } from '@/components/ui/DataTable'
import { InputField, SelectField, TextareaField } from '@/components/ui/Field'
import { Drawer } from '@/components/ui/Overlay'
import { Panel } from '@/components/ui/Panel'
import { SkeletonTable } from '@/components/ui/Skeleton'
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
  const { data: entries, refresh: refreshEntries } = useRows<TimeEntry>(
    'time_entries',
    'started_at',
  )
  const [view, setView] = useState<'board' | 'list' | 'workload'>('board')
  const [selected, setSelected] = useState<Task | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyTaskForm)

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        statuses.map((status) => [status, data.filter((task) => task.status === status)]),
      ),
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

  const columns: Column<Task>[] = [
    {
      key: 'title',
      label: 'Task',
      sortable: true,
      render: (task) => (
        <div>
          <strong className="font-semibold text-ink">{task.title}</strong>
          {task.description ? (
            <small className="block text-xs text-muted truncate max-w-[240px]">
              {task.description}
            </small>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (task) => {
        const variant =
          task.status === 'done'
            ? 'success'
            : task.status === 'blocked'
              ? 'danger'
              : task.status === 'in_progress'
                ? 'warning'
                : 'default'
        return <Badge variant={variant}>{task.status.replace('_', ' ')}</Badge>
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (task) => {
        const variant =
          task.priority === 'urgent'
            ? 'danger'
            : task.priority === 'high'
              ? 'warning'
              : 'outline'
        return <Badge variant={variant}>{task.priority}</Badge>
      },
    },
    {
      key: 'project',
      label: 'Project',
      render: (task) => (
        <span className="text-muted text-xs">
          {projects.find((p) => p.id === task.project_id)?.title || 'Personal'}
        </span>
      ),
    },
    {
      key: 'due_at',
      label: 'Due',
      sortable: true,
      render: (task) => (
        <span className="text-muted text-xs">{shortDate(task.due_at)}</span>
      ),
    },
    {
      key: 'estimate',
      label: 'Estimate',
      render: (task) => (
        <span className="text-muted text-xs">
          {task.estimate_minutes ? `${task.estimate_minutes} min` : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-10 text-right',
      render: (task) => (
        <Button
          variant="ghost"
          size="sm"
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
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="Delivery"
        title="Tasks"
        description="Dependencies, deadlines, recurrence, time, and personal workload."
        actions={
          <>
            <Button
              variant={active ? 'danger' : 'secondary'}
              size="sm"
              onClick={() => void timer()}
              disabled={!active}
            >
              {active ? (
                <>
                  <Pause size={15} />
                  <span>Stop timer</span>
                </>
              ) : (
                <>
                  <Clock3 size={15} />
                  <span>No active timer</span>
                </>
              )}
            </Button>
            <Button size="sm" onClick={() => edit()}>
              <Plus size={16} />
              <span>New task</span>
            </Button>
          </>
        }
      />

      {/* View Switcher Toolbar */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          size="sm"
          variant={view === 'board' ? 'primary' : 'secondary'}
          onClick={() => setView('board')}
        >
          <Rows3 size={15} />
          <span>Board</span>
        </Button>
        <Button
          size="sm"
          variant={view === 'list' ? 'primary' : 'secondary'}
          onClick={() => setView('list')}
        >
          <List size={15} />
          <span>List</span>
        </Button>
        <Button
          size="sm"
          variant={view === 'workload' ? 'primary' : 'secondary'}
          onClick={() => setView('workload')}
        >
          <Clock3 size={15} />
          <span>Workload</span>
        </Button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-[#ffd5d0] bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : !data.length ? (
        <Panel>
          <div className="flex flex-col items-center py-12 text-center text-muted">
            <CheckSquare2 size={40} className="mb-3 opacity-40 text-accent" />
            <h2 className="text-base font-bold text-ink">No tasks yet</h2>
            <p className="text-sm">Create project work or a personal operational task.</p>
          </div>
        </Panel>
      ) : view === 'list' ? (
        <DataTable
          columns={columns}
          data={data}
          keyField="id"
          searchPlaceholder="Search tasks..."
          searchFields={['title', 'description']}
          onRowClick={edit}
        />
      ) : view === 'board' ? (
        <div className="grid grid-cols-1 gap-3 overflow-x-auto pb-4 sm:grid-cols-2 lg:grid-cols-6 min-w-[768px]">
          {statuses.map((status) => {
            const items = grouped[status] ?? []
            return (
              <div
                key={status}
                className="flex flex-col rounded-xl border border-line bg-surface-muted/60 p-3 min-h-[300px]"
              >
                <header className="mb-3 flex items-center justify-between">
                  <strong className="text-xs font-bold uppercase tracking-wider text-ink">
                    {status.replace('_', ' ')}
                  </strong>
                  <Badge>{items.length}</Badge>
                </header>
                <div className="flex flex-1 flex-col gap-2.5">
                  {items.map((task) => (
                    <article
                      key={task.id}
                      onClick={() => edit(task)}
                      className="cursor-pointer rounded-lg border border-line bg-surface p-3 shadow-card transition-shadow hover:shadow-md"
                    >
                      <strong className="block text-sm font-semibold text-ink leading-tight">
                        {task.title}
                      </strong>
                      <small className="mt-1 block text-xs text-muted">
                        {projects.find((p) => p.id === task.project_id)?.title || 'Personal'}
                      </small>
                      <small className="block text-[0.65rem] text-muted/70">
                        Due: {shortDate(task.due_at)}
                      </small>
                      <div className="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2">
                        <Badge
                          variant={
                            task.priority === 'urgent'
                              ? 'danger'
                              : task.priority === 'high'
                                ? 'warning'
                                : 'default'
                          }
                        >
                          {task.priority}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          onClick={(event) => {
                            event.stopPropagation()
                            void timer(task)
                          }}
                          aria-label="Start timer"
                        >
                          <Play size={14} />
                        </Button>
                      </div>
                    </article>
                  ))}
                  {items.length === 0 ? (
                    <div className="grid flex-1 place-items-center py-6 text-center text-xs text-muted">
                      No tasks
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Upcoming estimated work">
            <div className="flex flex-col divide-y divide-line">
              {data
                .filter((task) => task.due_at && task.status !== 'done')
                .sort((a, b) => (a.due_at || '').localeCompare(b.due_at || ''))
                .slice(0, 12)
                .map((task) => (
                  <div className="flex items-center gap-3 py-3 text-sm" key={task.id}>
                    <Clock3 size={16} className="text-muted" />
                    <div className="flex-1">
                      <strong className="block font-semibold">{task.title}</strong>
                      <small className="text-xs text-muted">
                        {shortDate(task.due_at)} · {task.estimate_minutes ?? 0} min
                      </small>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>
          <Panel title="Recorded time">
            <div className="flex flex-col divide-y divide-line">
              {entries
                .filter((entry) => entry.ended_at)
                .slice(0, 12)
                .map((entry) => (
                  <div className="flex items-center gap-3 py-3 text-sm" key={entry.id}>
                    <CheckSquare2 size={16} className="text-accent" />
                    <div className="flex-1">
                      <strong className="block font-semibold">
                        {data.find((task) => task.id === entry.task_id)?.title || 'Unlinked work'}
                      </strong>
                      <small className="text-xs text-muted">
                        {entry.duration_minutes ?? 0} minutes · {shortDate(entry.started_at)}
                      </small>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>
        </div>
      )}

      {/* Edit Drawer */}
      <Drawer
        title={selected ? 'Task details' : 'New task'}
        open={open}
        onClose={() => setOpen(false)}
      >
        <form className="flex flex-col gap-4" onSubmit={save}>
          <InputField
            label="Task title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
          />
          <TextareaField
            label="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <SelectField
            label="Project"
            value={form.project_id}
            onChange={(event) => setForm({ ...form, project_id: event.target.value })}
          >
            <option value="">Personal / no project</option>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>
                {project.title}
              </option>
            ))}
          </SelectField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              label="Status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {statuses.map((status) => (
                <option value={status} key={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Priority"
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </SelectField>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              label="Starts"
              type="datetime-local"
              value={form.start_at}
              onChange={(event) => setForm({ ...form, start_at: event.target.value })}
            />
            <InputField
              label="Due"
              type="datetime-local"
              value={form.due_at}
              onChange={(event) => setForm({ ...form, due_at: event.target.value })}
            />
          </div>
          <InputField
            label="Estimate minutes"
            type="number"
            min="0"
            value={form.estimate_minutes}
            onChange={(event) => setForm({ ...form, estimate_minutes: event.target.value })}
          />
          <SelectField
            label="Parent task"
            value={form.parent_task_id}
            onChange={(event) => setForm({ ...form, parent_task_id: event.target.value })}
          >
            <option value="">None</option>
            {data
              .filter((task) => task.id !== selected?.id)
              .map((task) => (
                <option value={task.id} key={task.id}>
                  {task.title}
                </option>
              ))}
          </SelectField>
          <Button>{selected ? 'Save task' : 'Create task'}</Button>
          {selected ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void timer(selected)}
            >
              {active?.task_id === selected.id ? 'Stop timer' : 'Start timer'}
            </Button>
          ) : null}
        </form>
      </Drawer>
    </div>
  )
}
