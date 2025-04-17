import { Service, logger, type IAgentRuntime } from '@elizaos/core';
import { SupabaseService } from './supabase-service';

export interface UserLevel {
  id: string;
  privy_id: string; // Changed from user_id to privy_id to match the client implementation
  level: number;
  created_at: string;
  updated_at: string;
}

export interface LevelRequirements {
  id: string;
  level: number;
  description: string;
  requirements_config: Record<string, any>;
  created_at: Date;
}

export interface RequirementCompletion {
  requirement_id: string;
  completed: boolean;
  completed_at?: Date;
}

export interface UserLevelService extends Service {
  getUserLevel(userId: string, bypassCache?: boolean): Promise<UserLevel | null>;
  getLevelRequirements(level: number): Promise<LevelRequirements[]>;
  checkRequirements(userId: string, level: number): Promise<RequirementCompletion[]>;
  hasMetLevelRequirements(userId: string, level: number): Promise<boolean>;
  checkAndUpdateUserLevel(userId: string): Promise<{ updated: boolean; newLevel: number | null }>;
  getUserLevelProgress(userId: string): Promise<{
    currentLevel: number;
    nextLevel: number;
    requirements: Array<{
      metric: string;
      description: string;
      required: number | boolean;
      current: number | boolean;
      completed: boolean;
    }>;
    progressPercentage: number;
  } | null>;
}

export class UserLevelService extends Service {
  static serviceType = 'user-level';
  capabilityDescription = 'Service for managing user levels in the BioDAO system.';

  private static instance: UserLevelService;
  private userLevelCache: Map<string, UserLevel>;

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
    this.userLevelCache = new Map<string, UserLevel>();
    logger.info('[UserLevelService] Service initialized');
  }

  public static getInstance(): UserLevelService {
    if (!UserLevelService.instance) {
      UserLevelService.instance = new UserLevelService(null);
    }
    return UserLevelService.instance;
  }

  static async start(runtime: IAgentRuntime) {
    logger.info(`[UserLevelService] Starting user level service`);
    const service = new UserLevelService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('[UserLevelService] Stopping user level service');
    // get the service from the runtime
    const service = runtime.getService(UserLevelService.serviceType);
    if (!service) {
      throw new Error('User level service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('[UserLevelService] User level service stopped');
  }

  /**
   * Get the current level of a user
   * @param userId The ID of the user
   * @param bypassCache Optional flag to bypass the cache and fetch fresh data
   * @returns The user's level or null if not found
   */
  async getUserLevel(userId: string, bypassCache = false): Promise<UserLevel | null> {
    try {
      logger.info(
        `[UserLevelService] Getting user level for user ID: ${userId} ${bypassCache ? '(Bypassing Cache)' : ''}`
      );

      // Check cache first unless bypassed
      if (!bypassCache) {
        const cachedLevel = this.userLevelCache.get(userId);
        if (cachedLevel) {
          logger.info(
            `[UserLevelService] Found cached level for user ${userId}: ${cachedLevel.level}`
          );
          return cachedLevel;
        }
      }

      // Get the Supabase service
      const supabaseService = this.runtime.getService('supabase') as SupabaseService;
      if (!supabaseService) {
        logger.error('[UserLevelService] Supabase service not found');
        return null;
      }

      // Use the getUserLevel method from SupabaseService
      const userLevel = await supabaseService.getUserLevel(userId);
      if (!userLevel) {
        logger.info(`[UserLevelService] No level found for user ${userId}`);
        return null;
      }

      // Simplified logging to avoid potential serialization issues
      logger.info({
        message: `[UserLevelService] Raw userLevel object received for user ${userId}`,
        userLevelData: userLevel, // Log the raw object separately
      });
      logger.info(
        `[UserLevelService] Extracted level ${userLevel.level} (type: ${typeof userLevel.level}) for user ${userId}`
      );

      // Cache the user level
      this.userLevelCache.set(userId, userLevel);

      logger.info(
        `[UserLevelService] Successfully retrieved and cached level ${userLevel.level} for user ${userId}`
      );
      return userLevel;
    } catch (error) {
      logger.error(`[UserLevelService] Error getting user level for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get the requirements for a specific level
   * @param level The level to get requirements for
   * @returns Array of level requirements with full configuration
   */
  async getLevelRequirements(level: number): Promise<LevelRequirements[]> {
    // Validate and convert level input immediately
    const numericLevel = Number(level);
    if (isNaN(numericLevel)) {
      logger.error(
        `[UserLevelService] Invalid level type passed to getLevelRequirements. Received: ${level} (type: ${typeof level})`
      );
      return [];
    }

    try {
      logger.info(`[UserLevelService] Getting requirements for level ${numericLevel}`);

      // Get the Supabase service
      const supabaseService = this.runtime.getService('supabase') as SupabaseService;
      if (!supabaseService) {
        logger.error('[UserLevelService] Supabase service not found');
        return [];
      }

      // Use the getLevelRequirements method from SupabaseService
      const { data, error } = await supabaseService.getLevelRequirements(numericLevel);

      if (error) {
        // Log only the error message safely
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(
          `[UserLevelService] Error getting level requirements from Supabase: ${errorMessage}`
        );
        return [];
      }

      if (!data) {
        logger.info(`[UserLevelService] No requirements data found for level ${numericLevel}`);
        return [];
      }

      // Convert created_at strings to Date objects safely
      const requirements = data.map((req: any) => ({
        ...req,
        created_at: req.created_at ? new Date(req.created_at) : new Date(), // Provide default date if null/undefined
      }));

      // Log only the count safely
      logger.info(
        `[UserLevelService] Successfully retrieved ${requirements.length} requirements for level ${numericLevel}`
      );
      return requirements;
    } catch (error) {
      // Log only the error message safely in the catch block
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        `[UserLevelService] Unexpected error in getLevelRequirements for level ${numericLevel}: ${errorMessage}`
      );
      return [];
    }
  }

  /**
   * Check which requirements are completed for a user at a specific level
   * @param userId The ID of the user
   * @param level The level to check requirements for
   * @returns Array of requirement completion status
   */
  async checkRequirements(userId: string, level: number): Promise<RequirementCompletion[]> {
    try {
      // Ensure level is treated as a number internally, even if passed incorrectly
      const numericLevel = Number(level);
      if (isNaN(numericLevel)) {
        // Log the original invalid value and type for debugging
        logger.error(
          `[UserLevelService] Invalid level type passed to checkRequirements for user ${userId}. Received: ${level} (type: ${typeof level})`
        );
        return [];
      }

      logger.info(
        `[UserLevelService] Checking requirements for user ${userId} at numeric level ${numericLevel}`
      );

      // Get the Supabase service
      const supabaseService = this.runtime.getService('supabase') as SupabaseService;
      if (!supabaseService) {
        logger.error('[UserLevelService] Supabase service not found');
        return [];
      }

      // Use the checkRequirementsCompletion method from SupabaseService instead of RPC
      // Pass the validated numericLevel
      const completions = await supabaseService.checkRequirementsCompletion(userId, numericLevel);

      logger.info(
        `[UserLevelService] User ${userId} has ${completions.length} requirements completion entries for level ${numericLevel}`
      );
      return completions;
    } catch (error) {
      logger.error(
        `[UserLevelService] Error checking requirements for user ${userId} at level ${level}:`,
        error // Log the original level value in case of error
      );
      return [];
    }
  }

  /**
   * Update the level of a user
   * @param userId The ID of the user
   * @param level The new level
   * @returns Whether the update was successful
   */
  async setUserLevel(userId: string, level: number): Promise<boolean> {
    try {
      logger.info(`[UserLevelService] Setting level ${level} for user: ${userId}`);

      // Get the Supabase service
      const supabaseService = this.runtime.getService('supabase') as SupabaseService;
      if (!supabaseService) {
        logger.error('[UserLevelService] Supabase service not found');
        return false;
      }

      // Call the SupabaseService's updateUserLevel method instead of RPC
      const { success, error } = await supabaseService.updateUserLevel(userId, level);

      if (error || !success) {
        logger.error(
          `[UserLevelService] Error updating user level via SupabaseService: ${error?.message || 'Update failed'}`
        );
        return false;
      }

      // Update the cache (Need to fetch the updated record as updateUserLevel doesn't return it)
      // Clear cache first, getUserLevel will fetch the new data if called again
      this.userLevelCache.delete(userId);
      // Optionally, you could fetch the updated level here immediately if needed elsewhere right away
      // const updatedLevelData = await this.getUserLevel(userId);
      // if (updatedLevelData) {
      //    this.userLevelCache.set(userId, updatedLevelData);
      // }

      logger.info(`[UserLevelService] Successfully updated level for user ${userId} to ${level}`);
      return true;
    } catch (error) {
      logger.error(`[UserLevelService] Error setting user level for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Increment the level of a user
   * @param userId The ID of the user
   * @returns Whether the increment was successful
   */
  async incrementUserLevel(userId: string): Promise<boolean> {
    try {
      logger.info(`[UserLevelService] Incrementing level for user: ${userId}`);

      // Get the current level
      const currentLevel = await this.getUserLevel(userId);

      if (!currentLevel) {
        // If user doesn't have a level yet, set it to 1
        logger.info(`[UserLevelService] No level found for user ${userId}, setting to 1`);
        return await this.setUserLevel(userId, 1);
      }

      // Increment the level
      const newLevel = currentLevel.level + 1;
      logger.info(
        `[UserLevelService] Incrementing level for user ${userId} from ${currentLevel.level} to ${newLevel}`
      );

      return await this.setUserLevel(userId, newLevel);
    } catch (error) {
      logger.error(`[UserLevelService] Error incrementing user level for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get the progress of a user towards their next level
   * @param userId The ID of the user
   * @returns The user's current level, next level, and progress towards the next level
   */
  async getUserLevelProgress(userId: string): Promise<{
    currentLevel: number;
    nextLevel: number;
    requirements: Array<{
      metric: string;
      description: string;
      required: number | boolean;
      current: number | boolean;
      completed: boolean;
    }>;
    progressPercentage: number;
  } | null> {
    try {
      logger.info(`[UserLevelService] Getting level progress for user ${userId}`);

      // Get the current level
      const currentLevel = await this.getUserLevel(userId);
      if (!currentLevel) {
        logger.info(`[UserLevelService] No level found for user ${userId}`);
        return null;
      }

      const nextLevel = currentLevel.level + 1;

      // Add detailed logging to see the exact structure of the nextLevel variable
      logger.info(`[UserLevelService] nextLevel in getUserLevelProgress:`, {
        nextLevel,
        type: typeof nextLevel,
        isObject: nextLevel !== null && typeof nextLevel === 'object',
        stringified: JSON.stringify(nextLevel),
        toString: nextLevel.toString(),
        valueOf: nextLevel.valueOf(),
        currentLevel: currentLevel.level,
        currentLevelType: typeof currentLevel.level,
      });

      logger.info(
        `[UserLevelService] User ${userId} is at level ${currentLevel.level}, getting requirements for level ${nextLevel}`
      );

      // Get the requirements for the next level
      const requirements = await this.getLevelRequirements(nextLevel);
      if (requirements.length === 0) {
        logger.info(`[UserLevelService] No requirements found for level ${nextLevel}`);
        return {
          currentLevel: currentLevel.level,
          nextLevel,
          requirements: [],
          progressPercentage: 0,
        };
      }

      // Get the Supabase service
      const supabaseService = this.runtime.getService('supabase') as SupabaseService;
      if (!supabaseService) {
        logger.error('[UserLevelService] Supabase service not found');
        return null;
      }

      // Get user metrics from Supabase using the getUserMetrics method
      const userMetrics = await supabaseService.getUserMetrics(userId);
      if (!userMetrics) {
        logger.info(`[UserLevelService] No metrics found for user ${userId}`);
        return {
          currentLevel: currentLevel.level,
          nextLevel,
          requirements: [],
          progressPercentage: 0,
        };
      }

      // Process each requirement
      const processedRequirements = [];
      let completedCount = 0;
      let totalCount = 0;

      for (const requirement of requirements) {
        const config = requirement.requirements_config;

        if (!config || !config.conditions || !Array.isArray(config.conditions)) {
          logger.warn(`[UserLevelService] Invalid requirements config for level ${nextLevel}`);
          continue;
        }

        // Process each condition in the requirements
        for (const condition of config.conditions) {
          const { metric, operator, value } = condition;

          if (!metric || !operator || value === undefined) {
            logger.warn(
              `[UserLevelService] Invalid condition in requirements config: ${JSON.stringify(condition)}`
            );
            continue;
          }

          // Get the metric value from user metrics
          const metricValue = userMetrics[metric];

          if (metricValue === undefined) {
            logger.warn(`[UserLevelService] Metric ${metric} not found for user ${userId}`);
            continue;
          }

          // Check if the condition is met
          let completed = false;

          switch (operator) {
            case 'boolean_true':
              completed = metricValue === true;
              break;
            case '>=':
              completed = metricValue >= value;
              break;
            case '<=':
              completed = metricValue <= value;
              break;
            case '==':
              completed = metricValue === value;
              break;
            case '!=':
              completed = metricValue !== value;
              break;
            default:
              logger.warn(`[UserLevelService] Unknown operator ${operator} in requirements config`);
          }

          // Add the requirement to the processed list
          processedRequirements.push({
            metric,
            description: this.getMetricDescription(metric),
            required: value,
            current: metricValue,
            completed,
          });

          if (completed) {
            completedCount++;
          }
          totalCount++;
        }
      }

      // Calculate progress percentage
      const progressPercentage =
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      logger.info(
        `[UserLevelService] User ${userId} has completed ${completedCount} out of ${totalCount} requirements for level ${nextLevel} (${progressPercentage}%)`
      );

      return {
        currentLevel: currentLevel.level,
        nextLevel,
        requirements: processedRequirements,
        progressPercentage,
      };
    } catch (error) {
      logger.error(`[UserLevelService] Error getting level progress for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get a human-readable description for a metric
   * @param metric The metric name
   * @returns A human-readable description of the metric
   */
  private getMetricDescription(metric: string): string {
    const descriptions: Record<string, string> = {
      nft_idea_minted: 'Mint Idea NFT',
      nft_Vision_minted: 'Mint Vision NFT',
      discord_created: 'Create Discord Server',
      discord_members: 'Discord Members',
      papers_shared: 'Scientific Papers Shared',
      discord_messages: 'Discord Messages Sent',
    };

    return descriptions[metric] || metric;
  }

  /**
   * Check if a user has met all requirements for a specific level
   * @param userId The ID of the user
   * @param level The level to check requirements for
   * @returns Whether the user has met all requirements for the level
   */
  async hasMetLevelRequirements(userId: string, level: number): Promise<boolean> {
    try {
      // Ensure level is treated as a number before proceeding
      const numericLevel = Number(level);
      if (isNaN(numericLevel)) {
        logger.error(
          `[UserLevelService] Invalid level type passed to hasMetLevelRequirements for user ${userId}. Received: ${level} (type: ${typeof level})`
        );
        return false;
      }

      logger.info(
        `[UserLevelService] Checking if user ${userId} has met requirements for level ${numericLevel}`
      );

      // Get the requirements for the specified numeric level
      const requirements = await this.getLevelRequirements(numericLevel);
      // Requirement check logic depends on having requirements. If none exist for the level,
      // we could interpret this as requirements being met (vacuously true) or unmet.
      // Let's assume no requirements means they are met for advancing.
      if (!requirements || requirements.length === 0) {
        logger.warn(
          `[UserLevelService] No requirements found for level ${numericLevel}. Assuming met.`
        );
        return true; // Or false depending on desired logic for levels with no requirements
      }

      // Check which requirements are completed using the numeric level
      logger.debug(
        `[UserLevelService] Calling checkRequirements for level ${numericLevel} from hasMetLevelRequirements`
      );
      const completionStatus = await this.checkRequirements(userId, numericLevel);

      // Check if completionStatus array length matches the expected number of requirements/conditions.
      // This helps verify checkRequirements worked as expected.
      // Note: This simple length check might not be sufficient if requirements have multiple conditions.
      // A more robust check would map completionStatus back to requirements.
      if (!completionStatus || completionStatus.length === 0) {
        // Check if empty or null
        logger.warn(
          `[UserLevelService] Could not retrieve completion status for user ${userId} at level ${numericLevel}. Assuming requirements not met.`
        );
        return false;
      }

      // Check if *all* returned statuses indicate completion
      const allRequirementsMet = completionStatus.every((req) => req.completed);
      logger.info(
        `[UserLevelService] User ${userId} has met all requirements for level ${numericLevel}: ${allRequirementsMet}`
      );

      return allRequirementsMet;
    } catch (error) {
      logger.error(
        `[UserLevelService] Error checking level requirements for user ${userId} at level ${level}:`,
        error // Log original potentially corrupted level in case of error
      );
      // Decide on behavior: throw error or return false? Returning false might be safer.
      return false;
      // throw error;
    }
  }

  /**
   * Check if a user has met the requirements for their next level and update their level if they have
   * @param userId The ID of the user
   * @returns Whether the user's level was updated and their new level
   */
  async checkAndUpdateUserLevel(
    userId: string
  ): Promise<{ updated: boolean; newLevel: number | null }> {
    try {
      logger.info(`[UserLevelService] Checking and updating level for user ${userId}`);

      // Get the user's current level
      const currentLevel = await this.getUserLevel(userId);
      if (!currentLevel) {
        logger.info(`[UserLevelService] No level found for user ${userId}, setting to 1`);
        await this.setUserLevel(userId, 1);
        return { updated: true, newLevel: 1 };
      }

      const nextLevel = currentLevel.level + 1;

      // Add detailed logging to see the exact structure of the nextLevel variable
      logger.info(`[UserLevelService] nextLevel in checkAndUpdateUserLevel:`, {
        nextLevel,
        type: typeof nextLevel,
        isObject: nextLevel !== null && typeof nextLevel === 'object',
        stringified: JSON.stringify(nextLevel),
        toString: nextLevel.toString(),
        valueOf: nextLevel.valueOf(),
        currentLevel: currentLevel.level,
        currentLevelType: typeof currentLevel.level,
      });

      logger.info(
        `[UserLevelService] User ${userId} is at level ${currentLevel.level}, checking requirements for level ${nextLevel}`
      );

      // Check if the user has met the requirements for the next level
      const hasMetRequirements = await this.hasMetLevelRequirements(userId, nextLevel);

      if (hasMetRequirements) {
        logger.info(
          `[UserLevelService] User ${userId} has met requirements for level ${nextLevel}, updating level`
        );
        await this.setUserLevel(userId, nextLevel);
        return { updated: true, newLevel: nextLevel };
      } else {
        logger.info(
          `[UserLevelService] User ${userId} has not met requirements for level ${nextLevel}`
        );
        return { updated: false, newLevel: currentLevel.level };
      }
    } catch (error) {
      logger.error(
        `[UserLevelService] Error checking and updating level for user ${userId}:`,
        error
      );
      return { updated: false, newLevel: null };
    }
  }
}
