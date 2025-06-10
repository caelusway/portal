import { Action, IAgentRuntime, Memory, State, HandlerCallback, elizaLogger } from '@elizaos/core';
import { databaseService } from '../services/database.js';
import { levelManager } from '../services/level-manager.js';
import { validatePortalConfig } from '../environment.js';
import { getProjectId, getUserId } from '../utils/getProjectId.js';

// Discord utilities (simplified version of portal-api discord utils)
class DiscordService {
  private DISCORD_BOT_CONFIG = {
    clientId: process.env.DISCORD_CLIENT_ID || '1361285493521907832',
    permissions: '8', // Administrator permissions
    scope: 'bot',
    baseUrl: 'https://discord.com/api/oauth2/authorize',
  };

  extractDiscordInfo(inviteLink: string): { serverId: string; inviteCode: string } | null {
    try {
      // Extract server ID and invite code from Discord invite link
      const discordRegex = /(?:https?:\/\/)?(?:www\.)?discord\.(?:gg|com\/invite)\/([a-zA-Z0-9]+)/;
      const match = inviteLink.match(discordRegex);

      if (!match) {
        return null;
      }

      const inviteCode = match[1];
      // For simulation, generate a server ID
      const serverId = `${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

      return { serverId, inviteCode };
    } catch (error) {
      elizaLogger.error('Error extracting Discord info:', error);
      return null;
    }
  }

  getBotInstallationUrl(): string {
    return `${this.DISCORD_BOT_CONFIG.baseUrl}?client_id=${this.DISCORD_BOT_CONFIG.clientId}&permissions=${this.DISCORD_BOT_CONFIG.permissions}&scope=${this.DISCORD_BOT_CONFIG.scope}`;
  }

  async fetchServerInfo(serverId: string): Promise<{ name: string; memberCount: number } | null> {
    // In production, this would make actual Discord API calls
    // For now, we'll simulate server info
    return {
      name: `Research Server ${serverId.slice(-4)}`,
      memberCount: Math.floor(Math.random() * 5) + 1, // Random 1-5 members
    };
  }
}

const discordService = new DiscordService();

export const setupDiscordAction: Action = {
  name: 'SETUP_DISCORD',
  similes: [
    'CREATE_DISCORD',
    'DISCORD_SETUP',
    'ADD_DISCORD',
    'REGISTER_DISCORD',
    'CONNECT_DISCORD',
    'DISCORD_SERVER',
  ],
  description: 'Set up Discord server for the project',
  validate: async (runtime: IAgentRuntime, memory: Memory, state?: State) => {
    const config = await validatePortalConfig(runtime);
    const projectId = getProjectId(memory, state);
    return !!(config.DATABASE_URL && projectId);
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

      elizaLogger.info('Processing Discord setup for user:', userId);

      const { discordInvite } = options;

      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // Get project
      const project = await databaseService.getProjectById(projectId);

      if (!project) {
        const response = {
          text: "I couldn't find your project. Please complete onboarding first.",
          values: { error: 'Project not found' },
        };
        await callback?.(response);
        return response;
      }

      // Check if Discord is already set up
      const existingDiscord = await databaseService.getDiscordByProjectId(project.id);

      if (!discordInvite) {
        if (existingDiscord) {
          const botUrl = discordService.getBotInstallationUrl();
          const response = {
            text: `Your Discord server is already set up! Server: ${existingDiscord.serverName || 'Your Server'} with ${existingDiscord.memberCount} members.\n\n${!existingDiscord.botAdded ? `Please install our verification bot: ${botUrl}` : 'Bot is installed and tracking your progress.'}`,
            values: {
              alreadySetup: true,
              discord: existingDiscord,
              botUrl: !existingDiscord.botAdded ? botUrl : null,
            },
          };
          await callback?.(response);
          return response;
        }

        // Provide setup instructions
        const response = {
          text: `Let's set up your Discord server! Here's what you need to do:\n\n1. Create a Discord server (you can use our BIO template: https://discord.new/wbyrDkxwyhNp)\n2. Share your Discord invite link with me (it should look like discord.gg/123abc)\n\nFor additional guidance, check out our Discord Basics Tutorial: https://drive.google.com/file/u/1/d/1ntEA39P94KkeZLa2eT2OdrMOFjVbgUbh/preview?pli=1`,
          values: { needsSetup: true },
        };
        await callback?.(response);
        return response;
      }

      // Extract Discord info from invite link
      const discordInfo = discordService.extractDiscordInfo(discordInvite);

      if (!discordInfo) {
        const response = {
          text: "That doesn't look like a valid Discord invite link. Please share a link that looks like discord.gg/123abc or discord.com/invite/123abc",
          values: { error: 'Invalid invite link' },
        };
        await callback?.(response);
        return response;
      }

      // Fetch server info
      const serverInfo = await discordService.fetchServerInfo(discordInfo.serverId);

      // Create or update Discord record
      const discordData = {
        projectId: project.id,
        serverId: discordInfo.serverId,
        inviteLink: discordInvite,
        memberCount: serverInfo?.memberCount || 1,
        serverName: serverInfo?.name || 'Your Discord Server',
        verified: true,
        botAdded: false,
      };

      const savedDiscord = await databaseService.createOrUpdateDiscord(discordData);

      // Provide bot installation link
      const botUrl = discordService.getBotInstallationUrl();

      const response = {
        text: `✅ I've registered your Discord server successfully!\n\nServer: ${discordData.serverName}\nCurrent Members: ${discordData.memberCount}\n\nNow for the next step: Please install our verification bot using this link:\n${botUrl}\n\nThis bot is essential for tracking your server stats and monitoring your progress toward the next level.`,
        values: {
          success: true,
          discord: savedDiscord,
          botUrl: botUrl,
          serverInfo: discordData,
        },
      };

      await callback?.(response);
      return response;
    } catch (error) {
      elizaLogger.error('Error in setup Discord action:', error);
      const response = {
        text: 'Sorry, I encountered an error while setting up your Discord server. Please try again.',
        values: { error: error.message },
      };
      await callback?.(response);
      return response;
    }
  },
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Here is my Discord link: discord.gg/abcdef', projectId: '123' },
      },
      {
        name: '{{user2}}',
        content: { text: 'Set up my Discord server', projectId: '456' },
      },
    ],
  ],
};

export default setupDiscordAction;
