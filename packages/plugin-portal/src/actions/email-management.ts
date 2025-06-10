import { Action, IAgentRuntime, Memory, State, HandlerCallback, elizaLogger } from '@elizaos/core';
import { databaseService } from '../services/database.js';
import { emailService } from '../services/email-service.js';
import { levelManager } from '../services/level-manager.js';
import { getProjectId, getUserId } from '../utils/getProjectId.js';

export const emailManagementAction: Action = {
  name: 'EMAIL_MANAGEMENT',
  similes: [
    'SEND_EMAIL',
    'RESEND_EMAIL',
    'LEVEL_UP_EMAIL',
    'SANDBOX_EMAIL',
    'RESEND_LEVEL_EMAIL',
    'RESEND_SANDBOX_EMAIL',
  ],
  description:
    'Manage email notifications for level ups, sandbox access, and other BioDAO communications',
  validate: async (runtime: IAgentRuntime, memory: Memory, state?: State) => {
    const projectId = getProjectId(memory, state);
    const emailType = (memory.content as any)?.emailType;
    return !!(projectId && emailType);
  },
  handler: async (
    runtime: IAgentRuntime,
    memory: Memory,
    state: State,
    options: any,
    callback?: HandlerCallback
  ): Promise<any> => {
    try {
      const userId = getUserId(memory, state);
      const projectId = getProjectId(memory, state);
      const emailType = (memory.content as any)?.emailType || options?.emailType;
      const level = (memory.content as any)?.level || options?.level;

      elizaLogger.info(
        `📧 Processing email management for project ${projectId}, type: ${emailType}`
      );

      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const project = await databaseService.getProjectById(projectId);
      if (!project) {
        const response = {
          text: '❌ Project not found. Please complete onboarding first.',
          values: { error: 'Project not found' },
        };
        await callback?.(response);
        return response;
      }

      let success = false;
      let responseText = '';

      switch (emailType) {
        case 'level_up':
        case 'resend_level':
          if (!project.email) {
            responseText =
              '❌ No email address found for your project. Please update your profile with an email address to receive notifications.';
            break;
          }

          const targetLevel = level || project.level;
          success = await levelManager.resendLevelUpEmail(projectId, targetLevel);

          if (success) {
            responseText = `✅ Level ${targetLevel} congratulations email has been sent to ${project.email}!`;
          } else {
            responseText = `❌ Failed to send level up email. Please try again or contact support.`;
          }
          break;

        case 'sandbox':
        case 'resend_sandbox':
          if (project.level < 4) {
            responseText = `❌ Sandbox notifications are only sent for Level 4 projects. Your current level is ${project.level}.`;
            break;
          }

          success = await levelManager.resendSandboxEmail(projectId);

          if (success) {
            responseText = `✅ Sandbox notification email has been sent to the Bio team for your project "${project.projectName || 'Unnamed Project'}"!`;
          } else {
            responseText = `❌ Failed to send sandbox notification email. Please try again or contact support.`;
          }
          break;

        case 'cofounder_invite':
          const recipientEmail = (memory.content as any)?.recipientEmail || options?.recipientEmail;
          const inviteToken = (memory.content as any)?.inviteToken || options?.inviteToken;

          if (!recipientEmail || !inviteToken) {
            responseText =
              '❌ Recipient email and invite token are required for co-founder invitations.';
            break;
          }

          success = await emailService?.sendCoFounderInvite(
            recipientEmail,
            inviteToken,
            project.fullName || 'BioDAO Member',
            project.projectName || 'Unnamed Project'
          );

          if (success) {
            responseText = `✅ Co-founder invitation has been sent to ${recipientEmail}!`;
          } else {
            responseText = `❌ Failed to send co-founder invitation. Please try again or contact support.`;
          }
          break;

        default:
          responseText = `❌ Unknown email type: ${emailType}. Available types: level_up, sandbox, cofounder_invite`;
          break;
      }

      const response = {
        text: responseText,
        values: {
          success,
          emailType,
          projectId,
          level: level || project.level,
          recipientEmail: project.email,
        },
      };

      await callback?.(response);
      return response;
    } catch (error) {
      elizaLogger.error('❌ Error in email management action:', error);
      const response = {
        text: `❌ Sorry, I encountered an error while managing emails: ${error.message}\n\nPlease try again or contact support if the issue persists.`,
        values: { success: false, error: error.message },
      };
      await callback?.(response);
      return response;
    }
  },
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Resend my level up email', projectId: '123', emailType: 'level_up' },
      },
      {
        name: '{{user2}}',
        content: { text: "I'll resend your level up email now!", emailType: 'level_up' },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Send sandbox notification to Bio team',
          projectId: '456',
          emailType: 'sandbox',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: "I'll send the sandbox notification to the Bio team!",
          emailType: 'sandbox',
        },
      },
    ],
  ],
};

export default emailManagementAction;
