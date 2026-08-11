import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { InputField } from '@/components/ui/Field'
import { AuthLayout } from './AuthLayout'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { session, signIn, accountError } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    const message = await signIn(email, password)
    setBusy(false)
    if (message) setError(message)
    else navigate('/')
  }

  return (
    <AuthLayout
      eyebrow="Private workspace"
      title="Welcome back."
      description="Sign in with your workspace account. Authenticator verification is required before Kithwork loads private records."
    >
      <form className="stack" onSubmit={submit}>
        <InputField
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <InputField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error || accountError ? (
          <div className="error-box">{error || accountError}</div>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Continue securely'}
        </Button>
        <Link className="muted" to="/forgot-password">Forgot password?</Link>
      </form>
    </AuthLayout>
  )
}
