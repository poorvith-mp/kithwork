import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { InputField } from '@/components/ui/Field'
import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './AuthLayout'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${env.appOrigin}/reset-password` },
    )
    if (resetError) setError(resetError.message)
    else setSent(true)
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Reset your password."
      description="Enter the email address for your Kithwork account."
    >
      {sent ? (
        <div className="notice-box">
          If this email belongs to a Kithwork account, a recovery link has been sent.
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          <InputField
            id="recovery-email"
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {error ? <div className="error-box">{error}</div> : null}
          <Button>Send recovery link</Button>
        </form>
      )}
    </AuthLayout>
  )
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 12) return setError('Use at least 12 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setError(updateError.message)
    else navigate('/security/setup')
  }

  return (
    <AuthLayout
      eyebrow="Account security"
      title="Choose a new password."
      description="Authenticator verification remains required after the password changes."
    >
      <form className="stack" onSubmit={submit}>
        <InputField
          id="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <InputField
          id="confirm-password"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />
        {error ? <div className="error-box">{error}</div> : null}
        <Button>Update password</Button>
      </form>
    </AuthLayout>
  )
}
