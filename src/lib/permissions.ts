export type ModuleKey =
  | 'people'
  | 'companies'
  | 'pipeline'
  | 'projects'
  | 'tasks'
  | 'calendar'
  | 'inbox'
  | 'files'
  | 'marketing'
  | 'reports'
  | 'payments'
  | 'settings'
  | 'trash'
  | 'collaborators'

export type ModuleCapability =
  | 'view'
  | 'create'
  | 'edit'
  | 'reply'
  | 'upload'
  | 'move'

export type AccountState = 'invited' | 'active' | 'suspended' | 'revoked'

export type AccessSnapshot = {
  isOwner: boolean
  accountState: AccountState
  workspaceOwnerId: string
  permissions: Partial<Record<ModuleKey, ModuleCapability[]>>
}

export const ownerOnlyModules = new Set<ModuleKey>([
  'marketing',
  'reports',
  'payments',
  'settings',
  'trash',
  'collaborators',
])

export function canPerform(
  access: AccessSnapshot,
  module: ModuleKey,
  action: ModuleCapability,
) {
  if (access.accountState !== 'active') return false
  if (access.isOwner) return true
  if (ownerOnlyModules.has(module)) return false

  return access.permissions[module]?.includes(action) === true
}

export function canAccessModule(access: AccessSnapshot, module: ModuleKey) {
  return canPerform(access, module, 'view')
}

export function ownerIdForWrite(access: AccessSnapshot | null) {
  if (!access || access.accountState !== 'active' || !access.workspaceOwnerId) {
    throw new Error('The workspace owner is unavailable.')
  }

  return access.workspaceOwnerId
}
