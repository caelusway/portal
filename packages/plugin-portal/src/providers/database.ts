import { Provider, IAgentRuntime, Memory, State, elizaLogger, ProviderResult } from '@elizaos/core';
import { databaseService } from '../services/database.js';
import { getUserId, getProjectId } from '../utils/getProjectId.js';

export const databaseProvider: Provider = {
  name: 'PORTAL_DATABASE',
  description: 'Provides BioDAO portal user context and progress information',
  dynamic: false, // Always include this provider in context
  position: 1, // High priority - load early
  private: false, // Include in regular provider list

  get: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> => {
    try {
      // Get user context from message using utility functions
      const userId = getUserId(message, state);
      const projectId = getProjectId(message, state);
      const roomId = message.roomId;
      const agentId = runtime.agentId;

      elizaLogger.info(
        `Portal database provider called for agent: ${agentId}, user: ${userId}, project: ${projectId}, room: ${roomId}`
      );

      // Get project information
      let project = null;

      // If we have a specific projectId, use it first
      if (projectId && projectId !== 'unknown') {
        project = await databaseService.getProjectById(projectId);
      }

      // If no project found and we have userId, try to find by user identifiers
      if (!project && userId && userId !== 'unknown') {
        // First try privyId
        project = await databaseService.getProjectByPrivyId(userId);

        // If not found, try wallet
        if (!project) {
          project = await databaseService.getProjectByWallet(userId);
        }
      }

      if (!project) {
        return {
          text: `No project found for user (ID: ${userId}). User needs to complete onboarding first.`,
          values: {
            hasProject: false,
            userId: userId,
            needsOnboarding: true,
          },
          data: {
            error: 'No project found',
            userId: userId,
            projectId: projectId,
          },
        };
      }

      // Get additional context
      const discord = await databaseService.getDiscordByProjectId(project.id);
      const nfts = await databaseService.getNFTsByProjectId(project.id);

      // Calculate level requirements and progress
      const levelRequirements = {
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

      const currentLevel = project.level;
      const nextLevel = currentLevel + 1;
      const nextLevelReqs = levelRequirements[nextLevel];

      // Check completion status
      const hasIdeaNFT = nfts.some((nft) => nft.type === 'IDEA');
      const hasHypothesisNFT = nfts.some((nft) => nft.type === 'HYPOTHESIS');
      const hasDiscord = !!discord;
      const discordMembers = discord?.memberCount || 0;
      const papersShared = discord?.papersShared || 0;
      const messagesCount = discord?.messagesCount || 0;

      // Build completion flags
      const completedRequirements = {
        walletConnected: !!project.wallet,
        ideaNFTMinted: hasIdeaNFT,
        hypothesisNFTMinted: hasHypothesisNFT,
        discordCreated: hasDiscord,
        fourDiscordMembers: discordMembers >= 4,
        tenDiscordMembers: discordMembers >= 10,
        twentyFivePapersShared: papersShared >= 25,
        hundredMessages: messagesCount >= 100,
      };

      // Create detailed context string for the AI
      let contextText = `=== USER CONTEXT ===
Project: "${project.projectName || 'Unnamed Project'}" (ID: ${project.id})
User: ${project.fullName || 'Unknown'} (${project.email || 'No email'})
Wallet: ${project.wallet || 'Not connected'}
Current Level: ${project.level}/4

=== PROGRESS STATUS ===`;

      // Add NFT status
      contextText += `\nNFTs: ${nfts.length} minted`;
      if (nfts.length > 0) {
        contextText += ` (${hasIdeaNFT ? '✅ Idea' : '❌ Idea'}, ${hasHypothesisNFT ? '✅ Hypothesis' : '❌ Hypothesis'})`;
      }

      // Add Discord status
      if (discord) {
        contextText += `\nDiscord: ${discord.serverName || 'Server'} - ${discord.memberCount} members, ${discord.papersShared} papers, ${discord.messagesCount} messages`;
        contextText += `\nBot Status: ${discord.botAdded ? '✅ Installed' : '❌ Not installed'}`;
      } else {
        contextText += `\nDiscord: ❌ Not set up`;
      }

      // Add next level requirements if not at max level
      if (nextLevelReqs) {
        contextText += `\n\n=== NEXT LEVEL (${nextLevel}) REQUIREMENTS ===`;
        nextLevelReqs.requirements.forEach((req) => {
          const completed =
            (req === 'Wallet connected' && completedRequirements.walletConnected) ||
            (req === 'Minted Idea NFT' && completedRequirements.ideaNFTMinted) ||
            (req === 'Minted Hypothesis NFT' && completedRequirements.hypothesisNFTMinted) ||
            (req === 'Discord created' && completedRequirements.discordCreated) ||
            (req === '4 Discord members' && completedRequirements.fourDiscordMembers) ||
            (req === '10 Discord members' && completedRequirements.tenDiscordMembers) ||
            (req === '25 papers shared' && completedRequirements.twentyFivePapersShared) ||
            (req === '100 messages sent' && completedRequirements.hundredMessages);

          contextText += `\n${completed ? '✅' : '❌'} ${req}`;
        });
      } else {
        contextText += `\n\n🎉 MAX LEVEL REACHED! User has completed all levels.`;
      }

      // Return structured provider result
      return {
        text: contextText,
        values: {
          // Values that can be used in templates
          hasProject: true,
          projectId: project.id,
          projectName: project.projectName || 'Unnamed Project',
          userFullName: project.fullName || 'Unknown',
          userEmail: project.email || '',
          userWallet: project.wallet || '',
          currentLevel: project.level.toString(),
          nextLevel: nextLevel.toString(),
          hasIdeaNFT: hasIdeaNFT.toString(),
          hasHypothesisNFT: hasHypothesisNFT.toString(),
          hasDiscord: hasDiscord.toString(),
          discordMembers: discordMembers.toString(),
          papersShared: papersShared.toString(),
          messagesCount: messagesCount.toString(),
          canAdvanceLevel: nextLevelReqs ? 'true' : 'false',
          needsOnboarding: 'false',
        },
        data: {
          // Structured data for actions to use
          project: {
            id: project.id,
            level: project.level,
            fullName: project.fullName,
            email: project.email,
            projectName: project.projectName,
            projectDescription: project.projectDescription,
            wallet: project.wallet,
            privyId: project.privyId,
          },
          discord: discord
            ? {
                id: discord.id,
                serverId: discord.serverId,
                serverName: discord.serverName,
                memberCount: discord.memberCount,
                papersShared: discord.papersShared,
                messagesCount: discord.messagesCount,
                verified: discord.verified,
                botAdded: discord.botAdded,
                inviteLink: discord.inviteLink,
              }
            : null,
          nfts: nfts.map((nft) => ({
            id: nft.id,
            type: nft.type,
            mintedAt: nft.mintedAt,
            transactionHash: nft.transactionHash,
            imageUrl: nft.imageUrl,
          })),
          progress: {
            currentLevel: project.level,
            nextLevel: nextLevel,
            nextLevelRequirements: nextLevelReqs?.requirements || [],
            completedRequirements,
            levelRequirements,
          },
          context: {
            userId,
            projectId,
            roomId,
            agentId,
          },
        },
      };
    } catch (error) {
      elizaLogger.error('Error in portal database provider:', error);

      return {
        text: `Error retrieving user context from database: ${error.message}`,
        values: {
          hasProject: false,
          error: error.message,
          needsOnboarding: true,
        },
        data: {
          error: error.message,
          stack: error.stack,
        },
      };
    }
  },
};

export default databaseProvider;
