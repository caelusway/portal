import { Action, IAgentRuntime, Memory, State } from '@elizaos/core';
import { getBotInstallationUrl } from '../utils/helpers';
import { getProjectId } from '../utils/getProjectId';

export const inviteDiscordBotAction: Action = {
  name: 'inviteDiscordBot',
  description: 'Generates and returns the Discord bot invite link.',
  similes: ['inviteDiscordBot', 'getDiscordBotInviteLink', 'getDiscordInviteLink'],
  examples: [
    [
      { name: 'user', content: { text: 'Give me the Discord bot invite link', projectId: '123' } },
      {
        name: 'CoreAgent',
        content: {
          text: 'Here is your Discord bot invite link: https://discord.com/oauth2/authorize?...',
        },
      },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, memory: Memory, state: State) => {
    const projectId = getProjectId(memory, state);
    if (!projectId) throw new Error('projectId is required');
    if (typeof projectId !== 'string') throw new Error('projectId must be a string');
    return true;
  },
  handler: async (_runtime, _memory, _state, _options, callback) => {
    const url = getBotInstallationUrl();
    const response = {
      text: `Here is your Discord bot invite link: ${url}`,
      values: { url },
    };
    await callback(response);
    return response;
  },
};
