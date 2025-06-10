import { Service, IAgentRuntime, elizaLogger } from '@elizaos/core';
import { levelManager } from './level-manager.js';

export class PortalLevelService extends Service {
  static serviceType = 'PORTAL_LEVEL';
  capabilityDescription =
    'Provides level management and progression tracking for BioDAO portal onboarding flow';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<PortalLevelService> {
    const service = new PortalLevelService(runtime);
    elizaLogger.info('📊 Portal Level Service started');
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(PortalLevelService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('📊 Stopping Portal Level Service');
    // Level manager doesn't need special cleanup
  }

  // Expose level management operations through the service
  getLevelManager() {
    return levelManager;
  }

  async checkLevelProgress(projectId: string) {
    return await levelManager.checkLevelProgress(projectId);
  }

  async canAdvanceLevel(projectId: string): Promise<boolean> {
    return await levelManager.canAdvanceLevel(projectId);
  }

  async advanceLevel(projectId: string) {
    return await levelManager.advanceLevel(projectId);
  }

  getLevelInfo(level: number) {
    return levelManager.getLevelInfo(level);
  }

  getAllLevels() {
    return levelManager.getAllLevels();
  }
}
