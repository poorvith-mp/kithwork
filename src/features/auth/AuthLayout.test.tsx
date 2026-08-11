import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AuthLayout } from './AuthLayout'

describe('AuthLayout product identity', () => {
  it('shows Kithwork and links network users to the corresponding source', () => {
    render(
      <AuthLayout eyebrow="Sign in" title="Welcome" description="Use your workspace account.">
        <button type="button">Continue</button>
      </AuthLayout>,
    )

    expect(screen.getByText('Kithwork')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Kithwork source' })).toHaveAttribute(
      'href',
      'https://github.com/prvthmpcypher/kithwork',
    )
  })
})
