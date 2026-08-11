export const requiredRuntimeVariables = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_APP_ORIGIN',
] as const

type RuntimeValues = Record<string, string | undefined>

export type RuntimeConfiguration =
  | {
      mode: 'configured'
      values: {
        supabaseUrl: string
        supabasePublishableKey: string
        appOrigin: string
      }
    }
  | { mode: 'showcase'; missing: string[] }

export function resolveRuntimeConfiguration(values: RuntimeValues): RuntimeConfiguration {
  const normalized = Object.fromEntries(
    requiredRuntimeVariables.map((name) => [name, values[name]?.trim() ?? '']),
  )
  const missing = requiredRuntimeVariables.filter((name) => !normalized[name])

  if (missing.length > 0) return { mode: 'showcase', missing: [...missing] }

  return {
    mode: 'configured',
    values: {
      supabaseUrl: normalized.VITE_SUPABASE_URL!,
      supabasePublishableKey: normalized.VITE_SUPABASE_PUBLISHABLE_KEY!,
      appOrigin: normalized.VITE_APP_ORIGIN!,
    },
  }
}
