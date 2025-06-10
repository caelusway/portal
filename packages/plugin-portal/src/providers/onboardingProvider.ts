import { Provider, IAgentRuntime, Memory, State, elizaLogger, ProviderResult } from '@elizaos/core';
import { databaseService } from '../services/database.js';
import { getUserId, getProjectId } from '../utils/getProjectId.js';

export const onboardingProvider: Provider = {
  name: 'PORTAL_ONBOARDING',
  description: 'Provides BioDAO onboarding status and level progression guidance',
  dynamic: false, // Always include in context
  position: 2, // Load after database provider
  private: false, // Include in regular provider list

  get: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> => {
    try {
      const userId = getUserId(message, state);
      const projectId = getProjectId(message, state);
      const agentId = runtime.agentId;

      elizaLogger.info(
        `Portal onboarding provider called for agent: ${agentId}, user: ${userId}, project: ${projectId}`
      );

      // Level definitions
      const LEVELS = {
        1: { label: 'App Started', requirements: ['Wallet connected'] },
        2: {
          label: 'Science NFTs Minted',
          requirements: ['Minted Idea NFT', 'Minted Hypothesis NFT'],
        },
        3: { label: 'Community Initiated', requirements: ['Discord created', '4 Discord members'] },
        4: {
          label: 'Community Growth + Proof',
          requirements: ['10 Discord members', '25 papers shared', '100 messages sent'],
        },
      };

      if (!projectId || projectId === 'unknown') {
        return {
          text: `=== ONBOARDING STATUS ===
Status: Not Started
Next Step: Complete wallet connection and project setup
Level: 0/4

To begin your BioDAO journey, please connect your wallet and complete the onboarding form.`,
          values: {
            onboardingStatus: 'not_started',
            currentLevel: '0',
            nextLevel: '1',
            needsOnboarding: 'true',
            canProgress: 'false',
          },
          data: {
            status: 'not_started',
            currentLevel: 0,
            nextLevel: 1,
            levelInfo: LEVELS[1],
            progress: null,
          },
        };
      }

      // Get project from database
      const project = await databaseService.getProjectById(projectId);

      if (!project) {
        return {
          text: `=== ONBOARDING STATUS ===
Status: Project Not Found
Action Required: Complete onboarding process
Level: 0/4

Please complete the onboarding form to create your project.`,
          values: {
            onboardingStatus: 'project_not_found',
            currentLevel: '0',
            nextLevel: '1',
            needsOnboarding: 'true',
            canProgress: 'false',
          },
          data: {
            status: 'project_not_found',
            currentLevel: 0,
            nextLevel: 1,
            levelInfo: LEVELS[1],
            progress: null,
          },
        };
      }

      // Get additional context
      const discord = await databaseService.getDiscordByProjectId(project.id);
      const nfts = await databaseService.getNFTsByProjectId(project.id);

      const currentLevel = project.level;
      const nextLevel = Math.min(currentLevel + 1, 4);
      const currentLevelInfo = LEVELS[currentLevel as keyof typeof LEVELS];
      const nextLevelInfo = LEVELS[nextLevel as keyof typeof LEVELS];

      // Calculate progress
      const hasIdeaNFT = nfts.some((nft) => nft.type === 'IDEA');
      const hasHypothesisNFT = nfts.some((nft) => nft.type === 'HYPOTHESIS');
      const hasDiscord = !!discord;
      const discordMembers = discord?.memberCount || 0;
      const papersShared = discord?.papersShared || 0;
      const messagesCount = discord?.messagesCount || 0;

      // Check what's needed for next level
      const progressChecks = {
        walletConnected: !!project.wallet,
        ideaNFTMinted: hasIdeaNFT,
        hypothesisNFTMinted: hasHypothesisNFT,
        discordCreated: hasDiscord,
        fourDiscordMembers: discordMembers >= 4,
        tenDiscordMembers: discordMembers >= 10,
        twentyFivePapersShared: papersShared >= 25,
        hundredMessages: messagesCount >= 100,
      };

      // Determine next actions based on current level
      let nextActions = [];
      let canProgress = false;

      switch (currentLevel) {
        case 1:
          if (!hasIdeaNFT) nextActions.push('Mint your Idea NFT');
          if (!hasHypothesisNFT) nextActions.push('Mint your Hypothesis NFT');
          canProgress = hasIdeaNFT && hasHypothesisNFT;
          break;
        case 2:
          if (!hasDiscord) nextActions.push('Set up your Discord server');
          if (hasDiscord && discordMembers < 4)
            nextActions.push(`Invite more members to Discord (${discordMembers}/4)`);
          canProgress = hasDiscord && discordMembers >= 4;
          break;
        case 3:
          if (discordMembers < 10)
            nextActions.push(`Grow Discord community (${discordMembers}/10 members)`);
          if (papersShared < 25)
            nextActions.push(`Share more research papers (${papersShared}/25)`);
          if (messagesCount < 100)
            nextActions.push(`Increase Discord activity (${messagesCount}/100 messages)`);
          canProgress = discordMembers >= 10 && papersShared >= 25 && messagesCount >= 100;
          break;
        case 4:
          nextActions.push('🎉 Maximum level reached! Continue building your research community.');
          canProgress = false;
          break;
      }

      // Build context text
      let contextText = `=== ONBOARDING STATUS ===
Current Level: ${currentLevel}/4 - ${currentLevelInfo?.label || 'Unknown'}
Project: ${project.projectName || 'Unnamed Project'}

=== PROGRESS SUMMARY ===`;

      if (currentLevel < 4) {
        contextText += `\nNext Level: ${nextLevel} - ${nextLevelInfo?.label}
Requirements for Level ${nextLevel}: ${nextLevelInfo?.requirements.join(', ')}

=== NEXT ACTIONS ===`;
        nextActions.forEach((action) => {
          contextText += `\n• ${action}`;
        });

        if (canProgress) {
          contextText += `\n\n✅ Ready to advance to Level ${nextLevel}!`;
        } else {
          contextText += `\n\n⏳ Complete the above actions to advance to Level ${nextLevel}.`;
        }
      } else {
        contextText += `\n\n🎉 Congratulations! You've reached the maximum level.
Continue building and growing your research community!`;
      }

      return {
        text: contextText,
        values: {
          onboardingStatus: 'in_progress',
          currentLevel: currentLevel.toString(),
          nextLevel: nextLevel.toString(),
          currentLevelLabel: currentLevelInfo?.label || 'Unknown',
          nextLevelLabel: nextLevelInfo?.label || 'Max Level',
          canProgress: canProgress.toString(),
          needsOnboarding: 'false',
          hasIdeaNFT: hasIdeaNFT.toString(),
          hasHypothesisNFT: hasHypothesisNFT.toString(),
          hasDiscord: hasDiscord.toString(),
          discordMembers: discordMembers.toString(),
          nextActionsCount: nextActions.length.toString(),
        },
        data: {
          status: 'in_progress',
          currentLevel,
          nextLevel,
          currentLevelInfo,
          nextLevelInfo,
          progress: progressChecks,
          nextActions,
          canProgress,
          project: {
            id: project.id,
            name: project.projectName,
            level: project.level,
          },
          metrics: {
            nftCount: nfts.length,
            hasIdeaNFT,
            hasHypothesisNFT,
            hasDiscord,
            discordMembers,
            papersShared,
            messagesCount,
          },
          levels: LEVELS,
        },
      };
    } catch (error) {
      elizaLogger.error('Error in portal onboarding provider:', error);

      return {
        text: `Error retrieving onboarding status: ${error.message}`,
        values: {
          onboardingStatus: 'error',
          currentLevel: '0',
          error: error.message,
          needsOnboarding: 'true',
        },
        data: {
          status: 'error',
          error: error.message,
          stack: error.stack,
        },
      };
    }
  },
};

export default onboardingProvider;
