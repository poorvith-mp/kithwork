import { useEffect, useState, type FormEvent } from 'react'
import type { Factor } from '@supabase/supabase-js'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { InputField } from '@/components/ui/Field'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './AuthLayout'
import { useAuth } from './AuthProvider'

type Enrollment = { id: string; qrCode: string; secret: string }
export function SecuritySetupPage() {
  const { session, factors, refreshSecurityState, signOut } = useAuth()
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const verified = factors.filter((factor: Factor) => factor.status === 'verified' && factor.factor_type === 'totp')
  useEffect(() => { if (!session || verified.length >= 1 || enrollment) return; void (async()=>{ const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType:'totp', friendlyName: 'Primary authenticator' }); if (enrollError) setError(enrollError.message); else if (data?.totp) setEnrollment({ id:data.id, qrCode:data.totp.qr_code, secret:data.totp.secret }) })() }, [enrollment, session, verified.length])
  if (!session) return <Navigate to="/login" replace />
  if (verified.length >= 1) return <Navigate to="/mfa" replace />
  const verify = async (event: FormEvent) => { event.preventDefault(); if (!enrollment) return; setError(''); const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId:enrollment.id, code:code.trim() }); if (verifyError) return setError(verifyError.message); setEnrollment(null); setCode(''); await refreshSecurityState() }
  return <AuthLayout eyebrow="Security setup" title="Protect Kithwork with an authenticator." description="Scan the QR code using your authenticator app. You can add another authenticator later from My Profile."><form className="stack" onSubmit={verify}>{enrollment ? <><img src={enrollment.qrCode} alt="Authenticator QR code" style={{width:220,height:220,border:'1px solid var(--line)',borderRadius:12}}/><div className="notice-box">Manual key: <strong>{enrollment.secret}</strong></div></> : null}<InputField id="setup-code" label="Six-digit verification code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e)=>setCode(e.target.value.replace(/\D/g,''))} required/>{error ? <div className="error-box">{error}</div> : null}<Button type="submit" disabled={!enrollment}>Verify authenticator</Button><Button type="button" variant="ghost" onClick={()=>void signOut()}>Sign out</Button></form></AuthLayout>
}
