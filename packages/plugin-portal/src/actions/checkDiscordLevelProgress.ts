import { Action } from '@elizaos/core';
import { PrismaClient } from '@prisma/client';
import { getProjectId } from '../utils/getProjectId';
import { LEVELS, getNextLevelRequirements } from '../onboarding/levels';

const prisma = new PrismaClient();

export const checkDiscordLevelProgressAction: Action = {
  name: 'checkDiscordLevelProgress',
  description: 'Checks Discord stats and performs level-up if requirements are met.',
  similes: ['checkDiscordLevelProgress', 'checkDiscordProgress', 'checkDiscordLevelUp'],
  examples: [
    [
      {
        name: 'CoreAgent',
        content: { text: 'Check Discord stats for level up', projectId: '123' },
      },
      { name: 'CoreAgent', content: { text: 'Level up! New level: 3' } },
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
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { Discord: true },
    });
    if (!project) throw new Error('Project not found');
    if (!project.Discord) throw new Error('No Discord data for this project');
    const discord = project.Discord;
    const currentLevel = project.level;
    let leveledUp = false;
    let newLevel = currentLevel;
    if (currentLevel === 2 && discord.botAdded && discord.memberCount >= 4) {
      leveledUp = true;
      newLevel = 3;
    } else if (
      currentLevel === 3 &&
      discord.memberCount >= 5 &&
      discord.papersShared >= 5 &&
      discord.messagesCount >= 50
    ) {
      leveledUp = true;
      newLevel = 4;
    }
    if (leveledUp) {
      await prisma.project.update({ where: { id: projectId }, data: { level: newLevel } });
    }
    // Prepare insights
    const nextLevel = leveledUp ? newLevel + 1 : currentLevel + 1;
    const nextLevelInfo = LEVELS[nextLevel];
    const nextReqs = getNextLevelRequirements(currentLevel);
    // Check which requirements are unmet
    const unmet = [];
    if (currentLevel === 2) {
      if (!discord.botAdded) unmet.push('Discord bot not added');
      if ((discord.memberCount || 0) < 4) unmet.push('Need at least 4 Discord members');
    } else if (currentLevel === 3) {
      if ((discord.memberCount || 0) < 5) unmet.push('Need at least 5 Discord members');
      if ((discord.papersShared || 0) < 5) unmet.push('Need at least 5 papers shared');
      if ((discord.messagesCount || 0) < 50) unmet.push('Need at least 50 messages sent');
    }
    // Build detailed text
    let text = leveledUp
      ? `🎉 Level up! New level: ${newLevel} (${LEVELS[newLevel]?.label})\n`
      : `No level up. Current level: ${currentLevel} (${LEVELS[currentLevel]?.label})\n`;
    text += `\nDiscord Stats:\n- Members: ${discord.memberCount}\n- Papers Shared: ${discord.papersShared}\n- Messages: ${discord.messagesCount}\n- Bot Added: ${discord.botAdded ? 'Yes' : 'No'}\n`;
    if (unmet.length > 0) {
      text += `\nUnmet requirements for next level:\n- ${unmet.join('\n- ')}\n`;
    } else {
      text += '\nAll requirements for next level are met!';
    }
    if (nextLevelInfo) {
      text += `\n\nNext Level (${nextLevel}): ${nextLevelInfo.label}\nRequirements: ${nextLevelInfo.requirements.join(', ')}`;
    }
    const response = {
      text,
      values: {
        leveledUp,
        newLevel,
        currentLevel,
        discordStats: {
          memberCount: discord.memberCount,
          papersShared: discord.papersShared,
          messagesCount: discord.messagesCount,
          botAdded: discord.botAdded,
        },
        unmetRequirements: unmet,
        nextLevel: nextLevel,
        nextLevelInfo,
      },
      data: {
        project,
        discord,
        nextLevelInfo,
        unmetRequirements: unmet,
      },
    };
    await callback(response);
    return response;
  },
};
