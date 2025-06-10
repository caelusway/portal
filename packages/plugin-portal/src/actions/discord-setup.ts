import { Action, IAgentRuntime, Memory, State, HandlerCallback, elizaLogger } from '@elizaos/core';
import { databaseService } from '../services/database.js';
import { getUserId, getProjectId } from '../utils/getProjectId.js';

export const setupDiscordAction: Action = {
  name: 'SETUP_DISCORD',
  similes: ['DISCORD_SETUP', 'CREATE_DISCORD', 'DISCORD_SERVER'],
  description: 'Sets up Discord server for a BioDAO project and registers it with the bot',

  validate: async (runtime: IAgentRuntime, memory: Memory, state?: State) => {
    const userId = getUserId(memory, state);
    const projectId = getProjectId(memory, state);
    return !!(userId && projectId);
  },

  handler: async (
    runtime: IAgentRuntime,
    memory: Memory,
    state: State,
    options: any,
    callback?: HandlerCallback
  ): Promise<any> => {
    try {
      const userId = getUserId(memory, state);
      const projectId = getProjectId(memory, state);
      const inviteLink = options?.inviteLink || (memory.content as any)?.text;

      elizaLogger.info(`🔧 Setting up Discord for project ${projectId}`);

      // Validate invite link
      if (!inviteLink || !inviteLink.includes('discord.gg/')) {
        const response = {
          text: '❌ Please provide a valid Discord invite link (e.g., https://discord.gg/your-invite)',
          values: { error: 'Invalid invite link' },
        };
        await callback?.(response);
        return response;
      }

      // Extract guild ID from invite (if possible) or store invite for later processing
      const project = await databaseService.getProjectById(projectId);
      if (!project) {
        const response = {
          text: '❌ Project not found. Please complete onboarding first.',
          values: { error: 'Project not found' },
        };
        await callback?.(response);
        return response;
      }

      // Create or update Discord record
      let discordRecord = await databaseService.getDiscordByProjectId(projectId);

      if (discordRecord) {
        // Update existing record
        discordRecord = await databaseService.createOrUpdateDiscord({
          projectId,
          serverId: discordRecord.serverId,
          inviteLink,
        });
      } else {
        // Create new Discord record
        discordRecord = await databaseService.createOrUpdateDiscord({
          projectId,
          serverId: `temp-${Date.now()}`, // Temporary until bot joins
          inviteLink,
        });
      }

      // Get Discord bot configuration
      const discordConfig = {
        clientId: runtime.getSetting('DISCORD_CLIENT_ID'),
        permissions: runtime.getSetting('DISCORD_PERMISSIONS') || '8',
        scope: runtime.getSetting('DISCORD_SCOPE') || 'bot%20applications.commands',
        baseUrl:
          runtime.getSetting('DISCORD_BOT_INVITE_URL') ||
          'https://discord.com/api/oauth2/authorize',
      };

      const botInstallUrl = `${discordConfig.baseUrl}?client_id=${discordConfig.clientId}&permissions=${discordConfig.permissions}&scope=${discordConfig.scope}`;

      const responseText = `✅ Discord server registered successfully!

**Next Steps:**
1. ✅ Your Discord invite link has been saved
2. 🤖 **Install the verification bot** using this link:
   ${botInstallUrl}

Once the bot is installed, it will automatically:
• Track your member count
• Monitor paper sharing activity  
• Count community messages
• Update your progress toward the next level

**Current Requirements for Level ${project.level + 1}:**
${
  project.level === 2
    ? '• 4+ Discord members\n• Bot installed and active'
    : project.level === 3
      ? '• 10+ Discord members\n• 25+ research papers shared\n• 100+ community messages'
      : '• All requirements met!'
}

Share your Discord invite with potential community members to start growing!`;

      const response = {
        text: responseText,
        values: {
          success: true,
          discordRecord,
          botInstallUrl,
          inviteLink,
        },
      };

      await callback?.(response);
      elizaLogger.info(`✅ Discord setup completed for project ${projectId}`);
      return response;
    } catch (error) {
      elizaLogger.error('❌ Discord setup failed:', error);
      const response = {
        text: '❌ Failed to set up Discord server. Please try again or contact support.',
        values: { success: false, error: error.message },
      };
      await callback?.(response);
      return response;
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Set up my Discord server with invite https://discord.gg/biodao123' },
      },
      {
        name: '{{user2}}',
        content: { text: "I'll set up your Discord server now with that invite link." },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Create Discord community' },
      },
      {
        name: '{{user2}}',
        content: {
          text: "I'll help you set up your Discord server. Please share your Discord invite link.",
        },
      },
    ],
  ],
};

export default setupDiscordAction;
