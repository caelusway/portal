import { Action } from '@elizaos/core';
import { PrismaClient } from '@prisma/client';
import { getProjectId } from '../utils/getProjectId';

const prisma = new PrismaClient();

export const updateUserLevelAction: Action = {
  name: 'updateUserLevel',
  description: 'Updates the onboarding level for a user/project to a specific value. Agent-only.',
  similes: ['incrementUserLevel', 'updateUserLevel'],
  examples: [
    [
      { name: 'CoreAgent', content: { text: 'Set user level to 3', projectId: '123', level: 3 } },
      { name: 'CoreAgent', content: { text: 'Level updated. New level: 3' } },
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
    const level = memory.content.level;
    await prisma.project.update({ where: { id: projectId }, data: { level } });
    const response = {
      text: `Level updated. New level: ${level}`,
      values: { level },
    };
    await callback(response);
    return response;
  },
};
