import { PageHeader } from '@/components/shared/PageHeader'
import { useAuth } from '@/features/auth/AuthProvider'

import { ProfileForm } from './ProfileForm'
import { SecurityPanel } from './SecurityPanel'
import { SessionsPanel } from './SessionsPanel'

export function ProfilePage() {
  const { profile, aal, factors, refreshAccess, refreshSecurityState } = useAuth()

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
        <div className="rounded-lg border border-[#ffd5d0] bg-danger-soft p-4 text-sm text-danger">
          Your profile is unavailable.
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 space-y-6">
      <PageHeader
        eyebrow="Account"
        title="My Profile"
        description="Manage your personal details, security, and signed-in devices."
      />
      <ProfileForm profile={profile} refreshAccess={refreshAccess} />
      <SecurityPanel
        aal={aal}
        factors={factors}
        refreshSecurityState={refreshSecurityState}
      />
      <SessionsPanel />
    </div>
  )
}
