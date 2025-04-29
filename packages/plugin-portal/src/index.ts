import type { Plugin } from '@elizaos/core';
import {
  type Action,
  type Content,
  type GenerateTextParams,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type Provider,
  type ProviderResult,
  Service,
  type State,
  logger,
} from '@elizaos/core';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

// Import actions
import { checkDiscordLevelProgressAction } from './actions/checkDiscordLevelProgress';
import { checkDiscordMemberCountAction } from './actions/checkDiscordMemberCount';
import { checkLevelRequirementsAction } from './actions/checkLevelRequirements';
import { fetchUserLevelAction } from './actions/fetchUserLevel';
import { getUserLevelAction } from './actions/getUserLevel';
import { incrementUserLevelAction } from './actions/incrementUserLevel';
import { updateUserLevelAction } from './actions/updateUserLevel';
import { sendLevelUpEmailAction } from './actions/sendLevelUpEmail';
import { inviteDiscordBotAction } from './actions/inviteDiscordBot';

// Import services
import { DiscordService, DiscordService as DiscordService1 } from './services/discordService';

// Import providers
import { onboardingProvider } from './providers/onboardingProvider';
import { userInfoProvider } from './providers/userInfoProvider';
import { LEVELS, getNextLevelRequirements } from './onboarding/levels';
import { generateNextLevelRequirementsMessage, getBotInstallationUrl } from './utils/helpers';
import { nextLevelRequirementsEvent } from './events/nextLevelRequirementsEvent';

const prisma = new PrismaClient();

/**
 * Defines the configuration schema for a plugin, including the validation rules for the plugin name.
 *
 * @type {import('zod').ZodObject<{ EXAMPLE_PLUGIN_VARIABLE: import('zod').ZodString }>}
 */
const configSchema = z.object({
  SUPABASE_URL: z
    .string()
    .min(1, 'Supabase URL is not provided')
    .optional()
    .transform((val) => {
      if (!val) {
        logger.warn('Supabase URL is not provided (this is expected)');
      }
      return val;
    }),
  SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'Supabase anonymous key is not provided')
    .optional()
    .transform((val) => {
      if (!val) {
        logger.warn('Supabase anonymous key is not provided (this is expected)');
      }
      return val;
    }),
  DISCORD_API_TOKEN: z
    .string()
    .min(1, 'Discord API token is not provided')
    .optional()
    .transform((val) => {
      if (!val) {
        logger.warn('Discord API token is not provided (this is expected)');
      }
      return val;
    }),
});

/**
 * Example HelloWorld action
 * This demonstrates the simplest possible action structure
 */
/**
 * Action representing a hello world message.
 * @typedef {Object} Action
 * @property {string} name - The name of the action.
 * @property {string[]} similes - An array of related actions.
 * @property {string} description - A brief description of the action.
 * @property {Function} validate - Asynchronous function to validate the action.
 * @property {Function} handler - Asynchronous function to handle the action and generate a response.
 * @property {Object[]} examples - An array of example inputs and expected outputs for the action.
 */

export class StarterService extends Service {
  static serviceType = 'starter';
  capabilityDescription =
    'This is a starter service which is attached to the agent through the starter plugin.';
  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info(`*** Starting starter service - MODIFIED: ${new Date().toISOString()} ***`);
    const service = new StarterService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('*** TESTING DEV MODE - STOP MESSAGE CHANGED! ***');
    // get the service from the runtime
    const service = runtime.getService(StarterService.serviceType);
    if (!service) {
      throw new Error('Starter service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('*** THIRD CHANGE - TESTING FILE WATCHING! ***');
  }
}

export const plugin: Plugin = {
  name: 'portal',
  description: 'Portal plugin for BioDAO',
  config: {
    discordApiToken: {
      type: 'string',
      description: 'Discord API token',
      required: true,
    },
  },
  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    const token = runtime.getSetting('DISCORD_API_TOKEN') as string;

    if (!token || token.trim() === '') {
      logger.warn(
        'Discord API Token not provided - Discord plugin is loaded but will not be functional'
      );
      logger.warn(
        'To enable Discord functionality, please provide DISCORD_API_TOKEN in your .eliza/.env file'
      );
    }

    runtime.registerAction({
      name: 'REPLY',
      description: 'Disabled fallback reply action to prevent generic LLM responses.',
      validate: async () => false, // disables fallback
      handler: async () => true,
    });

    // Register actions
    runtime.registerAction(incrementUserLevelAction);
    runtime.registerAction(updateUserLevelAction);
    runtime.registerAction(fetchUserLevelAction);
    runtime.registerAction(checkLevelRequirementsAction);
    runtime.registerAction(getUserLevelAction);
    runtime.registerAction(checkDiscordLevelProgressAction);
    runtime.registerAction(checkDiscordMemberCountAction);
    runtime.registerAction(sendLevelUpEmailAction);
    runtime.registerAction(inviteDiscordBotAction);

    // Register services
    runtime.registerService(DiscordService);

    // Register providers
    runtime.registerProvider(onboardingProvider);
    runtime.registerProvider(userInfoProvider);
  },
  models: {
    [ModelType.TEXT_SMALL]: async (
      _runtime,
      { prompt, stopSequences = [] }: GenerateTextParams
    ) => {
      return 'This is a placeholder for the TEXT_SMALL model in the portal plugin.';
    },
    [ModelType.TEXT_LARGE]: async (
      _runtime,
      {
        prompt,
        stopSequences = [],
        maxTokens = 8192,
        temperature = 0.7,
        frequencyPenalty = 0.7,
        presencePenalty = 0.7,
      }: GenerateTextParams
    ) => {
      return 'This is a placeholder for the TEXT_LARGE model in the portal plugin.';
    },
  },
  tests: [
    {
      name: 'portal_plugin_test_suite',
      tests: [
        {
          name: 'verify_user_level_service',
          fn: async (runtime) => {
            logger.debug('verify_user_level_service run by ', runtime.character.name);
            // Verify the plugin is loaded properly
            const service = runtime.getService('user-level');
            if (!service) {
              throw new Error('User level service not found');
            }
          },
        },
      ],
    },
  ],
  routes: [
    {
      path: '/user-level/:userId',
      type: 'GET',
      handler: async (req: any, res: any) => {
        // This is a placeholder route for user level information
        res.json({
          message: 'User level endpoint',
          userId: req.params.userId,
        });
      },
    },
  ],
  events: {
    MESSAGE_RECEIVED: [
      async (params) => {
        logger.debug('MESSAGE_RECEIVED event received');
        logger.debug(Object.keys(params));
      },
    ],
    VOICE_MESSAGE_RECEIVED: [
      async (params) => {
        logger.debug('VOICE_MESSAGE_RECEIVED event received');
        logger.debug(Object.keys(params));
      },
    ],
    WORLD_CONNECTED: [
      async (payload) => {
        logger.debug('WORLD_CONNECTED event received');
        logger.debug(Object.keys(payload));
        // Send onboarding stats to user
        try {
          const runtime = payload.runtime;
          // Construct minimal memory/state for onboardingProvider
          const firstEntity =
            payload.entities && payload.entities.length > 0 ? payload.entities[0] : null;
          const projectId = (payload.world?.id || (firstEntity && firstEntity.id)) as
            | `${string}-${string}-${string}-${string}-${string}`
            | undefined;
          const entityId = firstEntity?.id as
            | `${string}-${string}-${string}-${string}-${string}`
            | undefined;
          const roomId = (
            payload.rooms && payload.rooms.length > 0 ? payload.rooms[0].id : undefined
          ) as `${string}-${string}-${string}-${string}-${string}` | undefined;
          if (projectId && entityId && roomId) {
            const memory = { entityId, roomId, content: { projectId } };
            const state = { projectId, values: {}, data: {}, text: '' };
            const onboarding = await onboardingProvider.get(runtime, memory, state);
            let discordStats = null;
            const project = await prisma.project.findUnique({
              where: { id: projectId },
              include: { Discord: true, NFTs: true },
            });
            if (project && project.Discord) {
              discordStats = {
                memberCount: project.Discord.memberCount,
                papersShared: project.Discord.papersShared,
                messagesCount: project.Discord.messagesCount,
                botAdded: project.Discord.botAdded,
              };
            }
            const currentLevel = onboarding.values?.level || 1;
            const botInstallationUrl = getBotInstallationUrl();
            const nextLevelMessage = generateNextLevelRequirementsMessage(
              currentLevel,
              project,
              botInstallationUrl
            );
            let text = onboarding.text + '\n\n' + nextLevelMessage;
            if (discordStats) {
              text += `\n\nDiscord Stats:\n- Members: ${discordStats.memberCount}\n- Papers Shared: ${discordStats.papersShared}\n- Messages: ${discordStats.messagesCount}\n- Bot Added: ${discordStats.botAdded ? 'Yes' : 'No'}`;
            }
            if (typeof runtime.processActions === 'function') {
              await runtime.processActions(
                {
                  entityId,
                  roomId,
                  content: { text, values: { ...onboarding.values, discordStats } },
                },
                [],
                state
              );
            } else {
              logger.info('[WORLD_CONNECTED] Would send onboarding stats:', text);
            }
          } else {
            logger.info(
              '[WORLD_CONNECTED] Skipping onboarding stats: missing projectId, entityId, or roomId'
            );
          }
        } catch (err) {
          logger.error('Error sending onboarding stats on WORLD_CONNECTED:', err);
        }
      },
    ],
    WORLD_JOINED: [
      async (payload) => {
        logger.debug('WORLD_JOINED event received');
        logger.debug(Object.keys(payload));
      },
      nextLevelRequirementsEvent,
    ],
  },

  services: [DiscordService],
  actions: [
    checkLevelRequirementsAction,
    fetchUserLevelAction,
    getUserLevelAction,
    incrementUserLevelAction,
    updateUserLevelAction,
    inviteDiscordBotAction,
    checkDiscordMemberCountAction,
    sendLevelUpEmailAction,
  ],
  providers: [onboardingProvider, userInfoProvider],
};

export default plugin;
