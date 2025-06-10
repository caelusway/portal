import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
import { type Plugin, type UserConfig, defineConfig, loadEnv } from 'vite';
import viteCompression from 'vite-plugin-compression';
import clientElizaLogger from './src/lib/logger';

// https://vite.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  const envDir = path.resolve(__dirname, '../..');
  const env = loadEnv(mode, envDir, '');

  // Custom plugin to filter out externalization warnings
  const filterExternalizationWarnings: Plugin = {
    name: 'filter-externalization-warnings',
    apply: 'build', // Only apply during build
    configResolved(config) {
      const originalLogFn = config.logger.info;
      config.logger.info = (msg, options) => {
        if (
          typeof msg === 'string' &&
          msg.includes('has been externalized for browser compatibility')
        ) {
          return; // Suppress the warning
        }
        originalLogFn(msg, options);
        // Also log to our custom logger
        clientElizaLogger.info(msg, options);
      };
    },
  };

  return {
    plugins: [
      react() as unknown as Plugin,
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
      }) as Plugin,
      filterExternalizationWarnings,
    ],
    clearScreen: false,
    envDir,
    define: {
      'import.meta.env.VITE_SERVER_PORT': JSON.stringify(env.SERVER_PORT || '3000'),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        env.VITE_SUPABASE_URL ||
          env.SUPABASE_URL ||
          process.env.VITE_SUPABASE_URL ||
          process.env.SUPABASE_URL ||
          ''
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY ||
          env.SUPABASE_ANON_KEY ||
          process.env.VITE_SUPABASE_ANON_KEY ||
          process.env.SUPABASE_ANON_KEY ||
          ''
      ),
      'import.meta.env.VITE_SUPABASE_SERVICE_KEY': JSON.stringify(
        env.VITE_SUPABASE_SERVICE_KEY ||
          env.SUPABASE_SERVICE_KEY ||
          process.env.VITE_SUPABASE_SERVICE_KEY ||
          process.env.SUPABASE_SERVICE_KEY ||
          ''
      ),
      'import.meta.env.VITE_PRIVY_APP_ID': JSON.stringify(
        env.VITE_PRIVY_APP_ID ||
          env.PRIVY_APP_ID ||
          process.env.VITE_PRIVY_APP_ID ||
          process.env.PRIVY_APP_ID ||
          ''
      ),
      'import.meta.env.VITE_POSTHOG_KEY': JSON.stringify(
        env.VITE_POSTHOG_KEY ||
          env.POSTHOG_KEY ||
          process.env.VITE_POSTHOG_KEY ||
          process.env.POSTHOG_KEY ||
          ''
      ),
      'import.meta.env.VITE_POSTHOG_HOST': JSON.stringify(
        env.VITE_POSTHOG_HOST ||
          env.POSTHOG_HOST ||
          process.env.VITE_POSTHOG_HOST ||
          process.env.POSTHOG_HOST ||
          ''
      ),
      'import.meta.env.VITE_SUPABASE_JWT_SECRET': JSON.stringify(
        env.VITE_SUPABASE_JWT_SECRET ||
          env.SUPABASE_JWT_SECRET ||
          process.env.VITE_SUPABASE_JWT_SECRET ||
          process.env.SUPABASE_JWT_SECRET ||
          ''
      ),
      'import.meta.env.VITE_BOT_INSTALLATION_URL': JSON.stringify(
        env.VITE_BOT_INSTALLATION_URL ||
          env.BOT_INSTALLATION_URL ||
          process.env.VITE_BOT_INSTALLATION_URL ||
          process.env.BOT_INSTALLATION_URL ||
          ''
      ),
      'import.meta.env.VITE_PUBLIC_API_URL': JSON.stringify(
        env.VITE_PUBLIC_API_URL ||
          env.PUBLIC_API_URL ||
          process.env.VITE_PUBLIC_API_URL ||
          process.env.PUBLIC_API_URL ||
          ''
      ),
      'import.meta.env.VITE_PUBLIC_WS_URL': JSON.stringify(
        env.VITE_PUBLIC_WS_URL ||
          env.PUBLIC_WS_URL ||
          process.env.VITE_PUBLIC_WS_URL ||
          process.env.PUBLIC_WS_URL ||
          ''
      ),
      'import.meta.env.VITE_TRACKING_BOT_CLIENT_ID': JSON.stringify(
        env.VITE_TRACKING_BOT_CLIENT_ID ||
          env.TRACKING_BOT_CLIENT_ID ||
          process.env.VITE_TRACKING_BOT_CLIENT_ID ||
          process.env.TRACKING_BOT_CLIENT_ID ||
          ''
      ),
    },
    build: {
      outDir: 'dist',
      minify: false,
      cssMinify: true,
      sourcemap: true,
      cssCodeSplit: true,
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress specific externalized warnings
          if (
            warning.code === 'UNRESOLVED_IMPORT' &&
            typeof warning.message === 'string' &&
            /node:|fs|path|crypto|stream|tty|worker_threads|assert/.test(warning.message)
          ) {
            return;
          }
          warn(warning);
          // Also log to our custom logger
          clientElizaLogger.warn(warning.message || 'Unknown warning');
        },
      },
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    logLevel: 'error', // Only show errors, not warnings
  };
});
