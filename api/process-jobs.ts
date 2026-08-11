// SPDX-License-Identifier: AGPL-3.0-or-later

type ProcessJobsEnvironment = {
  CRON_SECRET?: string
  SUPABASE_URL?: string
}

export async function handleProcessJobs(
  request: Request,
  environment: ProcessJobsEnvironment,
  fetcher: typeof fetch = fetch,
) {
  const startedAt = Date.now()
  const requestId = request.headers.get('x-vercel-id')
  const log = (level: 'info' | 'error', message: string, status: number) => {
    const entry = JSON.stringify({
      level,
      message,
      route: '/api/process-jobs',
      requestId,
      status,
      durationMs: Date.now() - startedAt,
    })
    if (level === 'error') console.error(entry)
    else console.log(entry)
  }

  if (request.method !== 'GET') {
    log('info', 'method_not_allowed', 405)
    return Response.json({ ok: false }, { status: 405 })
  }

  const cronSecret = environment.CRON_SECRET?.trim()
  const supabaseUrl = environment.SUPABASE_URL?.trim().replace(/\/$/, '')
  if (!cronSecret && !supabaseUrl) {
    log('info', 'preview_idle', 204)
    return new Response(null, { status: 204 })
  }
  if (!cronSecret || !supabaseUrl) {
    log('error', 'configuration_unavailable', 503)
    return Response.json({ ok: false }, { status: 503 })
  }

  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    log('info', 'unauthorized', 401)
    return Response.json({ ok: false }, { status: 401 })
  }

  try {
    const response = await fetcher(`${supabaseUrl}/functions/v1/process-jobs`, {
      method: 'POST',
      headers: { 'x-cron-secret': cronSecret },
    })

    if (!response.ok) {
      log('error', 'upstream_rejected', 502)
      return Response.json({ ok: false }, { status: 502 })
    }

    log('info', 'completed', 200)
    return Response.json({ ok: true })
  } catch {
    log('error', 'upstream_unavailable', 502)
    return Response.json({ ok: false }, { status: 502 })
  }
}

export function GET(request: Request) {
  return handleProcessJobs(request, process.env)
}
