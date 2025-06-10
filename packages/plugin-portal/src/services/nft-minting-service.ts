import { Service, IAgentRuntime, elizaLogger } from '@elizaos/core';
import { nftMintingService } from './nft-service.js';

export class PortalNFTService extends Service {
  static serviceType = 'PORTAL_NFT';
  capabilityDescription =
    'Provides NFT minting capabilities for BioDAO portal including Idea and Vision NFTs with AI-generated images';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<PortalNFTService> {
    const service = new PortalNFTService(runtime);
    elizaLogger.info('🎨 Portal NFT Service started');

    // Log configuration
    const config = nftMintingService.getConfig();
    elizaLogger.info(
      `NFT Service Config: Real minting ${config.enableRealMinting ? 'enabled' : 'disabled'}`
    );

    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(PortalNFTService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('🎨 Stopping Portal NFT Service');
    // NFT service doesn't need special cleanup
  }

  // Expose NFT operations through the service
  getNFTService() {
    return nftMintingService;
  }

  async mintIdeaNFT(walletAddress: string, projectDescription?: string, projectId?: string) {
    return await nftMintingService.mintIdeaNFT(walletAddress, projectDescription, projectId);
  }

  async mintVisionNFT(walletAddress: string, projectVision?: string, projectId?: string) {
    return await nftMintingService.mintVisionNFT(walletAddress, projectVision, projectId);
  }

  async isTransactionConfirmed(transactionHash: string) {
    return await nftMintingService.isTransactionConfirmed(transactionHash as any);
  }

  getConfig() {
    return nftMintingService.getConfig();
  }
}
