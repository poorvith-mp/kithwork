import { env } from './env'
import { supabase } from './supabase'
import type { ModuleCapability, ModuleKey } from './permissions'

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export type AssignmentInput = {
  entityType: string
  entityId: string
}

export type CollaboratorInviteInput = {
  email: string
  fullName: string
  roleTitle?: string
  permissions: Partial<Record<ModuleKey, ModuleCapability[]>>
  assignments?: AssignmentInput[]
}

export type CollaboratorAccessInput = {
  userId: string
  permissions: Partial<Record<ModuleKey, ModuleCapability[]>>
  assignments: AssignmentInput[]
}

export type CollaboratorStateInput = {
  userId: string
  state: 'active' | 'suspended' | 'revoked'
}

export type SessionSummary = {
  id: string
  sessionId: string
  deviceMetadata: Record<string, unknown>
  lastActiveAt: string
  current: boolean
  revokedAt: string | null
}

type AccountApiResponse = {
  ok: boolean
  error?: string
  collaboratorId?: string
  sessions?: SessionSummary[]
}

async function callAccountApi(
  functionName: 'collaborator-admin' | 'account-sessions',
  action: string,
  payload: Record<string, unknown>,
  fetchImpl: FetchLike,
) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session?.access_token) throw new Error('Your session is unavailable.')

  const response = await fetchImpl(
    `${env.supabaseUrl}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        apikey: env.supabasePublishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...payload }),
    },
  )
  const result = (await response.json()) as AccountApiResponse

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? 'The account request could not be completed.')
  }

  return result
}

export function inviteCollaborator(
  input: CollaboratorInviteInput,
  fetchImpl: FetchLike = fetch,
) {
  return callAccountApi('collaborator-admin', 'invite', { input }, fetchImpl)
}

export function updateCollaboratorAccess(
  input: CollaboratorAccessInput,
  fetchImpl: FetchLike = fetch,
) {
  return callAccountApi(
    'collaborator-admin',
    'update-access',
    { input },
    fetchImpl,
  )
}

export function setCollaboratorState(
  input: CollaboratorStateInput,
  fetchImpl: FetchLike = fetch,
) {
  return callAccountApi(
    'collaborator-admin',
    'set-state',
    { input },
    fetchImpl,
  )
}

export function listSessions(fetchImpl: FetchLike = fetch) {
  return callAccountApi('account-sessions', 'list', {}, fetchImpl)
}

export function revokeSession(sessionId: string, fetchImpl: FetchLike = fetch) {
  return callAccountApi('account-sessions', 'revoke', { sessionId }, fetchImpl)
}

export function revokeOtherSessions(fetchImpl: FetchLike = fetch) {
  return callAccountApi('account-sessions', 'revoke-others', {}, fetchImpl)
}
