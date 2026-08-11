import { cors } from '../_shared/cors.ts'
import { requireAal2User } from '../_shared/owner.ts'
import { json, safeError } from '../_shared/responses.ts'
import { accountSessionRequestSchema } from '../_shared/schemas.ts'
import { clientIp, sha256 } from '../_shared/security.ts'

function deviceMetadata(req: Request) {
  return {
    userAgent: (req.headers.get('user-agent') ?? 'Unknown device').slice(0, 300),
    platform: (req.headers.get('sec-ch-ua-platform') ?? '').slice(0, 80),
  }
}

async function safeIpHash(req: Request) {
  const secret = Deno.env.get('SESSION_HASH_SECRET')
  return secret ? await sha256(`${secret}:${clientIp(req)}`) : null
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(origin) })
  }
  if (req.method !== 'POST') return safeError(origin, 405, 'Method not allowed.')

  try {
    const account = await requireAal2User(req)
    const parsed = accountSessionRequestSchema.safeParse(await req.json())
    if (!parsed.success) return safeError(origin, 400, 'Invalid session request.')

    if (parsed.data.action === 'revoke') {
      const { error } = await account.client.rpc('revoke_app_session', {
        p_session_id: parsed.data.sessionId,
      })
      if (error) throw error
      return json(origin, { ok: true })
    }

    if (parsed.data.action === 'revoke-others') {
      const { error } = await account.client.rpc('revoke_other_app_sessions')
      if (error) throw error
      return json(origin, { ok: true })
    }

    const { error: touchError } = await account.client.rpc('touch_app_session', {
      p_device_metadata: deviceMetadata(req),
      p_ip_hash: await safeIpHash(req),
    })
    if (touchError) throw touchError

    const { data, error } = await account.client
      .from('app_sessions')
      .select('id,session_id,device_metadata,last_active_at,revoked_at')
      .order('last_active_at', { ascending: false })
    if (error) throw error

    const sessions = (data ?? []).map((session) => ({
      id: session.id,
      sessionId: session.session_id,
      deviceMetadata: session.device_metadata,
      lastActiveAt: session.last_active_at,
      revokedAt: session.revoked_at,
      current: session.session_id === account.claims.session_id,
    }))
    return json(origin, { ok: true, sessions })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to manage sessions.'
    const status = /session|authenticator/i.test(message) ? 401 : 400
    return safeError(origin, status, message)
  }
})
