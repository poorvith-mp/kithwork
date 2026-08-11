import { describe, expect, it } from 'vitest'

type RuntimeConfigurationModule = {
  resolveRuntimeConfiguration: (values: Record<string, string | undefined>) =>
    | { mode: 'configured'; values: { supabaseUrl: string; supabasePublishableKey: string; appOrigin: string } }
    | { mode: 'showcase'; missing: string[] }
}

async function loadModule() {
  const modulePath = './runtimeConfiguration'
  return import(/* @vite-ignore */ modulePath).catch(() => null) as Promise<RuntimeConfigurationModule | null>
}

describe('runtime configuration boundary', () => {
  it('uses the read-only showcase when operator-owned variables are missing', async () => {
    const module = await loadModule()
    expect(module).not.toBeNull()
    if (!module) return

    expect(module.resolveRuntimeConfiguration({})).toEqual({
      mode: 'showcase',
      missing: [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_PUBLISHABLE_KEY',
        'VITE_APP_ORIGIN',
      ],
    })
  })

  it('loads the complete app only when every required variable is present', async () => {
    const module = await loadModule()
    expect(module).not.toBeNull()
    if (!module) return

    expect(module.resolveRuntimeConfiguration({
      VITE_SUPABASE_URL: ' https://operator.supabase.co ',
      VITE_SUPABASE_PUBLISHABLE_KEY: ' sb_publishable_operator ',
      VITE_APP_ORIGIN: ' https://kithwork.example ',
    })).toEqual({
      mode: 'configured',
      values: {
        supabaseUrl: 'https://operator.supabase.co',
        supabasePublishableKey: 'sb_publishable_operator',
        appOrigin: 'https://kithwork.example',
      },
    })
  })
})
