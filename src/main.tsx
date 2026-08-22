// SPDX-License-Identifier: AGPL-3.0-or-later

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ApplicationRoot } from '@/app/ApplicationRoot'
import { resolveRuntimeConfiguration } from '@/lib/runtimeConfiguration'
import '@/tailwind.css'

const configuration = resolveRuntimeConfiguration(import.meta.env)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApplicationRoot configuration={configuration} />
  </StrictMode>,
)
