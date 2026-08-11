import { createClient } from 'npm:@supabase/supabase-js@2'

type JwtClaims = {
  aal?: string
  session_id?: string
  sub?: string
}

function decodeClaims(token: string): JwtClaims {
  const encoded = token.split('.')[1]
  if (!encoded) throw new Error('Invalid account session')
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return JSON.parse(atob(padded)) as JwtClaims
}

export async function requireAal2User(req: Request) {
  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) throw new Error('Missing account session')
  const token = authorization.slice(7)
  const claims = decodeClaims(token)
  if (claims.aal !== 'aal2') throw new Error('Authenticator verification is required')
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_ANON_KEY')!
  const client = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user || user.id !== claims.sub) throw new Error('Invalid account session')
  return { user, client, claims, token }
}

export async function requireOwner(req: Request) {
  const account = await requireAal2User(req)
  const { data, error } = await account.client.rpc('current_access_snapshot')
  if (error) throw error
  const access = data as { isOwner?: boolean; accountState?: string } | null
  if (!access?.isOwner || access.accountState !== 'active') {
    throw new Error('Owner access required')
  }
  return { ...account, access }
}
