import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { AccessSnapshot } from '@/lib/permissions'

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }))

vi.mock('./AuthProvider', () => ({ useAuth }))

import { ModuleRoute } from './ModuleRoute'

function renderReportsRoute() {
  render(
    <MemoryRouter initialEntries={['/reports']}>
      <Routes>
        <Route path="/" element={<h1>Home</h1>}/>
        <Route element={<ModuleRoute module="reports"/>}>
          <Route path="/reports" element={<h1>Reports</h1>}/>
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ModuleRoute', () => {
  it('redirects an inaccessible direct route to home', () => {
    useAuth.mockReturnValue({
      access: {
        isOwner: false,
        accountState: 'active',
        workspaceOwnerId: 'owner-1',
        permissions: { projects: ['view'] },
      } satisfies AccessSnapshot,
    })

    renderReportsRoute()
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
  })

  it('renders an allowed owner route', () => {
    useAuth.mockReturnValue({
      access: {
        isOwner: true,
        accountState: 'active',
        workspaceOwnerId: 'owner-1',
        permissions: {},
      } satisfies AccessSnapshot,
    })

    renderReportsRoute()
    expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument()
  })
})
