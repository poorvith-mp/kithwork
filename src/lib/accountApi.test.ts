import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getSession },
  },
}))

vi.mock('./env', () => ({
  env: {
    supabaseUrl: 'https://project.supabase.co',
    supabasePublishableKey: 'publishable-key',
  },
}))

import {
  inviteCollaborator,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  setCollaboratorState,
  updateCollaboratorAccess,
} from './accountApi'

describe('account API', () => {
  beforeEach(() => {
    getSession.mockResolvedValue({
      data: { session: { access_token: 'aal2-token' } },
      error: null,
    })
  })

  it('never allows the browser to choose invite state or owner status', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({ ok: true, collaboratorId: 'collaborator-id' }),
    )

    await inviteCollaborator(
      {
        email: 'person@example.com',
        fullName: 'Person',
        roleTitle: 'Editor',
        permissions: { projects: ['view'] },
      },
      fetchMock,
    )

    const init = fetchMock.mock.calls[0]?.[1]
    const body = JSON.parse(String(init?.body))

    expect(body.action).toBe('invite')
    expect(body).not.toHaveProperty('isOwner')
    expect(body).not.toHaveProperty('accountState')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer aal2-token' })
  })

  it('uses explicit actions for access, state, and session changes', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({ ok: true, sessions: [] }),
    )

    await updateCollaboratorAccess(
      {
        userId: 'collaborator-id',
        permissions: { inbox: ['view', 'reply'] },
        assignments: [],
      },
      fetchMock,
    )
    await setCollaboratorState(
      { userId: 'collaborator-id', state: 'suspended' },
      fetchMock,
    )
    await listSessions(fetchMock)
    await revokeSession('session-id', fetchMock)
    await revokeOtherSessions(fetchMock)

    expect(
      fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).action),
    ).toEqual([
      'update-access',
      'set-state',
      'list',
      'revoke',
      'revoke-others',
    ])
  })
})
