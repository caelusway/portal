import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import fetch from 'node-fetch';
import { DiscordService } from '../services/discordService';
import { supabase } from '../lib/supabase';

// Define interfaces for the data structures
interface DiscordServerData {
  serverId?: string;
  serverName?: string;
  memberCount?: number;
  inviteLink?: string;
}

// Helper to resolve invite code to serverId using Discord API
async function resolveServerIdFromInvite(inviteLink: string): Promise<string | null> {
  // Extract invite code from the link
  const inviteCodeMatch = inviteLink.match(
    /discord\.(?:gg|io|me|li)\/(\w+)|discordapp\.com\/invite\/(\w+)/i
  );
  const inviteCode = inviteCodeMatch?.[1] || inviteCodeMatch?.[2];
  if (!inviteCode) return null;
  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${inviteCode}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.guild?.id || null;
  } catch {
    return null;
  }
}

// Helper to get member count from Discord API
type DiscordGuildResponse = {
  id: string;
  name: string;
  approximate_member_count?: number;
  [key: string]: any;
};

async function getDiscordServerMemberCount(
  serverId: string,
  botToken?: string
): Promise<{ memberCount: number | null; name?: string }> {
  try {
    // If you have a bot token, you can pass it for authenticated requests (for private servers)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (botToken) {
      headers['Authorization'] = `Bot ${botToken}`;
    }
    const res = await fetch(`https://discord.com/api/v10/guilds/${serverId}?with_counts=true`, {
      headers,
    });
    if (!res.ok) return { memberCount: null };
    const data: DiscordGuildResponse = await res.json();
    // Discord returns 'approximate_member_count' for public guilds, or 'member_count' for authenticated bot requests
    const memberCount = data.approximate_member_count || data.member_count || null;
    return { memberCount, name: data.name };
  } catch {
    return { memberCount: null };
  }
}

/**
 * Action to check the member count of a Discord server
 */
export const checkDiscordMemberCountAction: Action = {
  name: 'CHECK_DISCORD_MEMBER_COUNT',
  similes: ['GET_DISCORD_MEMBERS', 'CHECK_SERVER_SIZE', 'VERIFY_DISCORD_SERVER'],
  description: 'Checks the member count of a Discord server',

  validate: async (runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    // No specific validation needed for this action
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ) => {
    try {
      logger.info('Handling CHECK_DISCORD_MEMBER_COUNT action');

      // Get the Discord service
      const discordService = runtime.getService<DiscordService>('discord');
      if (!discordService) {
        const errorContent: Content = {
          text: 'Discord service is unavailable. Please try again later.',
          source: message.content.source,
        };
        await callback(errorContent);
        return errorContent;
      }

      // Get userId (privyId) from message
      let userId: string | undefined = undefined;
      if (typeof message.content === 'object' && message.content !== null) {
        userId = (message.content as any).userId || (message.content as any).user_id;
        if (
          !userId &&
          (message.content as any).data &&
          typeof (message.content as any).data === 'object'
        ) {
          userId = (message.content as any).data.userId;
        }
      }
      // Safely extract serverId and inviteLink from message.content and message.content.data
      let serverId: string | undefined = undefined;
      let inviteLink: string | undefined = undefined;
      if (typeof message.content === 'object' && message.content !== null) {
        if (
          'serverId' in message.content &&
          typeof (message.content as any).serverId === 'string'
        ) {
          serverId = (message.content as any).serverId;
        }
        if (
          'inviteLink' in message.content &&
          typeof (message.content as any).inviteLink === 'string'
        ) {
          inviteLink = (message.content as any).inviteLink;
        }
        if (
          'data' in message.content &&
          typeof (message.content as any).data === 'object' &&
          (message.content as any).data !== null
        ) {
          const dataObj = (message.content as any).data;
          if ('serverId' in dataObj && typeof dataObj.serverId === 'string') {
            serverId = dataObj.serverId;
          }
          if ('inviteLink' in dataObj && typeof dataObj.inviteLink === 'string') {
            inviteLink = dataObj.inviteLink;
          }
        }
      }
      // If neither serverId nor inviteLink is provided, look up from Supabase
      if (!serverId && !inviteLink && userId) {
        const { data, error } = await supabase
          .from('user_discord_info')
          .select('server_id, invite_link')
          .eq('privy_id', userId)
          .maybeSingle();
        if (data) {
          serverId = data.server_id;
          inviteLink = data.invite_link;
          logger.info(
            `[CHECK_DISCORD_MEMBER_COUNT] Loaded serverId and inviteLink from Supabase for user ${userId}`
          );
        } else {
          logger.info(
            `[CHECK_DISCORD_MEMBER_COUNT] No Discord info found in Supabase for user ${userId}`
          );
        }
      }
      // If we still don't have a serverId, try to extract from message or resolve from inviteLink as before
      if (!serverId && !inviteLink) {
        inviteLink = extractInviteLinkFromMessage(message.content.text);
      }
      if (inviteLink && !serverId) {
        logger.info(`[CHECK_DISCORD_MEMBER_COUNT] Resolving invite link: ${inviteLink}`);
        serverId = await resolveServerIdFromInvite(inviteLink);
        if (serverId) {
          logger.info(
            `[CHECK_DISCORD_MEMBER_COUNT] Successfully resolved invite link to server ID: ${serverId}`
          );
        } else {
          logger.warn(`[CHECK_DISCORD_MEMBER_COUNT] Failed to resolve invite link: ${inviteLink}`);
        }
      }
      if (!serverId) {
        serverId = extractServerIdFromMessage(message.content.text);
      }
      if (!serverId) {
        const errorContent: Content = {
          text: "I couldn't find a Discord server ID or valid invite link. Please provide a Discord invite link or server ID.",
          source: message.content.source,
        };
        await callback(errorContent);
        return errorContent;
      }
      // Upsert to Supabase if we have userId and serverId (and not already stored)
      if (userId && serverId) {
        try {
          const { error } = await supabase.from('user_discord_info').upsert(
            {
              privy_id: userId,
              server_id: serverId,
              invite_link: inviteLink,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'privy_id' }
          );
          if (error) {
            logger.warn(`[CHECK_DISCORD_MEMBER_COUNT] Failed to upsert user_discord_info:`, error);
          } else {
            logger.info(`[CHECK_DISCORD_MEMBER_COUNT] Upserted user_discord_info for ${userId}`);
          }
        } catch (err) {
          logger.warn(
            `[CHECK_DISCORD_MEMBER_COUNT] Exception during upsert user_discord_info:`,
            err
          );
        }
      }

      // After upserting user_discord_info, check member count directly here
      let botToken: string | undefined = undefined;
      if (process.env.DISCORD_API_TOKEN) botToken = process.env.DISCORD_API_TOKEN;
      // If runtime.getSetting exists, try to get from runtime config
      if (!botToken && typeof runtime.getSetting === 'function') {
        botToken = runtime.getSetting('DISCORD_API_TOKEN');
      }
      const { memberCount, name } = await getDiscordServerMemberCount(serverId, botToken);
      if (memberCount === null) {
        const errorContent: Content = {
          text: "I couldn't retrieve the member count for your Discord server. Make sure the bot has access or the server is public.",
          source: message.content.source,
        };
        await callback(errorContent);
        return errorContent;
      }
      // Create the response content
      const responseContent: Content = {
        text: `Your Discord server${name ? ` \"${name}\"` : ''} currently has ${memberCount} members.`,
        actions: ['CHECK_DISCORD_MEMBER_COUNT'],
        source: message.content.source,
        data: {
          serverId,
          serverName: name,
          memberCount,
          inviteLink,
        },
      };
      // Call back with the response
      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in CHECK_DISCORD_MEMBER_COUNT action:', error);
      throw error;
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'How many members are in my Discord server?',
          data: {
            serverId: '123456789012345678',
          },
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Your Discord server "BioDAO Community" currently has 7 members.',
          actions: ['CHECK_DISCORD_MEMBER_COUNT'],
          data: {
            serverId: '123456789012345678',
            serverName: 'BioDAO Community',
            memberCount: 7,
          },
        },
      },
    ],
  ],
};

/**
 * Helper function to extract a Discord server ID from a message
 * This is a simple implementation that looks for a pattern like "server: 123456789012345678"
 * or just a 18-19 digit number that could be a Discord ID
 */
function extractServerIdFromMessage(text: string): string | null {
  if (!text) return null;

  // Try to find a pattern like "server: 123456789012345678"
  const serverPattern = /server:?\s*(\d{17,19})/i;
  const serverMatch = text.match(serverPattern);
  if (serverMatch && serverMatch[1]) {
    return serverMatch[1];
  }

  // Try to find just a 18-19 digit number that could be a Discord ID
  const idPattern = /\b(\d{17,19})\b/;
  const idMatch = text.match(idPattern);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  return null;
}

/**
 * Helper function to extract a Discord invite link from a message
 * This looks for common Discord invite link patterns
 */
function extractInviteLinkFromMessage(text: string): string | null {
  if (!text) return null;

  // Common Discord invite link patterns
  const invitePatterns = [
    /(?:https?:\/\/)?(?:www\.)?discord\.(?:gg|io|me|li)\/([a-zA-Z0-9-]+)/i,
    /(?:https?:\/\/)?(?:www\.)?discordapp\.com\/invite\/([a-zA-Z0-9-]+)/i,
  ];

  for (const pattern of invitePatterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      return match[0];
    }
  }

  return null;
}
