import { Plugin } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';

// Import actions
import { onboardingAction } from './actions/onboarding.js';
import { mintNFTAction } from './actions/mint-nft.js';
import { setupDiscordAction } from './actions/discord-setup.js';
import { checkProgressAction } from './actions/check-progress.js';
import { processChatAction } from './actions/process-chat.js';
import { advanceLevelAction } from './actions/advance-level.js';
import { emailManagementAction } from './actions/email-management.js';

// Import services
import { PortalDatabaseService } from './services/database-service.js';
import { PortalLevelService } from './services/level-management-service.js';
import { PortalOrchestrationService } from './services/portal-orchestration-service.js';
import { LLMService } from './services/llmService.js';
import { DiscordService } from './services/discord-service.js';
import { EmailService } from './services/email-service.js';

// Import providers
import { databaseProvider } from './providers/database.js';
import { onboardingProvider } from './providers/onboardingProvider.js';

// Import utilities
import { validatePortalConfig } from './environment.js';

export const portalPlugin: Plugin = {
  name: 'portal',
  description:
    'BioDAO Portal Plugin - Comprehensive onboarding and community management for decentralized science projects',

  actions: [
    onboardingAction,
    mintNFTAction,
    setupDiscordAction,
    checkProgressAction,
    processChatAction,
    advanceLevelAction,
    emailManagementAction,
  ],

  providers: [databaseProvider, onboardingProvider],

  services: [
    PortalDatabaseService,
    PortalLevelService,
    PortalOrchestrationService,
    LLMService,
    DiscordService,
    EmailService,
  ],

  evaluators: [],

  init: async (config: Record<string, string>, runtime) => {
    elizaLogger.info('🚀 Initializing BioDAO Portal Plugin...');

    // Validate configuration
    try {
      await validatePortalConfig(runtime);
      elizaLogger.info('✅ Portal configuration validated');
    } catch (error) {
      elizaLogger.warn(`⚠️ Portal configuration warning: ${error.message}`);
    }

    elizaLogger.info('✅ BioDAO Portal Plugin initialized successfully');
  },
};

export default portalPlugin;

// Export services for external use
export { PortalDatabaseService } from './services/database-service.js';
export { PortalLevelService } from './services/level-management-service.js';
export { PortalOrchestrationService } from './services/portal-orchestration-service.js';
export { LLMService } from './services/llmService.js';
export { DiscordService } from './services/discord-service.js';
export { EmailService } from './services/email-service.js';

// Export service instances for direct use
export { databaseService } from './services/database.js';
export { nftMintingService } from './services/nft-service.js';
export { levelManager } from './services/level-manager.js';
export { emailService } from './services/email-service.js';
