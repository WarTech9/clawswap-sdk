/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLAWSWAP_API_URL?: string;
  readonly VITE_SOLANA_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}