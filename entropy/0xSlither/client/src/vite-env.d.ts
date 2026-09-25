/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STAKE_ARENA_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

