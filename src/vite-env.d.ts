/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_CRM_BRAND?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
