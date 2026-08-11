import type { ComponentType } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

type ShowcaseModule = {
  UnconfiguredShowcase: ComponentType
}

async function loadModule() {
  const modulePath = './UnconfiguredShowcase'
  return import(/* @vite-ignore */ modulePath).catch(() => null) as Promise<ShowcaseModule | null>
}

describe('unconfigured Kithwork showcase', () => {
  it('shows fictional read-only work with one setup action and no inputs', async () => {
    const module = await loadModule()
    expect(module).not.toBeNull()
    if (!module) return

    render(<module.UnconfiguredShowcase />)

    expect(screen.getByRole('heading', { name: 'Kithwork' })).toBeInTheDocument()
    expect(screen.getByText('Fictional workspace')).toBeInTheDocument()
    expect(screen.getAllByText('Northstar Bicycle Co.').length).toBeGreaterThan(0)
    expect(screen.getByText('Operations workspace rollout')).toBeInTheDocument()
    expect(screen.getByText('$8,400 · Proposal')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    const setupLink = screen.getByRole('link', { name: 'Need it?' })
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(setupLink).toHaveAttribute(
      'href',
      'https://github.com/prvthmpcypher/kithwork/blob/main/docs/SETUP.md',
    )
  })
})
