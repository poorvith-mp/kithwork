import { describe, expect, it } from 'vitest'

import {
  canAccessModule,
  canPerform,
  ownerIdForWrite,
  type AccessSnapshot,
} from './permissions'

const collaborator: AccessSnapshot = {
  isOwner: false,
  accountState: 'active',
  workspaceOwnerId: 'owner-123',
  permissions: { projects: ['view', 'edit'], inbox: ['view', 'reply'] },
}

describe('permission helpers', () => {
  it('allows granted actions and blocks owner-only modules', () => {
    expect(canPerform(collaborator, 'projects', 'edit')).toBe(true)
    expect(canPerform(collaborator, 'inbox', 'reply')).toBe(true)
    expect(canAccessModule(collaborator, 'reports')).toBe(false)
    expect(
      canAccessModule({ ...collaborator, accountState: 'revoked' }, 'projects'),
    ).toBe(false)
  })

  it('uses the canonical workspace owner for collaborator writes', () => {
    expect(ownerIdForWrite(collaborator)).toBe('owner-123')
  })
})
