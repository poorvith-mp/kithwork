import { handleProcessJobs } from '../../api/process-jobs'

type AssetsBinding = {
  fetch(request: Request): Promise<Response>
}

export type WorkerEnvironment = {
  ASSETS: AssetsBinding
  CRON_SECRET?: string
  SUPABASE_URL?: string
}

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void
}

const worker = {
  async fetch(request: Request, environment: WorkerEnvironment) {
    const url = new URL(request.url)
    if (url.pathname === '/api/process-jobs') {
      return handleProcessJobs(request, environment)
    }

    return environment.ASSETS.fetch(request)
  },

  scheduled(
    _controller: unknown,
    environment: WorkerEnvironment,
    context: ExecutionContext,
  ) {
    const headers = new Headers()
    if (environment.CRON_SECRET) {
      headers.set('authorization', `Bearer ${environment.CRON_SECRET}`)
    }

    context.waitUntil(
      handleProcessJobs(
        new Request('https://kithwork.invalid/api/process-jobs', { headers }),
        environment,
      ),
    )
  },
}

export default worker
