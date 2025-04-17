import { Action, IAgentRuntime, Memory, HandlerCallback, logger, State } from '@elizaos/core';
import { DiscordService } from '../services/discordService'; // Adjust path if needed
import { LevelProgressionService } from '../services/levelProgressionService'; // Adjust path if needed

// Basic regex to find Discord invite links
const DISCORD_INVITE_REGEX =
  /https?:\/\/(?:www\.)?discord(?:app)?\.(?:com\/invite|gg)\/([a-zA-Z0-9-]+)/;
// More specific regex to extract the code
const DISCORD_CODE_REGEX = /(?:discord(?:app)?\.com\/invite\/|discord\.gg\/)([a-zA-Z0-9-]+)/;

// TODO: Get the actual invite link/ID for the tracking bot
const TRACKING_BOT_INVITE_LINK = `https://discord.com/api/oauth2/authorize?client_id=${process.env.TRACKING_BOT_CLIENT_ID}&permissions=8&scope=bot`;

export const submitDiscordInviteAction: Action = {
  name: 'SUBMIT_DISCORD_INVITE',
  description: 'Handles the user submitting their Discord server invite link.',
  similes: ['my discord is', 'here is my discord', 'server invite', 'discord link'],
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'I created my server! The invite is https://discord.gg/abcdefg' },
      },
      {
        name: '{{agent}}',
        content: {
          text: "Got it! I've saved your server link...",
          actions: ['SUBMIT_DISCORD_INVITE'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    // Check if the message likely contains a discord invite link and mentions discord/server/invite
    return (
      (text.includes('discord') || text.includes('server') || text.includes('invite')) &&
      DISCORD_INVITE_REGEX.test(text)
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback,
    responses?: Memory[]
  ): Promise<unknown> => {
    const text = message.content.text || '';
    const privyId = message.entityId; // Assuming entityId is the privyId
    logger.info(`[SubmitDiscordInvite] Handling invite submission from ${privyId}`);

    if (!privyId) {
      logger.error('[SubmitDiscordInvite] Cannot proceed without privyId (entityId).');
      if (callback)
        await callback({
          text: "I couldn't identify who you are. Please ensure you're logged in.",
        });
      return false;
    }

    const discordService = runtime.getService<DiscordService>('DiscordService');
    const levelProgressionService =
      runtime.getService<LevelProgressionService>('LevelProgressionService');

    if (!discordService || !levelProgressionService) {
      logger.error(
        '[SubmitDiscordInvite] Required services (DiscordService, LevelProgressionService) not found.'
      );
      if (callback)
        await callback({
          text: "Sorry, I'm having trouble accessing my internal systems right now.",
        });
      return false;
    }

    const match = text.match(DISCORD_CODE_REGEX);
    const inviteCode = match ? match[1] : null;
    const fullInviteLink = text.match(DISCORD_INVITE_REGEX)?.[0] || null; // Get the full link

    if (!inviteCode || !fullInviteLink) {
      logger.warn(
        `[SubmitDiscordInvite] Could not extract invite code/link from message: "${text}"`
      );
      if (callback)
        await callback({
          text: "I couldn't seem to find a valid Discord invite link in your message. Could you please paste the full link again?",
        });
      return false;
    }

    logger.info(
      `[SubmitDiscordInvite] Extracted invite code: ${inviteCode}, Link: ${fullInviteLink}`
    );

    // TODO: Add potential validation step: Try to fetch invite info using Discord API?
    // This might require bot token or specific permissions. For now, assume link is valid.
    // For now, we might just use the invite code as a proxy for server ID, but ideally, fetch server ID.
    const serverId = `invite_${inviteCode}`; // Placeholder server ID

    // Store the info
    const stored = await discordService.storeUserServerInfo(privyId, serverId, fullInviteLink);

    if (!stored) {
      logger.error(`[SubmitDiscordInvite] Failed to store Discord info for ${privyId}`);
      if (callback)
        await callback({
          text: 'I encountered an issue trying to save your Discord server information. Please try submitting the link again later.',
        });
      return false;
    }

    logger.info(
      `[SubmitDiscordInvite] Stored Discord info for ${privyId}. Updating requirement...`
    );

    // Update the requirement progress
    // Need to know which level 'discord_created' belongs to (Level 3)
    const requirementId = 'discord_created';
    const levelId = 3;
    const updated = await levelProgressionService.updateRequirementProgress(
      privyId,
      levelId,
      requirementId,
      true
    );

    if (!updated) {
      logger.error(
        `[SubmitDiscordInvite] Failed to mark requirement '${requirementId}' as completed for ${privyId}`
      );
      // Decide how to handle this - maybe the info was stored but progress update failed?
      if (callback)
        await callback({
          text: "I saved your server link, but had trouble updating your progress. I'll try to sync it up.",
        });
      return false; // Return false as the full action didn't complete successfully
    }

    logger.info(`[SubmitDiscordInvite] Marked '${requirementId}' completed for ${privyId}.`);

    // Respond to the user with next steps (inviting the bot)
    const responseText = `Got it! I've saved your server link.

Now, the crucial next step is to invite our tracking bot to your server. This allows me to see your community's progress (like member count and paper sharing) for the next levels.

Please use this link to invite the bot: ${TRACKING_BOT_INVITE_LINK}

Let me know once the bot has successfully joined your server!`;

    if (callback) {
      await callback({ text: responseText });
    }

    return true; // Action completed successfully
  },
};
