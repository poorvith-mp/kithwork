import type { ComponentType, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { RuntimeConfiguration } from '@/lib/runtimeConfiguration'

type ApplicationRootModule = {
  ApplicationRoot: ComponentType<{
    configuration: RuntimeConfiguration
    configuredApplication?: ReactNode
  }>
}

async function loadModule() {
  const modulePath = './ApplicationRoot'
  return import(/* @vite-ignore */ modulePath).catch(() => null) as Promise<ApplicationRootModule | null>
}

describe('application root', () => {
  it('renders the showcase instead of the configured application when setup is absent', async () => {
    const module = await loadModule()
    expect(module).not.toBeNull()
    if (!module) return

    render(
      <module.ApplicationRoot
        configuration={{ mode: 'showcase', missing: ['VITE_SUPABASE_URL'] }}
        configuredApplication={<p>Configured workspace</p>}
      />,
    )

    expect(screen.getByText('Fictional workspace')).toBeInTheDocument()
    expect(screen.queryByText('Configured workspace')).not.toBeInTheDocument()
  })

  it('renders the complete application after the operator finishes setup', async () => {
    const module = await loadModule()
    expect(module).not.toBeNull()
    if (!module) return

    render(
      <module.ApplicationRoot
        configuration={{
          mode: 'configured',
          values: {
            supabaseUrl: 'https://operator.supabase.co',
            supabasePublishableKey: 'sb_publishable_operator',
            appOrigin: 'https://kithwork.example',
          },
        }}
        configuredApplication={<p>Configured workspace</p>}
      />,
    )

    expect(screen.getByText('Configured workspace')).toBeInTheDocument()
    expect(screen.queryByText('Fictional workspace')).not.toBeInTheDocument()
  })
})
