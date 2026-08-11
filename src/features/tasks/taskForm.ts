import type { Task } from '@/types/domain'

export type TaskForm = {
  title: string
  description: string
  project_id: string
  status: string
  priority: string
  start_at: string
  due_at: string
  estimate_minutes: string
  parent_task_id: string
}

export const emptyTaskForm: TaskForm = {
  title: '',
  description: '',
  project_id: '',
  status: 'todo',
  priority: 'normal',
  start_at: '',
  due_at: '',
  estimate_minutes: '',
  parent_task_id: '',
}

function localDateTime(value: string | null) {
  return value?.slice(0, 16) ?? ''
}

export function taskFormFromRecord(task: Task): TaskForm {
  return {
    title: task.title,
    description: task.description ?? '',
    project_id: task.project_id ?? '',
    status: task.status,
    priority: task.priority,
    start_at: localDateTime(task.start_at),
    due_at: localDateTime(task.due_at),
    estimate_minutes: task.estimate_minutes?.toString() ?? '',
    parent_task_id: task.parent_task_id ?? '',
  }
}

export function taskWritePayload(
  form: TaskForm,
  workspaceOwnerId: string,
  includeOwner: boolean,
) {
  return {
    ...(includeOwner ? { owner_id: workspaceOwnerId } : {}),
    ...form,
    project_id: form.project_id || null,
    parent_task_id: form.parent_task_id || null,
    start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
    due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
    estimate_minutes: form.estimate_minutes ? Number(form.estimate_minutes) : null,
  }
}
