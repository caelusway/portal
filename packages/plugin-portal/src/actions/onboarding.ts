import { Action, IAgentRuntime, State, Memory, HandlerCallback } from '@elizaos/core';
import { mintScienceNFTs } from '../utils/nft';
import { ProjectService } from '../utils/db';
import { getProjectId } from '../utils/getProjectId';

export const onboardingCompleteAndMintNFTs: Action = {
  name: 'ONBOARDING_COMPLETE_AND_MINT_NFTS',
  description:
    'Handles onboarding completion and mints Idea and Vision NFTs, then updates user level.',
  validate: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    // Example: check if onboarding is complete (customize as needed)
    return message.content.type === 'onboarding_complete';
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    const projectId = getProjectId(message, state);
    if (!projectId) throw new Error('projectId is required');
    if (typeof projectId !== 'string') throw new Error('projectId must be a string');

    // Mint NFTs (implement mintScienceNFTs in utils/nft.ts)
    const { ideaNFT, visionNFT } = await mintScienceNFTs(projectId, message, state);
    // Update user/project level to 2 (Science NFTs Minted)
    await ProjectService.updateLevel(projectId, 2);
    // Respond to user
    const response = {
      text: `I've minted your Idea NFT and Vision NFT!\n\nIdea NFT: ${ideaNFT?.url || '[link]'}\nVision NFT: ${visionNFT?.url || '[link]'}\n\nYou have progressed to Level 2: Science NFTs Minted.`,
      actions: ['ONBOARDING_COMPLETE_AND_MINT_NFTS'],
      data: { ideaNFT, visionNFT, newLevel: 2 },
    };
    await callback(response);
    return response;
  },
  examples: [
    [
      { name: 'user', content: { type: 'onboarding_complete', projectId: '123' } },
      {
        name: 'CoreAgent',
        content: {
          text: "I've minted your Idea NFT and Vision NFT! You have progressed to Level 2: Science NFTs Minted.",
        },
      },
    ],
  ],
};
