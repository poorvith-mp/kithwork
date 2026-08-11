import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { useAuth, listSessions } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  listSessions: vi.fn(),
}))

vi.mock('@/features/auth/AuthProvider', () => ({ useAuth }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
      mfa: {
        enroll: vi.fn(),
        challengeAndVerify: vi.fn(),
        unenroll: vi.fn(),
      },
    },
    rpc: vi.fn(),
    storage: { from: vi.fn() },
  },
}))
vi.mock('@/lib/accountApi', () => ({
  listSessions,
  revokeOtherSessions: vi.fn(),
  revokeSession: vi.fn(),
}))

import { ProfilePage } from './ProfilePage'

describe('ProfilePage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    listSessions.mockResolvedValue({ ok: true, sessions: [] })
    useAuth.mockReturnValue({
      user: { id: 'user-id' },
      aal: 'aal2',
      factors: [
        { id: 'factor-id', status: 'verified', friendly_name: 'Phone authenticator' },
      ],
      profile: {
        userId: 'user-id',
        email: 'person@example.com',
        fullName: 'Person Name',
        phone: null,
        roleTitle: 'Editor',
        timezone: 'UTC',
        bio: null,
        photoPath: null,
        notificationPreferences: { email: true, inApp: true },
      },
      refreshAccess: vi.fn(),
      refreshSecurityState: vi.fn(),
    })
  })

  it('shows every approved profile and security section', async () => {
    render(<MemoryRouter><ProfilePage/></MemoryRouter>)

    for (const name of [
      'Personal details',
      'Notifications',
      'Password',
      'Authenticators',
      'Active sessions',
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
    expect(
      screen.getByRole('button', { name: /sign out other sessions/i }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/no other active sessions/i)).toBeInTheDocument()
  })

  it('explains why the final authenticator cannot be removed', () => {
    render(<MemoryRouter><ProfilePage/></MemoryRouter>)

    expect(screen.getByText(/at least one verified authenticator is required/i))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove phone authenticator/i }))
      .toBeDisabled()
  })
})
