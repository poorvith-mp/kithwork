import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Panel'

type EmailJob = {
  id: string
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
  last_error: string | null
}

const appointmentLabel = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
  no_show: 'No show',
} as const

const emailLabel = {
  pending: 'Delivery pending',
  processing: 'Delivery pending',
  sent: 'Email sent',
  failed: 'Delivery failed',
  cancelled: 'Email cancelled',
} as const

export function AppointmentDeliveryState({
  appointmentStatus,
  emailJob,
  onRetry,
}: {
  appointmentStatus: keyof typeof appointmentLabel
  emailJob: EmailJob | null
  onRetry: (jobId: string) => void
}) {
  const confirmed = appointmentStatus === 'confirmed'
  return (
    <div className="appointment-delivery-state">
      <Badge tone={confirmed ? 'success' : appointmentStatus === 'cancelled' ? 'danger' : ''}>{appointmentLabel[appointmentStatus]}</Badge>
      {emailJob ? <Badge tone={emailJob.status === 'sent' ? 'success' : emailJob.status === 'failed' ? 'danger' : 'warning'}>{emailLabel[emailJob.status]}</Badge> : <Badge>No email job</Badge>}
      {emailJob?.status === 'failed' ? (
        <div className="delivery-failure">
          <small>{emailJob.last_error ?? 'The confirmation email could not be delivered.'}</small>
          <Button variant="secondary" onClick={() => onRetry(emailJob.id)}><RefreshCw size={14}/>Retry email</Button>
        </div>
      ) : null}
    </div>
  )
}
