/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SERVER_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
