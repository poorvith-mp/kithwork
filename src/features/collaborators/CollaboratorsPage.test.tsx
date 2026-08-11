import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PermissionEditor } from './PermissionEditor'
import type { PermissionDraft } from './types'

function EditorHarness({ confirm }: { confirm?: (value: PermissionDraft) => void }) {
  const [value, setValue] = useState<PermissionDraft>({ projects: ['view'] })
  return <PermissionEditor baseline={{ projects: ['view'] }} value={value} onChange={setValue} onConfirm={confirm}/>
}

describe('collaborator access editor', () => {
  afterEach(cleanup)

  it('previews permission impact before saving', () => {
    const confirm = vi.fn()
    render(<EditorHarness confirm={confirm}/>)

    fireEvent.click(screen.getByLabelText('Edit projects'))

    expect(screen.getByText(/adds edit access to assigned projects/i))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm access change' }))
      .toBeEnabled()
  })

  it('never offers owner-only modules or permanent deletion', () => {
    render(
      <PermissionEditor
        baseline={{}}
        value={{}}
        onChange={() => undefined}
      />,
    )

    expect(screen.queryByText('Marketing')).not.toBeInTheDocument()
    expect(screen.queryByText('Payments')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/delete/i)).not.toBeInTheDocument()
  })
})
