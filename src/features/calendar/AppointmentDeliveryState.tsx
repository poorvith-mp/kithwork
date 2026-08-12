import { RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

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
    <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
      <Badge
        variant={
          confirmed ? 'success' : appointmentStatus === 'cancelled' ? 'danger' : 'default'
        }
      >
        {appointmentLabel[appointmentStatus]}
      </Badge>
      {emailJob ? (
        <Badge
          variant={
            emailJob.status === 'sent'
              ? 'success'
              : emailJob.status === 'failed'
                ? 'danger'
                : 'warning'
          }
        >
          {emailLabel[emailJob.status]}
        </Badge>
      ) : (
        <Badge variant="outline">No email job</Badge>
      )}
      {emailJob?.status === 'failed' ? (
        <div className="mt-2 flex w-full items-center justify-between gap-3 rounded-lg border border-[#ffd5d0] bg-danger-soft p-2.5">
          <small className="text-xs text-danger">
            {emailJob.last_error ?? 'The confirmation email could not be delivered.'}
          </small>
          <Button variant="secondary" size="sm" onClick={() => onRetry(emailJob.id)}>
            <RefreshCw size={13} />
            <span>Retry email</span>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
