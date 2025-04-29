import { Provider, IAgentRuntime, State, Memory, ProviderResult } from '@elizaos/core';
import { PrismaClient } from '@prisma/client';
import { getProjectId } from '../utils/getProjectId';

const prisma = new PrismaClient();

/**
 * Provider to fetch user/project info by projectId.
 */
export const userInfoProvider: Provider = {
  name: 'userInfoProvider',
  description: 'Provides user/project info from the database given a projectId.',

  get: async (_runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> => {
    const projectId = getProjectId(message, state);
    if (!projectId) {
      throw new Error('No projectId provided in message or state');
    }
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { Discord: true, NFTs: true },
    });
    if (!project) {
      throw new Error(`Project not found for id: ${projectId}`);
    }
    return {
      data: { project },
      values: { projectId },
      text: `User/project info for projectId: ${projectId}`,
    };
  },
};
