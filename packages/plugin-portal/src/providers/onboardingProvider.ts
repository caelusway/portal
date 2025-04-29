import { Provider, IAgentRuntime, State, Memory, ProviderResult } from '@elizaos/core';
import { PrismaClient } from '@prisma/client';
import { LEVELS } from '../onboarding/levels';
import { getProjectId } from '../utils/getProjectId';

const prisma = new PrismaClient();

/**
 * Provider to get and set onboarding state (level) for a user/project.
 * Assumes a Project table with 'id' and 'level' fields.
 */
export const onboardingProvider: Provider = {
  name: 'onboardingProvider',
  description: 'Provides onboarding/level state for a user/project from the database.',

  // Get the current onboarding level for a user/project
  get: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> => {
    const projectId = getProjectId(message, state);
    if (!projectId) {
      throw new Error('No projectId provided in message or state');
    }
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new Error(`Project not found for id: ${projectId}`);
    }
    const level = project.level || 1;
    const levelInfo = LEVELS[level];
    return {
      data: { project, levelInfo },
      values: { level, levelInfo },
      text: `Current level: ${level} - ${levelInfo?.label}`,
    };
  },
};
