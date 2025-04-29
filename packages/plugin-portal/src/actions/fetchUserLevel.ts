import { Action } from '@elizaos/core';
import { PrismaClient } from '@prisma/client';
import { getProjectId } from '../utils/getProjectId';

const prisma = new PrismaClient();

export const fetchUserLevelAction: Action = {
  name: 'fetchUserLevel',
  description: 'Fetches the current onboarding level for a user/project.',
  similes: ['getUserLevel', 'checkLevelRequirements'],
  examples: [
    [
      { name: 'user', content: { text: 'What is my current level?', projectId: '123' } },
      { name: 'CoreAgent', content: { text: 'Current level: 2' } },
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
    const response = {
      text: `Current level: ${project.level}`,
      values: { level: project.level },
    };
    await callback(response);
    return response;
  },
};
