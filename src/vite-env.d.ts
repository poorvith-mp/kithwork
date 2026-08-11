/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_APP_ORIGIN: string
  readonly VITE_SOURCE_REPOSITORY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
