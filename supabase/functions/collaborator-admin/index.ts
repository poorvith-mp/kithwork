import { cors } from '../_shared/cors.ts'
import { requireOwner } from '../_shared/owner.ts'
import { json, safeError } from '../_shared/responses.ts'
import { collaboratorAdminRequestSchema } from '../_shared/schemas.ts'
import { serviceClient } from '../_shared/supabase.ts'

const appOrigin = () => {
  const value = Deno.env.get('APP_ORIGIN')?.trim()
  if (!value) throw new Error('APP_ORIGIN is required.')
  return value.replace(/\/$/, '')
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(origin) })
  }
  if (req.method !== 'POST') return safeError(origin, 405, 'Method not allowed.')

  try {
    const owner = await requireOwner(req)
    const parsed = collaboratorAdminRequestSchema.safeParse(await req.json())
    if (!parsed.success) return safeError(origin, 400, 'Invalid collaborator request.')

    if (parsed.data.action === 'update-access') {
      const { error } = await owner.client.rpc('replace_collaborator_access', {
        p_user_id: parsed.data.input.userId,
        p_permissions: parsed.data.input.permissions,
        p_assignments: parsed.data.input.assignments,
      })
      if (error) throw error
      return json(origin, { ok: true })
    }

    if (parsed.data.action === 'set-state') {
      const { error } = await owner.client.rpc('set_collaborator_state', {
        p_user_id: parsed.data.input.userId,
        p_state: parsed.data.input.state,
      })
      if (error) throw error
      return json(origin, { ok: true })
    }

    const service = serviceClient()
    const input = parsed.data.input
    const { data: existingProfile, error: existingError } = await service
      .from('app_profiles')
      .select('user_id')
      .eq('email', input.email)
      .maybeSingle()
    if (existingError) throw existingError
    if (existingProfile) {
      return safeError(origin, 409, 'A Kithwork account already uses this email address.')
    }

    const { data: invite, error: inviteRowError } = await service
      .from('collaborator_invites')
      .insert({
        email: input.email,
        full_name: input.fullName,
        role_title: input.roleTitle ?? null,
        invited_by: owner.user.id,
      })
      .select('id')
      .single()
    if (inviteRowError) throw inviteRowError

    const { data: invited, error: authError } = await service.auth.admin
      .inviteUserByEmail(input.email, {
        redirectTo: `${appOrigin()}/reset-password`,
        data: { full_name: input.fullName, role_title: input.roleTitle ?? null },
      })
    if (authError || !invited.user) {
      await service.from('collaborator_invites').delete().eq('id', invite.id)
      throw authError ?? new Error('The authentication invitation was not created.')
    }

    const collaboratorId = invited.user.id
    const { error: accessError } = await owner.client.rpc(
      'replace_collaborator_access',
      {
        p_user_id: collaboratorId,
        p_permissions: input.permissions,
        p_assignments: input.assignments,
      },
    )
    if (accessError) {
      await service
        .from('app_profiles')
        .update({ account_state: 'suspended' })
        .eq('user_id', collaboratorId)
      throw accessError
    }

    const { error: stateError } = await owner.client.rpc('set_collaborator_state', {
      p_user_id: collaboratorId,
      p_state: 'active',
    })
    if (stateError) throw stateError

    const { error: auditError } = await service.from('audit_events').insert({
      owner_id: owner.user.id,
      actor_id: owner.user.id,
      action: 'invited',
      entity_type: 'collaborator',
      entity_id: collaboratorId,
      metadata: { inviteId: invite.id },
    })
    if (auditError) throw auditError

    return json(origin, { ok: true, collaboratorId }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to manage the collaborator.'
    const status = /session|owner|authenticator/i.test(message) ? 401 : 400
    return safeError(origin, status, message)
  }
})
