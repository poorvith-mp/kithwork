import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppointmentDeliveryState } from './AppointmentDeliveryState'

describe('appointment delivery state', () => {
  afterEach(cleanup)

  it('shows a delivery failure without deleting the confirmed appointment', () => {
    const onRetry = vi.fn()
    render(<AppointmentDeliveryState
      appointmentStatus="confirmed"
      emailJob={{
        id: 'job-1',
        status: 'failed',
        last_error: 'Mailbox provider temporarily rejected the request.',
      }}
      onRetry={onRetry}
    />)

    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Delivery failed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry email' }))
    expect(onRetry).toHaveBeenCalledWith('job-1')
  })
})
