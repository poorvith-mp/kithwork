import { supabase } from '@/lib/supabase'
import type { AppProfile, EntityAssignment } from '@/types/domain'

import type {
  AssignmentCandidate,
  CollaboratorAudit,
  CollaboratorRecord,
  PermissionDraft,
} from './types'

type Row = Record<string, unknown> & { id: string }

async function queryRows(
  table: string,
  columns: string,
  softDelete = false,
) {
  let query = supabase.from(table).select(columns).limit(75)
  if (softDelete) query = query.is('deleted_at', null)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Row[]
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function dateLabel(value: unknown) {
  if (typeof value !== 'string') return 'Unscheduled'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export async function loadAssignableRecords(): Promise<AssignmentCandidate[]> {
  const [
    people,
    companies,
    enquiries,
    opportunities,
    projects,
    tasks,
    blockedPeriods,
    slotRequests,
    appointments,
    conversations,
    files,
  ] = await Promise.all([
    queryRows('people', 'id,first_name,last_name,email', true),
    queryRows('companies', 'id,name,industry', true),
    queryRows('enquiries', 'id,subject,category,status', true),
    queryRows('opportunities', 'id,title,stage', true),
    queryRows('projects', 'id,title,status', true),
    queryRows('tasks', 'id,title,status', true),
    queryRows('blocked_periods', 'id,title,start_at'),
    queryRows('slot_requests', 'id,start_at,status,visitor_timezone'),
    queryRows('appointments', 'id,title,start_at,status'),
    queryRows('conversations', 'id,subject,status', true),
    queryRows('files', 'id,original_name,extension', true),
  ])

  return [
    ...people.map((row) => ({
      entityType: 'person',
      entityId: row.id,
      label: `${text(row.first_name, 'Unnamed')} ${text(row.last_name, '')}`.trim(),
      context: text(row.email, 'Person'),
    })),
    ...companies.map((row) => ({
      entityType: 'company',
      entityId: row.id,
      label: text(row.name, 'Unnamed company'),
      context: text(row.industry, 'Company'),
    })),
    ...enquiries.map((row) => ({
      entityType: 'enquiry',
      entityId: row.id,
      label: text(row.subject, `${text(row.category, 'General')} enquiry`),
      context: `Enquiry · ${text(row.status, 'unknown')}`,
    })),
    ...opportunities.map((row) => ({
      entityType: 'opportunity',
      entityId: row.id,
      label: text(row.title, 'Untitled opportunity'),
      context: `Pipeline · ${text(row.stage, 'unknown')}`,
    })),
    ...projects.map((row) => ({
      entityType: 'project',
      entityId: row.id,
      label: text(row.title, 'Untitled project'),
      context: `Project · ${text(row.status, 'unknown')}`,
    })),
    ...tasks.map((row) => ({
      entityType: 'task',
      entityId: row.id,
      label: text(row.title, 'Untitled task'),
      context: `Task · ${text(row.status, 'unknown')}`,
    })),
    ...blockedPeriods.map((row) => ({
      entityType: 'blocked_period',
      entityId: row.id,
      label: text(row.title, 'Unavailable'),
      context: `Blocked period · ${dateLabel(row.start_at)}`,
    })),
    ...slotRequests.map((row) => ({
      entityType: 'slot_request',
      entityId: row.id,
      label: `Slot request · ${dateLabel(row.start_at)}`,
      context: text(row.status, 'pending'),
    })),
    ...appointments.map((row) => ({
      entityType: 'appointment',
      entityId: row.id,
      label: text(row.title, 'Consultation'),
      context: `Appointment · ${dateLabel(row.start_at)}`,
    })),
    ...conversations.map((row) => ({
      entityType: 'conversation',
      entityId: row.id,
      label: text(row.subject, 'Untitled conversation'),
      context: `Conversation · ${text(row.status, 'unknown')}`,
    })),
    ...files.map((row) => ({
      entityType: 'file',
      entityId: row.id,
      label: text(row.original_name, 'Unnamed file'),
      context: `File · ${text(row.extension, '').toUpperCase()}`,
    })),
  ] satisfies AssignmentCandidate[]
}

export async function loadCollaboratorWorkspace() {
  const [profilesResult, permissionsResult, assignmentsResult, auditResult, candidates] =
    await Promise.all([
      supabase
        .from('app_profiles')
        .select('*')
        .eq('is_owner', false)
        .order('created_at', { ascending: false }),
      supabase.from('module_permissions').select('*'),
      supabase.from('record_assignments').select('*'),
      supabase
        .from('audit_events')
        .select('id,actor_id,action,entity_id,metadata,created_at')
        .eq('entity_type', 'collaborator')
        .order('created_at', { ascending: false })
        .limit(60),
      loadAssignableRecords(),
    ])

  const firstError = [profilesResult, permissionsResult, assignmentsResult, auditResult]
    .find((result) => result.error)?.error
  if (firstError) throw firstError

  const permissionsByUser = new Map<string, PermissionDraft>()
  for (const permission of (permissionsResult.data ?? []) as unknown as Array<{
    user_id: string
    module_key: string
    capabilities: PermissionDraft[keyof PermissionDraft]
  }>) {
    const current = permissionsByUser.get(permission.user_id) ?? {}
    current[permission.module_key as keyof PermissionDraft] = permission.capabilities
    permissionsByUser.set(permission.user_id, current)
  }

  const assignmentsByUser = new Map<string, EntityAssignment[]>()
  for (const assignment of (assignmentsResult.data ?? []) as EntityAssignment[]) {
    const current = assignmentsByUser.get(assignment.user_id) ?? []
    current.push(assignment)
    assignmentsByUser.set(assignment.user_id, current)
  }

  const collaborators: CollaboratorRecord[] = ((profilesResult.data ?? []) as AppProfile[])
    .map((profile) => ({
      profile,
      permissions: permissionsByUser.get(profile.user_id) ?? {},
      assignments: assignmentsByUser.get(profile.user_id) ?? [],
    }))

  return {
    collaborators,
    audit: (auditResult.data ?? []) as CollaboratorAudit[],
    candidates,
  }
}
