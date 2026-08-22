import { describe, expect, it, vi } from 'vitest'

import worker from './index'

describe('Cloudflare Worker entrypoint', () => {
  it('serves the built application through the assets binding', async () => {
    const response = new Response('<!doctype html>', { status: 200 })
    const assets = { fetch: vi.fn().mockResolvedValue(response) }

    const result = await worker.fetch(
      new Request('https://kithwork.example/people'),
      { ASSETS: assets },
    )

    expect(result).toBe(response)
    expect(assets.fetch).toHaveBeenCalledOnce()
  })

  it('keeps the cron endpoint idle for the public preview without backend secrets', async () => {
    const assets = { fetch: vi.fn() }
    const response = await worker.fetch(
      new Request('https://kithwork.example/api/process-jobs'),
      { ASSETS: assets },
    )

    expect(response.status).toBe(204)
    expect(assets.fetch).not.toHaveBeenCalled()
  })
})
