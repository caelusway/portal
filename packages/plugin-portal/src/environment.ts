import { IAgentRuntime } from '@elizaos/core';
import { z } from 'zod';

export const portalEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // NFT Minting Configuration
  NFT_MINTER_PRIVATE_KEY: z.string().optional(),
  ENABLE_REAL_MINTING: z.string().default('false'),

  // Email Configuration
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MAILGUN_REGION: z.string().default('us'),
  FROM_EMAIL: z.string().optional(),
  SANDBOX_NOTIFICATION_EMAIL: z.string().default('james@bio.xyz'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Optional Services
  RESEND_API_KEY: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_PERMISSIONS: z.string().default('8'),
  DISCORD_SCOPE: z.string().default('bot%20applications.commands'),
  DISCORD_BOT_INVITE_URL: z.string().default('https://discord.com/api/oauth2/authorize'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),

  // API Configuration
  PORTAL_API_URL: z.string().default('http://localhost:3001'),
  ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
});

export type PortalConfig = z.infer<typeof portalEnvSchema>;

export async function validatePortalConfig(runtime: IAgentRuntime): Promise<PortalConfig> {
  try {
    const config = {
      DATABASE_URL: runtime.getSetting('DATABASE_URL') || process.env.DATABASE_URL,
      OPENAI_API_KEY: runtime.getSetting('OPENAI_API_KEY') || process.env.OPENAI_API_KEY,

      // NFT Configuration
      NFT_MINTER_PRIVATE_KEY:
        runtime.getSetting('NFT_MINTER_PRIVATE_KEY') || process.env.NFT_MINTER_PRIVATE_KEY,
      ENABLE_REAL_MINTING:
        runtime.getSetting('ENABLE_REAL_MINTING') || process.env.ENABLE_REAL_MINTING || 'false',

      // Email Configuration
      MAILGUN_API_KEY: runtime.getSetting('MAILGUN_API_KEY') || process.env.MAILGUN_API_KEY,
      MAILGUN_DOMAIN: runtime.getSetting('MAILGUN_DOMAIN') || process.env.MAILGUN_DOMAIN,
      MAILGUN_REGION: runtime.getSetting('MAILGUN_REGION') || process.env.MAILGUN_REGION || 'us',
      FROM_EMAIL: runtime.getSetting('FROM_EMAIL') || process.env.FROM_EMAIL,
      SANDBOX_NOTIFICATION_EMAIL:
        runtime.getSetting('SANDBOX_NOTIFICATION_EMAIL') ||
        process.env.SANDBOX_NOTIFICATION_EMAIL ||
        'james@bio.xyz',
      FRONTEND_URL:
        runtime.getSetting('FRONTEND_URL') || process.env.FRONTEND_URL || 'http://localhost:3000',

      // Optional Services
      RESEND_API_KEY: runtime.getSetting('RESEND_API_KEY') || process.env.RESEND_API_KEY,
      DISCORD_BOT_TOKEN: runtime.getSetting('DISCORD_BOT_TOKEN') || process.env.DISCORD_BOT_TOKEN,
      DISCORD_CLIENT_ID: runtime.getSetting('DISCORD_CLIENT_ID') || process.env.DISCORD_CLIENT_ID,
      DISCORD_PERMISSIONS:
        runtime.getSetting('DISCORD_PERMISSIONS') || process.env.DISCORD_PERMISSIONS || '8',
      DISCORD_SCOPE:
        runtime.getSetting('DISCORD_SCOPE') ||
        process.env.DISCORD_SCOPE ||
        'bot%20applications.commands',
      DISCORD_BOT_INVITE_URL:
        runtime.getSetting('DISCORD_BOT_INVITE_URL') ||
        process.env.DISCORD_BOT_INVITE_URL ||
        'https://discord.com/api/oauth2/authorize',
      SUPABASE_URL: runtime.getSetting('SUPABASE_URL') || process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: runtime.getSetting('SUPABASE_ANON_KEY') || process.env.SUPABASE_ANON_KEY,

      // API Configuration
      PORTAL_API_URL:
        runtime.getSetting('PORTAL_API_URL') ||
        process.env.PORTAL_API_URL ||
        'http://localhost:3001',
      ENVIRONMENT: runtime.getSetting('ENVIRONMENT') || process.env.ENVIRONMENT || 'development',
    };

    return portalEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(`Portal plugin configuration error:\n${errorMessages}`);
    }
    throw error;
  }
}

export function getDiscordBotConfig(runtime: IAgentRuntime) {
  return {
    clientId: runtime.getSetting('DISCORD_CLIENT_ID') || '1361285493521907832',
    permissions: runtime.getSetting('DISCORD_PERMISSIONS') || '8',
    scope: runtime.getSetting('DISCORD_SCOPE') || 'bot%20applications.commands',
    baseUrl:
      runtime.getSetting('DISCORD_BOT_INVITE_URL') || 'https://discord.com/api/oauth2/authorize',
  };
}
