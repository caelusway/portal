import { Action } from '@elizaos/core';
import { PrismaClient } from '@prisma/client';
import {
  generateNextLevelRequirementsMessage,
  getBotInstallationUrl,
  getNextLevelRequirements,
} from '../utils/helpers';
import { LEVELS } from '../onboarding/levels';
import { getProjectId } from '../utils/getProjectId';

const prisma = new PrismaClient();

export const checkLevelRequirementsAction: Action = {
  name: 'checkLevelRequirements',
  description: 'Check project next level requirements give user a list of requirements',
  similes: [
    'checkLevelRequirements',
    'checkRequirements',
    'checkNextLevelRequirements',
    'nextLevelRequirements',
  ],
  examples: [
    [
      { name: 'user', content: { text: 'What do I need for the next level?', projectId: '123' } },
      {
        name: 'CoreAgent',
        content: { text: 'Requirements for next level: Minted Idea NFT, Minted Hypothesis NFT' },
      },
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
    const currentLevel = project.level || 1;
    const botInstallationUrl = getBotInstallationUrl();
    const requirements = generateNextLevelRequirementsMessage(
      currentLevel,
      project,
      botInstallationUrl
    );
    const response = {
      text: `${requirements}`,
      values: {
        currentLevel,
        requirements,
        nextLevel: currentLevel + 1,
        nextLevelInfo: LEVELS[currentLevel + 1],
      },
    };
    await callback(response);
    return response;
  },
};
