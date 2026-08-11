import { PageHeader } from '@/components/shared/PageHeader'
import { useAuth } from '@/features/auth/AuthProvider'

import { ProfileForm } from './ProfileForm'
import { SecurityPanel } from './SecurityPanel'
import { SessionsPanel } from './SessionsPanel'

export function ProfilePage() {
  const { profile, aal, factors, refreshAccess, refreshSecurityState } = useAuth()

  if (!profile) {
    return <main className="page"><div className="error-box">Your profile is unavailable.</div></main>
  }

  return (
    <main className="page">
      <PageHeader
        eyebrow="Account"
        title="My Profile"
        description="Manage your personal details, security, and signed-in devices."
      />
      <ProfileForm profile={profile} refreshAccess={refreshAccess}/>
      <SecurityPanel aal={aal} factors={factors} refreshSecurityState={refreshSecurityState}/>
      <SessionsPanel/>
    </main>
  )
}
