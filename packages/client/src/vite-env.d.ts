/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_PUBLIC_WS_URL: string;
  readonly VITE_PRIVY_APP_ID: string;
  readonly VITE_SERVER_PORT: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_JWT_SECRET: string;
  readonly VITE_POSTHOG_KEY: string;
  readonly VITE_POSTHOG_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
