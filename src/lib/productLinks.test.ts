import { describe, expect, it } from 'vitest'

import { resolveSourceRepositoryUrl } from './productLinks'

describe('source repository URL', () => {
  it('defaults to the Kithwork source and accepts an operator override', () => {
    expect(resolveSourceRepositoryUrl(undefined)).toBe(
      'https://github.com/poorvith-mp/kithwork',
    )
    expect(resolveSourceRepositoryUrl(' https://example.com/my-kithwork ')).toBe(
      'https://example.com/my-kithwork',
    )
  })
})
