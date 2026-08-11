import type { AppProfile, CollaboratorState, EntityAssignment } from '@/types/domain'
import type { ModuleCapability } from '@/lib/permissions'

export type CollaboratorModule =
  | 'people'
  | 'companies'
  | 'pipeline'
  | 'projects'
  | 'tasks'
  | 'calendar'
  | 'inbox'
  | 'files'

export type PermissionDraft = Partial<
  Record<CollaboratorModule, ModuleCapability[]>
>

export type CollaboratorRecord = {
  profile: AppProfile
  permissions: PermissionDraft
  assignments: EntityAssignment[]
}

export type AssignmentCandidate = {
  entityType: EntityAssignment['entity_type']
  entityId: string
  label: string
  context: string
}

export type CollaboratorAudit = {
  id: string | number
  actor_id: string | null
  action: string
  entity_id: string
  metadata: Record<string, unknown>
  created_at: string
}

export type StateAction = Exclude<CollaboratorState, 'invited'>
