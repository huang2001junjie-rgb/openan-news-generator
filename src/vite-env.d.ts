/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GATEWAY_TARGET?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_KEY?: string
  readonly VITE_CHAT_MODEL?: string
  readonly VITE_IMAGE_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
