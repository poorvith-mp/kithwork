import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { Sidebar } from './Sidebar'

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    access: { isOwner: true, accountState: 'active', permissions: {} },
    profile: {
      userId: 'user-1',
      email: 'owner@example.com',
      fullName: 'Demo Owner',
      phone: null,
      roleTitle: null,
      timezone: 'UTC',
      bio: null,
      photoPath: null,
      notificationPreferences: {},
    },
    signOut: vi.fn(),
  }),
}))

describe('Sidebar product identity', () => {
  it('keeps the Kithwork source available inside the signed-in app', () => {
    render(<MemoryRouter><Sidebar/></MemoryRouter>)

    expect(screen.getByText('Kithwork')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Kithwork source' })).toHaveAttribute(
      'href',
      'https://github.com/prvthmpcypher/kithwork',
    )
  })
})
