import { Action, IAgentRuntime, Memory, State, HandlerCallback, elizaLogger } from '@elizaos/core';
import { databaseService } from '../services/database.js';
import { levelManager } from '../services/level-manager.js';
import { validatePortalConfig } from '../environment.js';
import { getProjectId, getUserId } from '../utils/getProjectId.js';

export const advanceLevelAction: Action = {
  name: 'ADVANCE_LEVEL',
  similes: [
    'LEVEL_UP',
    'NEXT_LEVEL',
    'ADVANCE',
    'PROGRESS_LEVEL',
    'MOVE_TO_NEXT_LEVEL',
    'UPGRADE_LEVEL',
  ],
  description: 'Advance to the next level if requirements are met',
  validate: async (runtime: IAgentRuntime, memory: Memory, state?: State) => {
    const config = await validatePortalConfig(runtime);
    const projectId = getProjectId(memory, state);
    return !!(config.DATABASE_URL && projectId);
  },
  handler: async (
    runtime: IAgentRuntime,
    memory: Memory,
    state: State,
    options: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      const userId = getUserId(memory);
      const projectId = getProjectId(memory, state);

      elizaLogger.info('Processing level advancement for user:', userId);

      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // Get project
      const project = await databaseService.getProjectById(projectId);

      if (!project) {
        const response = {
          text: "I couldn't find your project. Please complete onboarding first.",
          values: { error: 'Project not found' },
        };
        await callback?.(response);
        return false;
      }

      // Check level progress
      const progress = await levelManager.checkLevelProgress(project.id);

      if (!progress.canAdvance) {
        let responseText = `You're not ready to advance to Level ${progress.nextLevel} yet.\n\n`;
        responseText += `**Missing Requirements:**\n`;
        for (const req of progress.missingRequirements) {
          responseText += `❌ ${req}\n`;
        }
        responseText += `\n**Completed Requirements:**\n`;
        for (const req of progress.completedRequirements) {
          responseText += `✅ ${req}\n`;
        }
        responseText += `\nKeep working on the missing requirements and try again!`;

        const response = {
          text: responseText,
          values: {
            canAdvance: false,
            missingRequirements: progress.missingRequirements,
            completedRequirements: progress.completedRequirements,
          },
        };
        await callback?.(response);
        return false;
      }

      // Advance the level
      const levelResult = await levelManager.advanceLevel(project.id);

      if (levelResult.success) {
        const newLevelInfo = levelManager.getLevelInfo(levelResult.newLevel);
        let responseText = `🎉 ${levelResult.message}\n\n`;

        if (newLevelInfo) {
          responseText += `**${newLevelInfo.label}**\n${newLevelInfo.description}\n\n`;

          if (levelResult.newLevel < 4) {
            const nextLevelInfo = levelManager.getLevelInfo(levelResult.newLevel + 1);
            if (nextLevelInfo) {
              responseText += `**Next Goal - Level ${levelResult.newLevel + 1}: ${nextLevelInfo.label}**\n`;
              responseText += `Requirements:\n`;
              for (const req of nextLevelInfo.requirements) {
                responseText += `• ${req}\n`;
              }
            }
          } else {
            responseText += `🏆 **Congratulations!** You've reached the maximum level and completed the BioDAO onboarding process!`;
          }
        }

        const response = {
          text: responseText,
          values: {
            success: true,
            newLevel: levelResult.newLevel,
            levelInfo: newLevelInfo,
          },
        };
        await callback?.(response);
        return true;
      } else {
        const response = {
          text: `Failed to advance level: ${levelResult.message}`,
          values: { success: false, error: levelResult.message },
        };
        await callback?.(response);
        return false;
      }
    } catch (error) {
      elizaLogger.error('Error in advance level action:', error);
      const response = {
        text: 'Sorry, I encountered an error while trying to advance your level. Please try again.',
        values: { error: error.message },
      };
      await callback?.(response);
      return false;
    }
  },
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Level up', projectId: '123' },
      },
      {
        name: '{{user2}}',
        content: { text: 'Advance to next level', projectId: '456' },
      },
    ],
  ],
};

export default advanceLevelAction;
