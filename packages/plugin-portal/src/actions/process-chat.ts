import { Action, IAgentRuntime, Memory, State, HandlerCallback, elizaLogger } from '@elizaos/core';
import { databaseService } from '../services/database.js';
import { levelManager } from '../services/level-manager.js';
import { validatePortalConfig } from '../environment.js';
import { getProjectId, getUserId } from '../utils/getProjectId.js';

export const processChatAction: Action = {
  name: 'PROCESS_CHAT',
  similes: ['CHAT', 'MESSAGE', 'TALK', 'CONVERSATION', 'HELP', 'GUIDANCE'],
  description: 'Process general chat messages and provide contextual guidance',
  validate: async (runtime: IAgentRuntime, memory: Memory, state?: State) => {
    const config = await validatePortalConfig(runtime);
    return !!config.DATABASE_URL;
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

      elizaLogger.info('Processing chat for user:', userId);

      const { userMessage } = options;

      // Get project
      let project = null;
      if (projectId) {
        project = await databaseService.getProjectById(projectId);
      }

      if (!project) {
        const response = {
          text: "Welcome to BioDAO! I'm CoreAgent, your AI assistant for launching your Decentralized Science project. To get started, please complete the onboarding process to create your project profile.",
          values: { needsOnboarding: true },
        };
        await callback?.(response);
        return response;
      }

      // Get or create chat session
      const sessionId = await databaseService.getOrCreateChatSession(project.id);

      // Save user message
      await databaseService.saveChatMessage(
        sessionId,
        userMessage || memory.content?.text || 'Chat message',
        false
      );

      // Get current progress
      const progress = await levelManager.checkLevelProgress(project.id);

      // Generate contextual response based on level
      let responseText = '';

      switch (progress.currentLevel) {
        case 1:
          responseText = getLevel1Guidance(project, progress);
          break;
        case 2:
          responseText = getLevel2Guidance(project, progress);
          break;
        case 3:
          responseText = getLevel3Guidance(project, progress);
          break;
        case 4:
          responseText = getLevel4Guidance(project, progress);
          break;
        default:
          responseText = `🏆 Congratulations! You've completed all levels of the BioDAO onboarding process. Your project "${project.projectName}" is now fully established!`;
      }

      // Save agent response
      await databaseService.saveChatMessage(sessionId, responseText, true);

      const response = {
        text: responseText,
        values: {
          currentLevel: progress.currentLevel,
          canAdvance: progress.canAdvance,
          projectName: project.projectName,
          sessionId: sessionId,
        },
      };

      await callback?.(response);
      return response;
    } catch (error) {
      elizaLogger.error('Error in process chat action:', error);
      const response = {
        text: 'Sorry, I encountered an error while processing your message. Please try again.',
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
        content: { text: 'How do I progress?', projectId: '123' },
      },
      {
        name: '{{user2}}',
        content: { text: 'What should I do next?', projectId: '456' },
      },
    ],
  ],
};

// Helper functions moved outside the action object
function getLevel1Guidance(project: any, progress: any): string {
  const nfts = project.NFTs || [];
  const hasIdeaNFT = nfts.some((nft: any) => nft.type === 'idea');
  const hasHypothesisNFT = nfts.some(
    (nft: any) => nft.type === 'hypothesis' || nft.type === 'vision'
  );

  let response = `Welcome to Level 1: Science NFT Creation! 🧬\n\n`;
  response += `Project: ${project.projectName || 'Your Project'}\n\n`;
  response += `**Progress:**\n`;
  response += `${hasIdeaNFT ? '✅' : '❌'} Idea NFT\n`;
  response += `${hasHypothesisNFT ? '✅' : '❌'} Vision NFT\n\n`;

  if (!hasIdeaNFT) {
    response += `Let me mint your Idea NFT now! This will represent your core scientific concept on the blockchain.`;
  } else if (!hasHypothesisNFT) {
    response += `Great! Now let me mint your Vision NFT to complete your scientific foundation.`;
  } else {
    response += `🎉 Both NFTs are minted! You're ready to advance to Level 2 and set up your Discord community.`;
  }

  return response;
}

function getLevel2Guidance(project: any, progress: any): string {
  const discord = project.Discord;

  let response = `Level 2: Discord Setup! 💬\n\n`;
  response += `**Progress:**\n`;

  if (!discord) {
    response += `❌ Discord server not set up\n\n`;
    response += `Let's create your Discord server! You can use our BIO template: https://discord.new/wbyrDkxwyhNp\n\n`;
    response += `Once created, share your invite link with me (it should look like discord.gg/123abc).`;
  } else {
    response += `✅ Discord server: ${discord.serverName}\n`;
    response += `📊 Members: ${discord.memberCount}/4 required\n`;
    response += `🤖 Bot installed: ${discord.botAdded ? 'Yes' : 'No'}\n\n`;

    if (!discord.botAdded) {
      response += `Please install our verification bot to track your progress. I'll provide the installation link once your server is fully registered.`;
    } else if (discord.memberCount < 4) {
      response += `Great setup! Now invite ${4 - discord.memberCount} more members to reach the 4-member requirement for Level 3.`;
    } else {
      response += `🎉 All requirements met! You're ready to advance to Level 3.`;
    }
  }

  return response;
}

function getLevel3Guidance(project: any, progress: any): string {
  const discord = project.Discord;

  let response = `Level 3: Community Growth! 🌱\n\n`;
  response += `**Progress:**\n`;
  response += `📊 Members: ${discord?.memberCount || 0}/10 required\n`;
  response += `📄 Papers shared: ${discord?.papersShared || 0}/25 required\n`;
  response += `💬 Messages sent: ${discord?.messagesCount || 0}/100 required\n\n`;

  const missingMembers = Math.max(0, 10 - (discord?.memberCount || 0));
  const missingPapers = Math.max(0, 25 - (discord?.papersShared || 0));
  const missingMessages = Math.max(0, 100 - (discord?.messagesCount || 0));

  if (missingMembers > 0) {
    response += `🎯 Focus: Invite ${missingMembers} more researchers to your Discord.\n`;
  }
  if (missingPapers > 0) {
    response += `📚 Focus: Share ${missingPapers} more scientific papers with brief descriptions.\n`;
  }
  if (missingMessages > 0) {
    response += `💭 Focus: Encourage ${missingMessages} more messages through discussions.\n`;
  }

  if (progress.canAdvance) {
    response += `\n🎉 All requirements met! You're ready to advance to Level 4.`;
  }

  return response;
}

function getLevel4Guidance(project: any, progress: any): string {
  return `🏆 Level 4: Scientific Proof Complete!\n\nCongratulations! You've successfully:\n✅ Built a community of 10+ researchers\n✅ Shared 25+ scientific papers\n✅ Generated 100+ meaningful discussions\n\nYour BioDAO "${project.projectName}" is now fully established and ready for advanced scientific collaboration!`;
}

export default processChatAction;
