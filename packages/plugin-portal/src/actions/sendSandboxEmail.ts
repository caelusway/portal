import { Action } from '@elizaos/core';
import { PrismaClient } from '@prisma/client';
import { sendSandboxEmail } from '../services/emailService';
import { getProjectId } from '../utils/getProjectId';
const prisma = new PrismaClient();

export const sendSandboxEmailAction: Action = {
  name: 'sendSandboxEmail',
  description: 'Sends a sandbox notification email to the BioDAO team using EmailService.',
  similes: ['sendSandboxEmail', 'sendSandboxNotificationEmail', 'sendSandboxNotification'],
  examples: [
    [
      {
        name: 'CoreAgent',
        content: {
          text: 'Send sandbox notification email',
          projectId: '123',
          userEmail: 'user@example.com',
        },
      },
      {
        name: 'CoreAgent',
        content: {
          text: 'Sandbox notification email sent for project 123',
          values: { projectId: '123', userEmail: 'user@example.com' },
        },
      },
    ],
  ],
  validate: async (_runtime, memory, _state) => {
    const projectId = getProjectId(memory, _state);
    if (!projectId) throw new Error('projectId is required');
    if (typeof projectId !== 'string') throw new Error('projectId must be a string');
    return true;
  },
  handler: async (_runtime, memory, _state, _options, callback) => {
    const projectId = getProjectId(memory, _state);
    if (!projectId) throw new Error('projectId is required');
    if (typeof projectId !== 'string') throw new Error('projectId must be a string');
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { Discord: true },
    });
    if (!project) throw new Error('Project not found');
    await sendSandboxEmail(project);
    const response = {
      text: `Sandbox notification email sent for project ${projectId}`,
      values: { projectId, userEmail: memory.content.userEmail },
    };
    await callback(response);
    return response;
  },
};
