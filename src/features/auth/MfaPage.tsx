import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { InputField } from '@/components/ui/Field'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './AuthLayout'
import { useAuth } from './AuthProvider'

export function MfaPage() {
  const { session, aal, factors, refreshSecurityState, signOut } = useAuth()
  const navigate = useNavigate()
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const verified = factors.filter((factor) => factor.status === 'verified' && factor.factor_type === 'totp')
  const firstVerifiedFactorId = verified[0]?.id
  useEffect(() => { if (!factorId && firstVerifiedFactorId) setFactorId(firstVerifiedFactorId) }, [factorId, firstVerifiedFactorId])
  if (!session) return <Navigate to="/login" replace />
  if (aal === 'aal2') return <Navigate to="/" replace />
  if (verified.length < 1) return <Navigate to="/security/setup" replace />
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() }); if (verifyError) return setError(verifyError.message); await refreshSecurityState(); navigate('/') }
  return <AuthLayout eyebrow="Second step" title="Verify your authenticator." description="Use a six-digit code from an enrolled authenticator."><form className="stack" onSubmit={submit}><div className="field"><label htmlFor="factor">Authenticator</label><select id="factor" className="select" value={factorId} onChange={(e)=>setFactorId(e.target.value)}>{verified.map((factor,index)=><option key={factor.id} value={factor.id}>{factor.friendly_name || `Authenticator ${index+1}`}</option>)}</select></div><InputField id="code" label="Six-digit code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e)=>setCode(e.target.value.replace(/\D/g,''))} required/>{error && <div className="error-box">{error}</div>}<Button type="submit">Verify and open Kithwork</Button><Button type="button" variant="ghost" onClick={()=>void signOut()}>Sign out</Button></form></AuthLayout>
}
