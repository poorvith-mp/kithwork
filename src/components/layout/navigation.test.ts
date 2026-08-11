import { describe, expect, it } from 'vitest'

import type { AccessSnapshot } from '@/lib/permissions'
import { visibleNavigation } from './navigation'

const collaborator: AccessSnapshot = {
  isOwner: false,
  accountState: 'active',
  workspaceOwnerId: 'owner-1',
  permissions: {
    projects: ['view', 'edit'],
    inbox: ['view', 'reply'],
  },
}

describe('visibleNavigation', () => {
  it('keeps owner-only routes out of collaborator navigation', () => {
    const labels = visibleNavigation(collaborator).flatMap((group) =>
      group.items.map((item) => item.label),
    )

    expect(labels).toContain('Home')
    expect(labels).toContain('Projects')
    expect(labels).toContain('Inbox')
    expect(labels).not.toContain('Marketing')
    expect(labels).not.toContain('Trash')
  })

  it('shows every registered destination to the active owner', () => {
    const owner: AccessSnapshot = {
      isOwner: true,
      accountState: 'active',
      workspaceOwnerId: 'owner-1',
      permissions: {},
    }
    const labels = visibleNavigation(owner).flatMap((group) =>
      group.items.map((item) => item.label),
    )

    expect(labels).toEqual(
      expect.arrayContaining([
        'People',
        'Payments',
        'Collaborators',
      ]),
    )
  })
})
