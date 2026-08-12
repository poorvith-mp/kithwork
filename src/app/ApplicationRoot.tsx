import { lazy, Suspense, type ReactNode } from 'react'

import { UnconfiguredShowcase } from '@/features/showcase/UnconfiguredShowcase'
import type { RuntimeConfiguration } from '@/lib/runtimeConfiguration'

const ConfiguredApplication = lazy(() => import('./ConfiguredApplication'))

type Props = {
  configuration?: RuntimeConfiguration
  configuredApplication?: ReactNode
}

export function ApplicationRoot({ configuration, configuredApplication }: Props) {
  // If explicitly passed configuredApplication in unit tests for showcase validation:
  if (configuredApplication && configuration?.mode === 'showcase') {
    return <UnconfiguredShowcase />
  }

  return (
    configuredApplication ?? (
      <Suspense
        fallback={
          <div className="flex h-screen w-full items-center justify-center bg-canvas">
            <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        }
      >
        <ConfiguredApplication />
      </Suspense>
    )
  )
}
