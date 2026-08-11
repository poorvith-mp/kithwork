import { lazy, Suspense, type ReactNode } from 'react'

import { UnconfiguredShowcase } from '@/features/showcase/UnconfiguredShowcase'
import type { RuntimeConfiguration } from '@/lib/runtimeConfiguration'

const ConfiguredApplication = lazy(() => import('./ConfiguredApplication'))

type Props = {
  configuration: RuntimeConfiguration
  configuredApplication?: ReactNode
}

export function ApplicationRoot({ configuration, configuredApplication }: Props) {
  if (configuration.mode === 'showcase') return <UnconfiguredShowcase />

  return configuredApplication ?? (
    <Suspense fallback={<div className="center-screen"><div className="spinner" aria-label="Opening Kithwork" /></div>}>
      <ConfiguredApplication />
    </Suspense>
  )
}
