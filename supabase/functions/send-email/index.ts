import { cors } from '../_shared/cors.ts'
import { requireOwner } from '../_shared/owner.ts'
import { json, safeError } from '../_shared/responses.ts'

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })
  if (req.method !== 'POST') return safeError(origin, 405, 'Method not allowed.')
  try {
    const { client } = await requireOwner(req)
    const value = await req.json()
    if (typeof value.conversationId !== 'string' || typeof value.body !== 'string' || !value.body.trim()) return safeError(origin, 400, 'Conversation and message are required.')
    const { data, error } = await client.rpc('queue_conversation_reply', { p_conversation_id: value.conversationId, p_body: value.body.trim() })
    if (error) throw error
    return json(origin, { ok: true, message: data }, 202)
  } catch (error) {
    return safeError(origin, 401, error instanceof Error ? error.message : 'Unable to queue the message.')
  }
})
