import { Action } from '@elizaos/core';
import { sendLevelUpEmail } from '../services/emailService';
import { getProjectId } from '../utils/getProjectId';
import { prisma } from '../utils/db';

export const sendLevelUpEmailAction: Action = {
  name: 'sendLevelUpEmail',
  description: 'Sends a level-up email to the user using EmailService.',
  similes: ['sendLevelUpEmail', 'sendLevelUpNotification', 'sendLevelUpNotificationEmail'],
  examples: [
    [
      {
        name: 'CoreAgent',
        content: { text: 'Send level-up email to user', projectId: '123', level: 3 },
      },
      {
        name: 'CoreAgent',
        content: { text: 'Level-up email sent to user@example.com for level 3' },
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
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const userEmail = String(project?.email);
    const level = Number(project?.level);
    await sendLevelUpEmail(userEmail, level);
    const response = {
      text: `Level-up email sent to ${userEmail} for level ${level}`,
      values: { userEmail, level },
    };
    await callback(response);
    return response;
  },
};
