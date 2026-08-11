const defaultSourceRepositoryUrl = 'https://github.com/prvthmpcypher/kithwork'

export function resolveSourceRepositoryUrl(value: string | undefined) {
  return value?.trim() || defaultSourceRepositoryUrl
}

export const sourceRepositoryUrl = resolveSourceRepositoryUrl(
  import.meta.env.VITE_SOURCE_REPOSITORY_URL,
)
