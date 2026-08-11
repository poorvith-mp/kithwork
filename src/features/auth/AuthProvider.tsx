import type { Factor, Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { AccessSnapshot } from '@/lib/permissions'
import { ownerIdForWrite } from '@/lib/permissions'
import { setCanonicalWorkspaceOwnerId } from '@/lib/data'
import { listSessions } from '@/lib/accountApi'
import { supabase } from '@/lib/supabase'

type Assurance = 'aal1' | 'aal2' | null

export type ProfileSnapshot = {
  userId: string
  email: string
  fullName: string
  phone: string | null
  roleTitle: string | null
  timezone: string
  bio: string | null
  photoPath: string | null
  notificationPreferences: Record<string, boolean>
}

type AccessResponse = AccessSnapshot & { profile: ProfileSnapshot }

type AuthState = {
  user: User | null
  session: Session | null
  aal: Assurance
  factors: Factor[]
  profile: ProfileSnapshot | null
  access: AccessSnapshot | null
  accountError: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshAccess: () => Promise<string | null>
  refreshSecurityState: () => Promise<string | null>
}

const AuthContext = createContext<AuthState | null>(null)
const unavailableMessage = 'This Kithwork account is unavailable.'

function isAccessResponse(value: unknown): value is AccessResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AccessResponse>
  return Boolean(
    typeof candidate.isOwner === 'boolean'
      && typeof candidate.accountState === 'string'
      && typeof candidate.workspaceOwnerId === 'string'
      && candidate.permissions
      && typeof candidate.permissions === 'object'
      && candidate.profile
      && typeof candidate.profile === 'object'
      && typeof candidate.profile.userId === 'string',
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [aal, setAal] = useState<Assurance>(null)
  const [factors, setFactors] = useState<Factor[]>([])
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null)
  const [access, setAccess] = useState<AccessSnapshot | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const clearAccountState = useCallback(() => {
    setCanonicalWorkspaceOwnerId(null)
    setSession(null)
    setUser(null)
    setAal(null)
    setFactors([])
    setProfile(null)
    setAccess(null)
  }, [])

  const refreshAccess = useCallback(async () => {
    const { data, error } = await supabase.rpc('current_access_snapshot')
    if (error || !isAccessResponse(data) || data.accountState !== 'active') {
      setCanonicalWorkspaceOwnerId(null)
      setProfile(null)
      setAccess(null)
      setAccountError(unavailableMessage)
      return unavailableMessage
    }

    const { profile: nextProfile, ...nextAccess } = data
    setCanonicalWorkspaceOwnerId(ownerIdForWrite(nextAccess))
    setProfile(nextProfile)
    setAccess(nextAccess)
    setAccountError(null)
    return null
  }, [])

  const refreshSecurityState = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: sessionData }, { data: aalData }, { data: factorData }] =
        await Promise.all([
          supabase.auth.getSession(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors(),
        ])
      const nextSession = sessionData.session
      const nextAal = (aalData?.currentLevel as Assurance) ?? null

      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setAal(nextAal)
      setFactors([...(factorData?.totp ?? []), ...(factorData?.phone ?? [])])

      if (!nextSession || nextAal !== 'aal2') {
        setProfile(null)
        setAccess(null)
        return null
      }

      const accessError = await refreshAccess()
      if (accessError) {
        await supabase.auth.signOut({ scope: 'local' })
        clearAccountState()
      } else {
        void listSessions().catch(() => undefined)
      }
      return accessError
    } catch {
      clearAccountState()
      setAccountError(unavailableMessage)
      return unavailableMessage
    } finally {
      setLoading(false)
    }
  }, [clearAccountState, refreshAccess])

  useEffect(() => {
    void refreshSecurityState()
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refreshSecurityState()
    })
    return () => data.subscription.unsubscribe()
  }, [refreshSecurityState])

  const value = useMemo<AuthState>(() => ({
    user,
    session,
    aal,
    factors,
    profile,
    access,
    accountError,
    loading,
    signIn: async (email, password) => {
      setAccountError(null)
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) return 'Unable to sign in with those credentials.'
      return await refreshSecurityState()
    },
    signOut: async () => {
      await supabase.auth.signOut({ scope: 'local' })
      clearAccountState()
      setAccountError(null)
    },
    refreshAccess,
    refreshSecurityState,
  }), [
    access,
    accountError,
    aal,
    clearAccountState,
    factors,
    loading,
    profile,
    refreshAccess,
    refreshSecurityState,
    session,
    user,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
