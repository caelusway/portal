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

// Import actions
import { checkLevelRequirementsAction } from './actions/check-level-requirements';
import { fetchUserLevelAction } from './actions/fetch-user-level';
import { getUserLevelAction } from './actions/get-user-level';
import { incrementUserLevelAction } from './actions/increment-user-level';
import { updateUserLevelAction } from './actions/update-user-level';
import { inviteDiscordBotAction } from './actions/invite-discord-bot';
import { checkDiscordMemberCountAction } from './actions/check-discord-member-count';
import { sendEmailAction } from './actions/send-email';
import { sendLevelUpEmailAction } from './actions/send-level-up-email';

// Import services
import { UserLevelService } from './services/user-level-service';
import { SupabaseService } from './services/supabase-service';
import { DiscordService as DiscordService1 } from './services/discordService';

// Import Discord module
import { DiscordService } from './discord/service';
import chatWithAttachments from './discord/actions/chatWithAttachments';
import downloadMedia from './discord/actions/downloadMedia';
import summarizeConversation from './discord/actions/summarizeConversation';
import transcribeMedia from './discord/actions/transcribeMedia';

// Import providers
import {
  channelStateProvider,
  voiceStateProvider,
  supabaseStateProvider,
  userStateProvider,
} from './providers';

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
    // Register Discord actions
    runtime.registerAction(incrementUserLevelAction);
    runtime.registerAction(updateUserLevelAction);
    runtime.registerAction(fetchUserLevelAction);
    runtime.registerAction(checkLevelRequirementsAction);
    runtime.registerAction(getUserLevelAction);
    runtime.registerAction(sendLevelUpEmailAction);
    runtime.registerAction(sendEmailAction);
    runtime.registerAction(inviteDiscordBotAction);
    runtime.registerAction(checkDiscordMemberCountAction);

    // Register Discord service
    runtime.registerService(DiscordService);
    runtime.registerService(DiscordService1);

    // Register providers
    runtime.registerProvider(channelStateProvider);
    runtime.registerProvider(voiceStateProvider);
    runtime.registerProvider(supabaseStateProvider);
    runtime.registerProvider(userStateProvider);
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
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
    VOICE_MESSAGE_RECEIVED: [
      async (params) => {
        logger.debug('VOICE_MESSAGE_RECEIVED event received');
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
    WORLD_CONNECTED: [
      async (params) => {
        logger.debug('WORLD_CONNECTED event received');
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
    WORLD_JOINED: [
      async (params) => {
        logger.debug('WORLD_JOINED event received');
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
  },

  services: [UserLevelService, SupabaseService, DiscordService, DiscordService1],
  actions: [
    checkLevelRequirementsAction,
    fetchUserLevelAction,
    getUserLevelAction,
    incrementUserLevelAction,
    updateUserLevelAction,
    inviteDiscordBotAction,
    checkDiscordMemberCountAction,
    sendEmailAction,
    sendLevelUpEmailAction,
    // Discord actions
    chatWithAttachments,
    downloadMedia,
    summarizeConversation,
    transcribeMedia,
  ],
  providers: [
    // Discord providers
    channelStateProvider,
    voiceStateProvider,
    // Supabase provider
    supabaseStateProvider,
    // User state provider
    userStateProvider,
  ],
};

export default plugin;
