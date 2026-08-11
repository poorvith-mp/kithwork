import { useState, type FormEvent } from 'react'
import type { Factor } from '@supabase/supabase-js'
import { KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { InputField } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { supabase } from '@/lib/supabase'

type PendingFactor = {
  id: string
  qrCode: string
  secret: string
}

type Props = {
  aal: 'aal1' | 'aal2' | null
  factors: Factor[]
  refreshSecurityState: () => Promise<string | null>
}

export function SecurityPanel({ aal, factors, refreshSecurityState }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')
  const [factorName, setFactorName] = useState('Authenticator')
  const [pending, setPending] = useState<PendingFactor | null>(null)
  const [code, setCode] = useState('')
  const [factorBusy, setFactorBusy] = useState(false)
  const [factorError, setFactorError] = useState('')
  const [factorNotice, setFactorNotice] = useState('')
  const verified = factors.filter((factor) => factor.status === 'verified')

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordNotice('')
    if (password.length < 12) return setPasswordError('Use at least 12 characters.')
    if (password !== confirm) return setPasswordError('Passwords do not match.')
    setPasswordBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setPasswordBusy(false)
    if (error) return setPasswordError(error.message)
    setPassword('')
    setConfirm('')
    setPasswordNotice('Password updated.')
  }

  const beginEnrollment = async () => {
    setFactorError('')
    setFactorNotice('')
    setFactorBusy(true)
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: factorName.trim() || 'Authenticator',
    })
    setFactorBusy(false)
    if (error) return setFactorError(error.message)
    setPending({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
  }

  const verifyEnrollment = async (event: FormEvent) => {
    event.preventDefault()
    if (!pending) return
    setFactorBusy(true)
    setFactorError('')
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: pending.id,
      code: code.trim(),
    })
    if (error) {
      setFactorBusy(false)
      return setFactorError(error.message)
    }
    setPending(null)
    setCode('')
    setFactorBusy(false)
    await refreshSecurityState()
    setFactorNotice('Authenticator added.')
  }

  const cancelEnrollment = async () => {
    if (!pending) return
    setFactorBusy(true)
    await supabase.auth.mfa.unenroll({ factorId: pending.id })
    setPending(null)
    setCode('')
    setFactorBusy(false)
  }

  const removeFactor = async (factor: Factor) => {
    if (aal !== 'aal2' || verified.length <= 1) return
    const name = factor.friendly_name ?? 'this authenticator'
    if (!window.confirm(`Remove ${name}? You will no longer be able to use it to sign in.`)) return
    setFactorBusy(true)
    setFactorError('')
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    setFactorBusy(false)
    if (error) return setFactorError(error.message)
    await refreshSecurityState()
    setFactorNotice('Authenticator removed.')
  }

  return (
    <div className="security-grid">
      <Panel title="Password">
        <form className="stack" onSubmit={updatePassword}>
          <p className="muted">Use a unique password with at least 12 characters.</p>
          <InputField id="profile-new-password" label="New password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required/>
          <InputField id="profile-confirm-password" label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required/>
          {passwordError ? <div className="error-box" role="alert">{passwordError}</div> : null}
          {passwordNotice ? <div className="notice-box" role="status">{passwordNotice}</div> : null}
          <Button disabled={passwordBusy}><KeyRound size={16}/>{passwordBusy ? 'Updating…' : 'Update password'}</Button>
        </form>
      </Panel>

      <Panel title="Authenticators">
        <div className="stack">
          <p className="muted">At least one verified authenticator is required. Add a second one before removing your current authenticator.</p>
          <div className="factor-list">
            {verified.map((factor) => {
              const name = factor.friendly_name ?? 'Authenticator'
              const canRemove = aal === 'aal2' && verified.length > 1
              return (
                <div className="factor-row" key={factor.id}>
                  <ShieldCheck size={20}/>
                  <span className="grow"><strong>{name}</strong><small>Verified TOTP authenticator</small></span>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Remove ${name}`}
                    onClick={() => void removeFactor(factor)}
                    disabled={!canRemove || factorBusy}
                  ><Trash2 size={16}/></Button>
                </div>
              )
            })}
          </div>

          {pending ? (
            <form className="enrollment-box stack" onSubmit={verifyEnrollment}>
              <h3>Verify new authenticator</h3>
              <img className="mfa-qr" src={pending.qrCode} alt="Authenticator setup QR code"/>
              <p className="mono secret-wrap">{pending.secret}</p>
              <InputField id="new-factor-code" label="6-digit code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value)} required/>
              <div className="form-actions">
                <Button disabled={factorBusy}>{factorBusy ? 'Verifying…' : 'Verify authenticator'}</Button>
                <Button type="button" variant="ghost" onClick={() => void cancelEnrollment()} disabled={factorBusy}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div className="inline-form">
              <InputField id="factor-name" label="New authenticator name" value={factorName} maxLength={40} onChange={(event) => setFactorName(event.target.value)}/>
              <Button type="button" variant="secondary" onClick={() => void beginEnrollment()} disabled={factorBusy || aal !== 'aal2'}><Plus size={16}/>Add authenticator</Button>
            </div>
          )}
          {factorError ? <div className="error-box" role="alert">{factorError}</div> : null}
          {factorNotice ? <div className="notice-box" role="status">{factorNotice}</div> : null}
        </div>
      </Panel>
    </div>
  )
}
