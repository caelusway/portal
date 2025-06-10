import { Service, IAgentRuntime, elizaLogger } from '@elizaos/core';
import { databaseService } from './database.js';

export class PortalDatabaseService extends Service {
  static serviceType = 'PORTAL_DATABASE';
  capabilityDescription =
    'Provides database operations for BioDAO portal including projects, NFTs, Discord, and chat management';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<PortalDatabaseService> {
    const service = new PortalDatabaseService(runtime);
    elizaLogger.info('🗄️ Portal Database Service started');

    // Test database connection
    const isHealthy = await databaseService.healthCheck();
    if (!isHealthy) {
      elizaLogger.warn('Database health check failed, but service will continue');
    }

    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(PortalDatabaseService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('🗄️ Stopping Portal Database Service');
    await databaseService.disconnect();
  }

  // Expose database operations through the service
  getDatabase() {
    return databaseService;
  }

  async healthCheck(): Promise<boolean> {
    return await databaseService.healthCheck();
  }
}
