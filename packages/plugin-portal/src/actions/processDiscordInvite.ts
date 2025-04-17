import {
  Action,
  Memory,
  IAgentRuntime,
  logger,
  State,
  HandlerCallback,
  Content,
} from '@elizaos/core';
import { z } from 'zod';
import { DiscordService } from '../services/discordService';
import { SupabaseService } from '../services/supabase-service';

// Define the expected parameters using Zod for validation
const parametersSchema = z.object({
  inviteLink: z.string().url('Must provide a valid Discord invite link.'),
  userId: z.string().min(1, 'User ID (privy_id) is required.'),
});

export const processDiscordInviteAction: Action = {
  name: 'PROCESS_DISCORD_INVITE',
  similes: [
    'PROCESS_DISCORD_INVITE',
    'PROCESS_DISCORD_INVITATION',
    'PROCESS_DISCORD_INVITATION_LINK',
  ],
  description:
    "Processes a Discord invite link provided by the user. It resolves the invite code to find the Server (Guild) ID and stores this information along with the user's ID.",
  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Here is my Discord server invite link: https://discord.gg/abcdefg',
          inviteLink: 'https://discord.gg/abcdefg',
          userId: 'user123',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Successfully linked Discord server (ID: 123456789012345678). Now you need to invite the BioDAO bot to your server so I can track progress.',
          source: 'system',
          data: {
            userId: 'user123',
            inviteLink: 'https://discord.gg/abcdefg',
            serverId: '123456789012345678',
          },
        },
      },
    ],
  ],
  validate: async (runtime: IAgentRuntime, memory: Memory, state: State): Promise<boolean> => {
    try {
      parametersSchema.parse(memory.content);
      return true;
    } catch (error) {
      logger.warn(
        `[PROCESS_DISCORD_INVITE_ACTION Validation] Invalid parameters: ${(error as z.ZodError).errors.map((e) => e.message).join(', ')}`
      );
      return false;
    }
  },
  handler: async (
    runtime: IAgentRuntime,
    memory: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<Content> => {
    let inviteLink: string;
    let userId: string;

    // Validate parameters
    try {
      const params = parametersSchema.parse(memory.content);
      inviteLink = params.inviteLink;
      userId = params.userId;
      logger.info(
        `[PROCESS_DISCORD_INVITE_ACTION] Received request for user: ${userId}, link: ${inviteLink}`
      );
    } catch (error) {
      const errorContent: Content = {
        text: `Invalid parameters: ${(error as z.ZodError).errors.map((e) => e.message).join(', ')}`,
        source: memory.content.source,
        data: { ...memory.content },
      };
      await callback(errorContent);
      return errorContent;
    }

    // Get required services
    const discordService = runtime.getService<DiscordService>('discord');
    const supabaseService = runtime.getService<SupabaseService>('supabase');

    if (!discordService) {
      const errorContent: Content = {
        text: 'DiscordService is unavailable.',
        source: memory.content.source,
        data: { userId, inviteLink },
      };
      await callback(errorContent);
      return errorContent;
    }
    if (!supabaseService) {
      const errorContent: Content = {
        text: 'SupabaseService is unavailable.',
        source: memory.content.source,
        data: { userId, inviteLink },
      };
      await callback(errorContent);
      return errorContent;
    }

    try {
      // 1. Resolve invite link to Server ID
      const serverId = await discordService.getServerIdFromInvite(inviteLink);

      if (!serverId) {
        const errorContent: Content = {
          text: 'Could not find a valid Discord server from the provided invite link. Please check the link and try again.',
          source: memory.content.source,
          data: { userId, inviteLink },
        };
        await callback(errorContent);
        return errorContent;
      }

      logger.info(
        `[PROCESS_DISCORD_INVITE_ACTION] Resolved server ID: ${serverId} for user: ${userId}`
      );

      // 2. Store the information in Supabase
      const { success, error } = await supabaseService.upsertUserDiscordInfo(
        userId,
        serverId,
        inviteLink,
        false // bot_invited set to false
      );

      if (!success) {
        const errorContent: Content = {
          text: `Failed to save Discord server information. ${error?.message || 'Database error.'}`,
          source: memory.content.source,
          data: { userId, inviteLink, serverId },
        };
        await callback(errorContent);
        return errorContent;
      }

      // 3. Return success
      logger.info(
        `[PROCESS_DISCORD_INVITE_ACTION] Successfully processed invite and stored info for user ${userId}`
      );
      const successContent: Content = {
        text: `Successfully linked Discord server (ID: ${serverId}). Now you need to invite the BioDAO bot to your server so I can track progress.`,
        source: memory.content.source,
        data: { userId, inviteLink, serverId },
      };
      await callback(successContent);
      return successContent;
    } catch (error) {
      logger.error('[PROCESS_DISCORD_INVITE_ACTION] Unexpected error:', error);
      const errorContent: Content = {
        text: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: memory.content.source,
        data: { userId, inviteLink },
      };
      await callback(errorContent);
      return errorContent;
    }
  },
};
