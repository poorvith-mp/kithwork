import { describe, expect, it, vi } from 'vitest'

type ProcessJobsModule = {
  handleProcessJobs: (
    request: Request,
    environment: { CRON_SECRET?: string; SUPABASE_URL?: string },
    fetcher: typeof fetch,
  ) => Promise<Response>
}

async function loadModule() {
  const modulePath = './process-jobs'
  return import(/* @vite-ignore */ modulePath).catch(() => null) as Promise<ProcessJobsModule | null>
}

describe('process-jobs Vercel function', () => {
  it('stays idle on the public frontend preview when no backend is configured', async () => {
    const module = await loadModule()
    expect(module).not.toBeNull()
    if (!module) return

    const fetcher = vi.fn<typeof fetch>()
    const response = await module.handleProcessJobs(
      new Request('https://kithwork.example/api/process-jobs'),
      {},
      fetcher,
    )

    expect(response.status).toBe(204)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects requests without Vercel cron authentication', async () => {
    const module = await loadModule()
    expect(module).not.toBeNull()
    if (!module) return

    const fetcher = vi.fn<typeof fetch>()
    const response = await module.handleProcessJobs(
      new Request('https://kithwork.example/api/process-jobs'),
      {
        CRON_SECRET: 'cron-secret',
        SUPABASE_URL: 'https://demo-project.supabase.co',
      },
      fetcher,
    )

    expect(response.status).toBe(401)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('forwards an authenticated cron run without exposing database credentials', async () => {
    const module = await loadModule()
    expect(module).not.toBeNull()
    if (!module) return

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }))
    const response = await module.handleProcessJobs(
      new Request('https://kithwork.example/api/process-jobs', {
        headers: { authorization: 'Bearer cron-secret' },
      }),
      {
        CRON_SECRET: 'cron-secret',
        SUPABASE_URL: 'https://demo-project.supabase.co',
      },
      fetcher,
    )

    expect(response.status).toBe(200)
    expect(fetcher).toHaveBeenCalledWith(
      'https://demo-project.supabase.co/functions/v1/process-jobs',
      {
        method: 'POST',
        headers: { 'x-cron-secret': 'cron-secret' },
      },
    )
  })
})
