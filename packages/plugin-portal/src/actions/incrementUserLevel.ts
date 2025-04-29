import { Action } from '@elizaos/core';
import { PrismaClient } from '@prisma/client';
import { getProjectId } from '../utils/getProjectId';

const prisma = new PrismaClient();

export const incrementUserLevelAction: Action = {
  name: 'incrementUserLevel',
  description: 'Increments the onboarding level for a user/project by 1. Agent-only.',
  similes: ['updateUserLevel', 'incrementUserLevel'],
  examples: [
    [
      { name: 'CoreAgent', content: { text: 'Increment user level', projectId: '123' } },
      { name: 'CoreAgent', content: { text: 'Level incremented. New level: 3' } },
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
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');
    const newLevel = (project.level || 1) + 1;
    await prisma.project.update({ where: { id: projectId }, data: { level: newLevel } });
    const response = {
      text: `Level incremented. New level: ${newLevel}`,
      values: { level: newLevel },
    };
    await callback(response);
    return response;
  },
};
