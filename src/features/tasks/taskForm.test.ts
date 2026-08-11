import { describe, expect, it } from 'vitest'

import type { Task } from '@/types/domain'
import { taskFormFromRecord, taskWritePayload } from './taskForm'

const task: Task = {
  id: 'task-1',
  owner_id: 'owner-1',
  project_id: 'project-1',
  parent_task_id: null,
  milestone_id: null,
  task_group_id: null,
  title: 'Prepare proposal',
  description: 'Keep the approved scope intact.',
  status: 'in_progress',
  priority: 'high',
  start_at: '2026-08-11T09:30:00.000Z',
  due_at: '2026-08-12T10:00:00.000Z',
  estimate_minutes: 90,
  position: 1000,
  created_at: '2026-08-10T10:00:00.000Z',
  updated_at: '2026-08-10T10:00:00.000Z',
  deleted_at: null,
}

describe('task form mapping', () => {
  it('preserves the stored description and start time while editing', () => {
    const form = taskFormFromRecord(task)

    expect(form.description).toBe('Keep the approved scope intact.')
    expect(form.start_at).toBe('2026-08-11T09:30')
  })

  it('adds the workspace owner only for a new task', () => {
    const form = taskFormFromRecord(task)

    expect(taskWritePayload(form, 'owner-1', true)).toMatchObject({ owner_id: 'owner-1' })
    expect(taskWritePayload(form, 'owner-1', false)).not.toHaveProperty('owner_id')
  })
})
