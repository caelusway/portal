import { Action, IAgentRuntime, Memory, State, HandlerCallback, elizaLogger } from '@elizaos/core';
import { databaseService } from '../services/database.js';
import { levelManager } from '../services/level-manager.js';
import { getProjectId, getUserId } from '../utils/getProjectId.js';

export const checkProgressAction: Action = {
  name: 'CHECK_PROGRESS',
  similes: [
    'CHECK_LEVEL',
    'SHOW_PROGRESS',
    'LEVEL_STATUS',
    'CURRENT_LEVEL',
    'PROGRESS_CHECK',
    'WHERE_AM_I',
    'WHAT_LEVEL',
  ],
  description: 'Check current level progress and requirements for advancement',
  validate: async (runtime: IAgentRuntime, memory: Memory, state?: State) => {
    const projectId = getProjectId(memory, state);
    return !!projectId;
  },
  handler: async (
    runtime: IAgentRuntime,
    memory: Memory,
    state: State,
    options: any,
    callback?: HandlerCallback
  ): Promise<any> => {
    try {
      const userId = getUserId(memory);
      const projectId = getProjectId(memory, state);

      elizaLogger.info('Checking progress for user:', userId);

      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const project = await databaseService.getProjectById(projectId);

      if (!project) {
        const response = {
          text: "I couldn't find your project. Please make sure you've completed the onboarding process first.",
          values: { error: 'Project not found' },
        };
        await callback?.(response);
        return response;
      }

      // Check level progress
      const progress = await levelManager.checkLevelProgress(project.id);
      const currentLevelInfo = levelManager.getLevelInfo(progress.currentLevel);
      const nextLevelInfo = progress.nextLevel
        ? levelManager.getLevelInfo(progress.nextLevel)
        : null;

      // Get additional context
      const discord = await databaseService.getDiscordByProjectId(project.id);
      const nfts = await databaseService.getNFTsByProjectId(project.id);

      // Build response
      let responseText = `📊 **Progress Report for ${project.projectName || 'Your Project'}**\n\n`;

      responseText += `🎯 **Current Level: ${progress.currentLevel}** - ${currentLevelInfo?.label}\n`;
      responseText += `${currentLevelInfo?.description}\n\n`;

      if (nextLevelInfo) {
        responseText += `🎯 **Next Level: ${progress.nextLevel}** - ${nextLevelInfo.label}\n`;
        responseText += `${nextLevelInfo.description}\n\n`;

        responseText += `**Requirements for Level ${progress.nextLevel}:**\n`;
        for (const req of nextLevelInfo.requirements) {
          const isCompleted = progress.completedRequirements.includes(req);
          responseText += `${isCompleted ? '✅' : '❌'} ${req}\n`;
        }

        if (progress.canAdvance) {
          responseText += `\n🎉 **You're ready to advance!** All requirements completed!\n`;
          responseText += `Say "advance level" or "level up" to proceed to Level ${progress.nextLevel}.`;
        } else {
          responseText += `\n📋 **Still needed:**\n`;
          for (const req of progress.missingRequirements) {
            responseText += `• ${req}\n`;
          }
        }
      } else {
        responseText += `🏆 **Congratulations!** You've reached the maximum level!\n`;
      }

      // Add current stats
      responseText += `\n📈 **Current Stats:**\n`;
      responseText += `• NFTs Minted: ${nfts.length}\n`;
      if (discord) {
        responseText += `• Discord Members: ${discord.memberCount}\n`;
        responseText += `• Papers Shared: ${discord.papersShared}\n`;
        responseText += `• Messages Sent: ${discord.messagesCount}\n`;
      } else {
        responseText += `• Discord: Not set up\n`;
      }

      const response = {
        text: responseText,
        values: {
          currentLevel: progress.currentLevel,
          canAdvance: progress.canAdvance,
          progress: progress,
          stats: {
            nftCount: nfts.length,
            discordMembers: discord?.memberCount || 0,
            papersShared: discord?.papersShared || 0,
            messagesCount: discord?.messagesCount || 0,
          },
        },
      };

      await callback?.(response);
      return response;
    } catch (error) {
      elizaLogger.error('Error in check progress action:', error);
      const response = {
        text: 'Sorry, I encountered an error while checking your progress. Please try again.',
        values: { error: error.message },
      };
      await callback?.(response);
      return response;
    }
  },
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'What level am I?', projectId: '123' },
      },
      {
        name: '{{user2}}',
        content: { text: 'Check my progress', projectId: '456' },
      },
    ],
  ],
};

export default checkProgressAction;
