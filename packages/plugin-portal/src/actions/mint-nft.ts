import { Action, IAgentRuntime, Memory, State, HandlerCallback, elizaLogger } from '@elizaos/core';
import { databaseService } from '../services/database.js';
import { levelManager } from '../services/level-manager.js';
import { nftMintingService, NFT_CONFIG } from '../services/nft-service.js';
import { getProjectId, getUserId } from '../utils/getProjectId.js';

export const mintNFTAction: Action = {
  name: 'MINT_NFT',
  similes: [
    'MINT_IDEA_NFT',
    'MINT_HYPOTHESIS_NFT',
    'MINT_VISION_NFT',
    'CREATE_NFT',
    'MINT_SCIENCE_NFT',
    'GENERATE_NFT',
  ],
  description:
    'Mint Science NFTs (Idea or Vision/Hypothesis) for the user with real blockchain integration',
  validate: async (runtime: IAgentRuntime, memory: Memory, state?: State) => {
    const projectId = getProjectId(memory, state);
    const nftType = memory.content?.nftType as string;
    return !!(projectId && nftType && ['idea', 'vision', 'hypothesis'].includes(nftType));
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
      const nftType = memory.content?.nftType || options?.nftType;

      elizaLogger.info('🎨 Processing NFT mint for user:', userId);

      if (!projectId) {
        throw new Error('Project ID is required');
      }

      if (!nftType || !['idea', 'vision', 'hypothesis'].includes(nftType)) {
        const response = {
          text: "Please specify which NFT type you'd like to mint: 'idea' or 'vision' (hypothesis).",
          values: { error: 'Invalid NFT type' },
        };
        await callback?.(response);
        return response;
      }

      const project = await databaseService.getProjectById(projectId);

      if (!project) {
        const response = {
          text: "I couldn't find your project. Please complete onboarding first before minting NFTs.",
          values: { error: 'Project not found' },
        };
        await callback?.(response);
        return response;
      }

      // Check if NFT already exists
      const existingNFTs = await databaseService.getNFTsByProjectId(project.id);
      const normalizedType = nftType === 'hypothesis' ? 'vision' : nftType;
      const hasNFTType = existingNFTs.some(
        (nft) =>
          nft.type === normalizedType || (normalizedType === 'vision' && nft.type === 'hypothesis')
      );

      if (hasNFTType) {
        const existingNFT = existingNFTs.find(
          (nft) =>
            nft.type === normalizedType ||
            (normalizedType === 'vision' && nft.type === 'hypothesis')
        );

        const response = {
          text: `You already have a ${nftType} NFT! Each project can only have one of each type.\n\n🎨 Your existing ${nftType} NFT:\n• Transaction: ${existingNFT?.transactionHash}\n• Minted: ${existingNFT?.mintedAt ? new Date(existingNFT.mintedAt).toLocaleDateString() : 'Unknown'}`,
          values: {
            alreadyExists: true,
            existingNFT: existingNFT,
          },
        };
        await callback?.(response);
        return response;
      }

      // Notify user that minting is starting
      if (callback) {
        const response = {
          text: `🎨 I'll mint your ${nftType} NFT now! This will be recorded on the blockchain and associated with your project.\n\n⏳ Generating unique artwork and processing blockchain transaction...`,
          values: { status: 'minting_started' },
        };
        await callback(response);
      }

      // Get project description for image generation
      const description = nftType === 'idea' ? project.projectDescription : project.projectVision;

      // Mint the NFT using the real service with image generation
      const mintResult = await nftMintingService.mintNFT(
        project.wallet,
        normalizedType as 'idea' | 'vision',
        description,
        project.id
      );

      if (!mintResult.success) {
        const response = {
          text: `❌ Failed to mint your ${nftType} NFT. Please try again or contact support.`,
          values: { success: false, error: 'Minting failed' },
        };
        await callback?.(response);
        return response;
      }

      // Save NFT to database
      const savedNFT = await databaseService.createNFT({
        type: normalizedType,
        projectId: project.id,
        transactionHash: mintResult.transactionHash,
        imageUrl: mintResult.imageUrl,
      });

      elizaLogger.info(`✅ NFT saved to database for project ${project.id}`);

      // Check if user can advance level
      const progress = await levelManager.checkLevelProgress(project.id);
      let levelUpMessage = '';

      if (progress.canAdvance && progress.nextLevel === 2) {
        const levelResult = await levelManager.advanceLevel(project.id);
        if (levelResult.success) {
          levelUpMessage = `\n\n🎉 ${levelResult.message}\n\n🚀 **Next Step:** Let's set up your Discord server to build your research community!`;
        }
      }

      // Get minting config for status message
      const mintConfig = nftMintingService.getConfig();
      const mintingMode = mintConfig.enableRealMinting ? '⛓️ Blockchain' : '🧪 Simulation';

      const responseText = `✅ Your ${nftType} NFT has been minted successfully!\n\n🎨 **NFT Details:**\n• Type: ${nftType.charAt(0).toUpperCase() + nftType.slice(1)} NFT\n• Transaction: ${mintResult.transactionHash}\n• Mode: ${mintingMode}\n• Contract: ${NFT_CONFIG.ZORA_CONTRACT_ADDRESS}\n${mintResult.imageUrl ? `• Artwork: Generated with AI\n` : ''}\nThis NFT represents your scientific contribution and is now permanently recorded on the blockchain.${levelUpMessage}`;

      const response = {
        text: responseText,
        values: {
          success: true,
          nftType: normalizedType,
          transactionHash: mintResult.transactionHash,
          imageUrl: mintResult.imageUrl,
          nft: savedNFT,
          levelUp: !!levelUpMessage,
          mintingMode: mintConfig.enableRealMinting ? 'blockchain' : 'simulation',
        },
      };

      await callback?.(response);
      return response;
    } catch (error) {
      elizaLogger.error('❌ Error in mint NFT action:', error);
      const response = {
        text: `❌ Sorry, I encountered an error while minting your NFT: ${error.message}\n\nPlease try again or contact support if the issue persists.`,
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
        content: { text: 'I need an idea NFT', projectId: '123', nftType: 'idea' },
      },
      {
        name: '{{user2}}',
        content: { text: 'Mint my hypothesis NFT', projectId: '456', nftType: 'hypothesis' },
      },
    ],
  ],
};

export default mintNFTAction;
