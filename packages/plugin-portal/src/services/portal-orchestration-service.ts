import { Service, IAgentRuntime, elizaLogger } from '@elizaos/core';
import { validatePortalConfig } from '../environment.js';
import { PortalDatabaseService } from './database-service.js';
import { nftMintingService } from './nft-service.js';
import { PortalLevelService } from './level-management-service.js';

export class PortalOrchestrationService extends Service {
  static serviceType = 'PORTAL_ORCHESTRATION';
  capabilityDescription =
    'Orchestrates BioDAO portal operations and coordinates between database, NFT, and level services';

  private databaseService?: PortalDatabaseService;
  private levelService?: PortalLevelService;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<PortalOrchestrationService> {
    const service = new PortalOrchestrationService(runtime);

    // Validate configuration
    try {
      await validatePortalConfig(runtime);
      elizaLogger.info('✅ Portal configuration validated');
    } catch (error) {
      elizaLogger.warn(`⚠️ Portal configuration warning: ${error.message}`);
    }

    elizaLogger.info('🎯 Portal Orchestration Service started');
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(PortalOrchestrationService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('🎯 Stopping Portal Orchestration Service');
  }

  // Initialize service dependencies
  private initializeServices() {
    if (!this.databaseService) {
      this.databaseService = this.runtime.getService('PORTAL_DATABASE') as PortalDatabaseService;
    }
    if (!this.levelService) {
      this.levelService = this.runtime.getService('PORTAL_LEVEL') as PortalLevelService;
    }
  }

  // High-level orchestration methods
  async processUserOnboarding(userData: any) {
    this.initializeServices();

    try {
      // Create project using database service
      const project = await this.databaseService?.getDatabase().createProject(userData);

      if (project && project.wallet) {
        elizaLogger.info(`User ${project.id} ready for NFT minting`);
      }

      return project;
    } catch (error) {
      elizaLogger.error('Error in user onboarding:', error);
      throw error;
    }
  }

  async processLevelAdvancement(projectId: string) {
    this.initializeServices();

    try {
      const canAdvance = await this.levelService?.canAdvanceLevel(projectId);

      if (canAdvance) {
        const result = await this.levelService?.advanceLevel(projectId);
        elizaLogger.info(`Project ${projectId} advanced to level ${result?.newLevel}`);
        return result;
      }

      return { canAdvance: false, message: 'Requirements not met' };
    } catch (error) {
      elizaLogger.error('Error in level advancement:', error);
      throw error;
    }
  }

  async getPortalStatus(projectId: string) {
    this.initializeServices();

    try {
      const project = await this.databaseService?.getDatabase().getProjectById(projectId);
      const progress = await this.levelService?.checkLevelProgress(projectId);
      const nfts = await this.databaseService?.getDatabase().getNFTsByProjectId(projectId);
      const discord = await this.databaseService?.getDatabase().getDiscordByProjectId(projectId);

      return {
        project,
        progress,
        nfts,
        discord,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      elizaLogger.error('Error getting portal status:', error);
      throw error;
    }
  }

  // NFT operations using the singleton service
  async mintNFT(projectId: string, nftType: 'idea' | 'vision', userId: string) {
    try {
      return await nftMintingService.mintNFT(userId, nftType, undefined, projectId);
    } catch (error) {
      elizaLogger.error('Error minting NFT:', error);
      throw error;
    }
  }
}
