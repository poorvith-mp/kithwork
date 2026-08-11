import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))

import {
  money,
  prepareInsertValue,
  prepareUpdateValue,
} from './data'

describe('money', () => {
  it('uses the neutral product currency unless a deployment overrides it', () => {
    expect(money(1250)).toBe('$1,250')
  })

  it('lets a deployment choose its own currency and locale', () => {
    expect(money(1250, { currency: 'EUR', locale: 'de-DE' })).toBe('1.250\u00a0€')
  })
})

describe('workspace-owned writes', () => {
  it('uses the canonical workspace owner for inserts', () => {
    expect(
      prepareInsertValue({ owner_id: 'collaborator-1', title: 'New record' }, 'owner-1'),
    ).toEqual({ owner_id: 'owner-1', title: 'New record' })
  })

  it('never lets an edit replace the stored owner', () => {
    expect(
      prepareUpdateValue({ owner_id: 'collaborator-1', title: 'Changed record' }),
    ).toEqual({ title: 'Changed record' })
  })
})
