import { Action } from '@elizaos/core';
import { PrismaClient } from '@prisma/client';
import { getProjectId } from '../utils/getProjectId';

const prisma = new PrismaClient();

export const checkDiscordMemberCountAction: Action = {
  name: 'checkDiscordMemberCount',
  description: "Returns the current member count for the user's Discord server.",
  similes: ['checkDiscordMemberCount', 'checkDiscordLevelProgress', 'getDiscordMemberCount'],
  examples: [
    [
      { name: 'user', content: { text: 'How many members are in my Discord?', projectId: '123' } },
      { name: 'CoreAgent', content: { text: 'Current Discord member count: 5' } },
    ],
  ],
  validate: async (_runtime, memory, state) => {
    const projectId = getProjectId(memory, state);
    if (!projectId) throw new Error('projectId is required');
    if (typeof projectId !== 'string') throw new Error('projectId must be a string');
    return true;
  },
  handler: async (_runtime, memory, state, _options, callback) => {
    const projectId = getProjectId(memory, state);
    if (!projectId) throw new Error('projectId is required');
    if (typeof projectId !== 'string') throw new Error('projectId must be a string');
    const discord = await prisma.discord.findUnique({ where: { projectId } });
    if (!discord) throw new Error('Discord server not found for this project');
    const response = {
      text: `Current Discord member count: ${discord.memberCount}`,
      values: { memberCount: discord.memberCount },
    };
    await callback(response);
    return response;
  },
};
