import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { InputField, SelectField, TextareaField } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import type { ProfileSnapshot } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

const fallbackTimezones = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
]
const photoTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const photoLimit = 2 * 1024 * 1024

function timezoneOptions(current: string) {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[]
  }
  const values = intl.supportedValuesOf?.('timeZone') ?? fallbackTimezones
  return Array.from(new Set([...values, current])).sort()
}

function optional(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

type Props = {
  profile: ProfileSnapshot
  refreshAccess: () => Promise<string | null>
}

export function ProfileForm({ profile, refreshAccess }: Props) {
  const [fullName, setFullName] = useState(profile.fullName)
  const [email, setEmail] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [roleTitle, setRoleTitle] = useState(profile.roleTitle ?? '')
  const [timezone, setTimezone] = useState(profile.timezone)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [emailNotifications, setEmailNotifications] = useState(
    profile.notificationPreferences.email ?? true,
  )
  const [inAppNotifications, setInAppNotifications] = useState(
    profile.notificationPreferences.inApp ?? true,
  )
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const timezones = useMemo(() => timezoneOptions(profile.timezone), [profile.timezone])

  useEffect(() => {
    let active = true
    if (!profile.photoPath) {
      setPhotoUrl(null)
      return () => { active = false }
    }

    void supabase.storage
      .from('profile-photos')
      .createSignedUrl(profile.photoPath, 300)
      .then(({ data }) => {
        if (active) setPhotoUrl(data?.signedUrl ?? null)
      })
    return () => { active = false }
  }, [profile.photoPath])

  const savePhotoPath = async (path: string | null) => {
    const { error: updateError } = await supabase.rpc('update_my_profile', {
      p_full_name: fullName.trim(),
      p_phone: optional(phone),
      p_role_title: optional(roleTitle),
      p_timezone: timezone,
      p_bio: optional(bio),
      p_photo_path: path,
      p_notification_preferences: {
        email: emailNotifications,
        inApp: inAppNotifications,
      },
    })
    if (updateError) throw updateError
    await refreshAccess()
  }

  const changePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setNotice('')
    if (!photoTypes.has(file.type)) {
      setError('Choose a JPEG, PNG, or WebP profile photo.')
      return
    }
    if (file.size > photoLimit) {
      setError('Profile photos must be 2 MB or smaller.')
      return
    }

    setPhotoBusy(true)
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${profile.userId}/avatar-${crypto.randomUUID()}.${extension}`
    try {
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
      try {
        await savePhotoPath(path)
      } catch (value) {
        await supabase.storage.from('profile-photos').remove([path])
        throw value
      }
      if (profile.photoPath) {
        await supabase.storage.from('profile-photos').remove([profile.photoPath])
      }
      setNotice('Profile photo updated.')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to update the profile photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const removePhoto = async () => {
    if (!profile.photoPath) return
    setPhotoBusy(true)
    setError('')
    setNotice('')
    try {
      await savePhotoPath(null)
      await supabase.storage.from('profile-photos').remove([profile.photoPath])
      setPhotoUrl(null)
      setNotice('Profile photo removed.')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to remove the profile photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (fullName.trim().length < 2) {
      setError('Enter your full name.')
      return
    }
    if (!timezones.includes(timezone)) {
      setError('Choose a supported timezone.')
      return
    }

    setBusy(true)
    try {
      await savePhotoPath(profile.photoPath)
      if (email.trim().toLowerCase() !== profile.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim().toLowerCase(),
        })
        if (emailError) throw emailError
        setNotice('Profile saved. Check both email addresses to confirm the email change.')
      } else {
        setNotice('Profile saved.')
      }
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to save your profile.')
    } finally {
      setBusy(false)
    }
  }

  const initials = profile.fullName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <form className="profile-form" onSubmit={submit}>
      <Panel title="Personal details">
        <div className="profile-photo-row">
          <div className="profile-photo" aria-label="Current profile photo">
            {photoUrl ? <img src={photoUrl} alt=""/> : <span>{initials}</span>}
          </div>
          <div className="profile-photo-actions">
            <label className="button secondary" htmlFor="profile-photo-input">
              <Camera size={16}/> {photoBusy ? 'Updating…' : 'Change photo'}
            </label>
            <input
              className="visually-hidden"
              id="profile-photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => void changePhoto(event)}
              disabled={photoBusy}
            />
            {profile.photoPath ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void removePhoto()}
                disabled={photoBusy}
              >
                <Trash2 size={16}/> Remove
              </Button>
            ) : null}
            <small className="muted">Private JPEG, PNG, or WebP. Maximum 2 MB.</small>
          </div>
        </div>
        <div className="form-grid two">
          <InputField id="profile-name" label="Full name" value={fullName} maxLength={120} onChange={(event) => setFullName(event.target.value)} required/>
          <InputField id="profile-email" label="Email" type="email" value={email} maxLength={254} onChange={(event) => setEmail(event.target.value)} required/>
          <InputField id="profile-phone" label="Phone" type="tel" value={phone} maxLength={40} onChange={(event) => setPhone(event.target.value)}/>
          <InputField id="profile-role" label="Role or title" value={roleTitle} maxLength={120} onChange={(event) => setRoleTitle(event.target.value)}/>
          <SelectField id="profile-timezone" label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
            {timezones.map((value) => <option key={value} value={value}>{value}</option>)}
          </SelectField>
        </div>
        <TextareaField id="profile-bio" label="Bio" value={bio} maxLength={1000} rows={5} onChange={(event) => setBio(event.target.value)}/>
      </Panel>

      <Panel title="Notifications">
        <div className="preference-list">
          <label className="preference-row">
            <span><strong>Email notifications</strong><small>Account and assigned-work updates sent by email.</small></span>
            <input type="checkbox" checked={emailNotifications} onChange={(event) => setEmailNotifications(event.target.checked)}/>
          </label>
          <label className="preference-row">
            <span><strong>In-app notifications</strong><small>Updates shown inside this private workspace.</small></span>
            <input type="checkbox" checked={inAppNotifications} onChange={(event) => setInAppNotifications(event.target.checked)}/>
          </label>
        </div>
      </Panel>

      {error ? <div className="error-box" role="alert">{error}</div> : null}
      {notice ? <div className="notice-box" role="status">{notice}</div> : null}
      <div className="form-actions"><Button disabled={busy || photoBusy}>{busy ? 'Saving…' : 'Save profile'}</Button></div>
    </form>
  )
}
