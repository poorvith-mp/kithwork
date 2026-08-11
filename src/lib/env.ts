import { resolveRuntimeConfiguration } from './runtimeConfiguration'

const configuration = resolveRuntimeConfiguration(import.meta.env)

if (configuration.mode !== 'configured') {
  throw new Error(`Kithwork is not configured: ${configuration.missing.join(', ')}`)
}

export const env = configuration.values
