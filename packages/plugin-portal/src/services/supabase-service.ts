import { Service, logger, type IAgentRuntime } from '@elizaos/core';
import { supabase } from '../lib/supabase';

// Define the UserLevel interface
export interface UserLevel {
  id: string;
  privy_id: string; // Changed from user_id to privy_id to match the client implementation
  level: number;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for requirement completion status
 */
export interface RequirementCompletion {
  requirement_id: string;
  completed: boolean;
  completed_at?: Date;
}

/**
 * Service for interacting with Supabase
 */
export class SupabaseService extends Service {
  static serviceType = 'supabase';
  capabilityDescription = 'Service for interacting with Supabase database.';

  private static instance: SupabaseService;

  public constructor(protected runtime: IAgentRuntime) {
    super(runtime);
    logger.info('[SupabaseService] Service initialized');
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService(null);
    }
    return SupabaseService.instance;
  }

  static async start(runtime: IAgentRuntime) {
    logger.info(`[SupabaseService] Starting Supabase service`);
    const service = new SupabaseService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('[SupabaseService] Stopping Supabase service');
    // get the service from the runtime
    const service = runtime.getService(SupabaseService.serviceType);
    if (!service) {
      throw new Error('Supabase service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('[SupabaseService] Supabase service stopped');
  }

  /**
   * Call a Supabase RPC function
   * @param functionName The name of the RPC function to call
   * @param params The parameters to pass to the RPC function
   * @returns The result of the RPC call
   */
  async rpc(functionName: string, params: Record<string, any>): Promise<{ data: any; error: any }> {
    try {
      logger.info(`[SupabaseService] Calling RPC function: ${functionName} with params:`, params);

      // Call the Supabase RPC function
      const { data, error } = await supabase.rpc(functionName, params);

      if (error) {
        logger.error(`[SupabaseService] Error calling RPC function ${functionName}:`, error);
        return { data: null, error };
      }

      logger.info(`[SupabaseService] Successfully called RPC function ${functionName}`);
      return { data, error: null };
    } catch (error) {
      logger.error(`[SupabaseService] Exception calling RPC function ${functionName}:`, error);
      return { data: null, error };
    }
  }

  /**
   * Get user level from Supabase
   * @param userId The user's privy ID
   * @returns The user level data
   */
  async getUserLevel(userId: string): Promise<UserLevel | null> {
    if (!userId) {
      logger.warn('[SupabaseService] getUserLevel called without userId');
      return null;
    }

    try {
      logger.info(`[SupabaseService] Getting user level for userId: ${userId}`);

      // Use direct table access like in user-levels.ts
      const { data, error } = await supabase
        .from('user_levels')
        .select('*')
        .eq('privy_id', userId)
        .single();

      if (error) {
        logger.error(`[SupabaseService] Error fetching user level for ${userId}:`, error);
        // Handle specific RLS errors if needed
        if (error.code === '42501') {
          logger.error('RLS Error: Check JWT claims and SELECT policy on user_levels.');
        }
        return null;
      }

      logger.info({ levelData: data }, `[SupabaseService] Fetched user level data for ${userId}`);

      // Perform runtime check before casting
      if (data && typeof data.level === 'number') {
        // Cast to unknown first for type safety
        return data as unknown as UserLevel;
      } else if (data) {
        logger.warn('[SupabaseService] Fetched user level data has unexpected structure:', data);
        return null; // Return null if structure is wrong
      } else {
        return null; // No data found
      }
    } catch (error) {
      logger.error(`[SupabaseService] Unexpected error in getUserLevel for ${userId}:`, error);
      return null; // Return null on unexpected errors
    }
  }

  /**
   * Creates or updates a user level record, setting it to level 1 if new, or ensuring it exists.
   * Uses upsert for atomicity.
   * @param userId The user's privy ID
   * @returns The user level data
   */
  async createOrUpdateUserLevel(userId: string): Promise<UserLevel | null> {
    if (!userId) {
      logger.warn('[SupabaseService] createOrUpdateUserLevel called without userId');
      return null;
    }

    logger.info(
      `[SupabaseService] Ensuring user level record exists/is level 1 for userId: ${userId}`
    );

    try {
      const { data, error } = await supabase
        .from('user_levels')
        .upsert({ privy_id: userId, level: 1 }, { onConflict: 'privy_id' })
        .select('*')
        .single();

      if (error) {
        logger.error(`[SupabaseService] Error upserting user level for ${userId}:`, error);
        if (error.code === '42501') {
          logger.error('RLS Error: Check JWT claims and INSERT/UPDATE policy on user_levels.');
        }
        return null;
      }

      if (data && typeof data.level === 'number' && typeof data.privy_id === 'string') {
        // Cast to unknown first for type safety
        return data as unknown as UserLevel;
      } else if (data) {
        logger.error(
          `[SupabaseService] Upsert completed for ${userId} but returned unexpected data structure:`,
          data
        );
        return null;
      } else {
        logger.error(`[SupabaseService] Upsert completed for ${userId} but no data returned.`);
        return null;
      }
    } catch (error) {
      logger.error(
        `[SupabaseService] Unexpected error in createOrUpdateUserLevel for ${userId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Update a user level in Supabase
   * @param userId The user's privy ID
   * @param newLevel The new level
   * @returns The result of the operation
   */
  async updateUserLevel(
    userId: string,
    newLevel: number
  ): Promise<{ success: boolean; error?: any }> {
    if (!userId) {
      logger.warn('[SupabaseService] updateUserLevel called without userId');
      return { success: false, error: new Error('Missing userId') };
    }

    if (typeof newLevel !== 'number' || newLevel < 1) {
      logger.warn(`[SupabaseService] updateUserLevel called with invalid newLevel: ${newLevel}`);
      return { success: false, error: new Error('Invalid newLevel') };
    }

    logger.info(`[SupabaseService] Updating user level for ${userId} to ${newLevel}...`);

    try {
      const { error } = await supabase
        .from('user_levels')
        .update({ level: newLevel })
        .eq('privy_id', userId);
      // Removed .select().single() to avoid PGRST116 if row doesn't exist or RLS prevents reading

      if (error) {
        logger.error(`[SupabaseService] Error updating user level for ${userId}:`, error);
        if (error.code === '42501') {
          logger.error('RLS Error: Check JWT claims and UPDATE policy on user_levels.');
        } else if (error.code === 'PGRST116') {
          logger.error('PGRST116 occurred unexpectedly during update for ', userId);
        }
        // Return error information
        return { success: false, error };
      }

      // If no error, assume success (we can't easily check affected rows without SELECT)
      logger.info(
        `[SupabaseService] User level update request sent for ${userId} to level ${newLevel}.`
      );
      return { success: true };
    } catch (error) {
      logger.error(`[SupabaseService] Unexpected error in updateUserLevel for ${userId}:`, error);
      return { success: false, error };
    }
  }

  /**
   * Increment the user's level by 1
   * @param userId The user's privy ID
   * @returns The result of the operation
   */
  async incrementUserLevel(userId: string): Promise<{ success: boolean; error?: any }> {
    try {
      // First get the current level object or null
      const currentUserLevelData = await this.getUserLevel(userId);

      // Check if user level data exists
      if (!currentUserLevelData) {
        logger.error(
          `[SupabaseService] Cannot increment level for ${userId}: User level data not found.`
        );
        return {
          success: false,
          error: new Error(`User level data not found for user ${userId}`),
        };
      }

      // Safely access the level property now
      const currentLevel = currentUserLevelData.level;
      const nextLevel = currentLevel + 1;

      // Then call updateUserLevel
      return this.updateUserLevel(userId, nextLevel);
    } catch (error) {
      logger.error(`[SupabaseService] Error incrementing level for ${userId}:`, error);
      return { success: false, error };
    }
  }

  /**
   * Get level requirements from Supabase
   * @param level The level to get requirements for
   * @returns The level requirements
   */
  async getLevelRequirements(level: number): Promise<{ data: any; error: any }> {
    try {
      logger.info(`[SupabaseService] Getting requirements for level: ${level}`);

      const { data, error } = await supabase
        .from('level_requirements')
        .select('*')
        .eq('level', level);

      if (error) {
        logger.error(`[SupabaseService] Error getting requirements for level ${level}:`, error);
        return { data: null, error };
      }

      logger.info(`[SupabaseService] Successfully got requirements for level ${level}`);
      return { data, error: null };
    } catch (error) {
      logger.error(`[SupabaseService] Exception getting requirements for level ${level}:`, error);
      return { data: null, error };
    }
  }

  /**
   * Check requirements completion for a user at a specific level
   * @param userId The user's privy ID
   * @param level The level to check
   * @returns The requirements completion status
   */
  async checkRequirementsCompletion(
    userId: string,
    level: number
  ): Promise<RequirementCompletion[]> {
    try {
      logger.info(
        `[SupabaseService] Checking requirements completion for userId: ${userId} at level: ${level}`
      );

      // First get the level requirements
      const { data: requirements, error: reqError } = await supabase
        .from('level_requirements')
        .select('id')
        .eq('level', level);

      if (reqError) {
        logger.error(`[SupabaseService] Error getting level requirements: ${reqError.message}`);
        return [];
      }

      if (!requirements || requirements.length === 0) {
        logger.info(`[SupabaseService] No requirements found for level ${level}`);
        return [];
      }

      // Get the requirement progress for each requirement
      const requirementIds = requirements.map((req) => req.id);
      const { data: progress, error: progressError } = await supabase
        .from('requirement_progress')
        .select('*')
        .eq('privy_id', userId)
        .in('requirement_id', requirementIds);

      if (progressError) {
        logger.error(
          `[SupabaseService] Error getting requirement progress: ${progressError.message}`
        );
        return [];
      }

      // Map the progress data to RequirementCompletion format
      const completions: RequirementCompletion[] = requirementIds.map((reqId) => {
        const progressItem = progress?.find((p) => p.requirement_id === reqId);
        return {
          requirement_id: reqId,
          completed: progressItem?.completed || false,
          completed_at: progressItem?.completed_at
            ? new Date(progressItem.completed_at)
            : undefined,
        };
      });

      logger.info(
        `[SupabaseService] Successfully retrieved requirements completion for user ${userId} at level ${level}`
      );
      return completions;
    } catch (error) {
      logger.error(
        `[SupabaseService] Error checking requirements completion for ${userId} at level ${level}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get user metrics from Supabase
   * @param userId The user's privy ID
   * @returns The user metrics
   */
  async getUserMetrics(userId: string): Promise<Record<string, any> | null> {
    try {
      logger.info(`[SupabaseService] Getting user metrics for userId: ${userId}`);

      // Call the Supabase RPC function to get user metrics
      const { data, error } = await this.rpc('get_user_metrics', { p_privy_id: userId });

      if (error) {
        logger.error(`[SupabaseService] Error getting user metrics: ${error.message}`);
        return null;
      }

      if (!data) {
        logger.info(`[SupabaseService] No metrics found for user ${userId}`);
        return null;
      }

      logger.info(`[SupabaseService] Successfully retrieved metrics for user ${userId}`);
      return data as Record<string, any>;
    } catch (error) {
      logger.error(`[SupabaseService] Error getting user metrics for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Upserts (Inserts or Updates) user Discord information.
   * Uses privy_id as the unique identifier for conflict resolution.
   * @param privyId The user's privy ID.
   * @param serverId The Discord Guild ID.
   * @param inviteLink The specific invite link used (optional, but good for tracking).
   * @param botInvited A flag indicating if the bot has confirmed being in the server.
   * @returns The result of the upsert operation.
   */
  async upsertUserDiscordInfo(
    privyId: string,
    serverId: string,
    inviteLink?: string, // Make invite link optional for updates
    botInvited: boolean = true // Default to true when this is called post-verification
  ): Promise<{ success: boolean; error?: any }> {
    if (!privyId || !serverId) {
      logger.warn('[SupabaseService] upsertUserDiscordInfo requires privyId and serverId');
      return { success: false, error: new Error('Missing privyId or serverId') };
    }

    const upsertData: {
      privy_id: string;
      server_id: string;
      invite_link?: string;
      bot_invited: boolean;
    } = {
      privy_id: privyId,
      server_id: serverId,
      bot_invited: botInvited,
    };

    // Only include invite_link if provided (avoids overwriting with undefined on update)
    if (inviteLink) {
      upsertData.invite_link = inviteLink;
    }

    logger.info(
      `[SupabaseService] Upserting Discord info for ${privyId} (Server: ${serverId})...`,
      upsertData
    );

    try {
      const { error } = await supabase
        .from('user_discord_info') // Target the correct table
        .upsert(upsertData, {
          onConflict: 'privy_id', // Use privy_id as the unique constraint
          ignoreDuplicates: false, // Ensure updates happen
        });

      if (error) {
        logger.error(`[SupabaseService] Error upserting user_discord_info for ${privyId}:`, error);
        if (error.code === '42501') {
          logger.error(
            'RLS Error: Check JWT claims and INSERT/UPDATE policy on user_discord_info.'
          );
        }
        // Handle other potential errors like constraint violations if needed
        return { success: false, error };
      }

      logger.info(`[SupabaseService] Successfully upserted user_discord_info for ${privyId}.`);
      return { success: true };
    } catch (error) {
      logger.error(
        `[SupabaseService] Unexpected error in upsertUserDiscordInfo for ${privyId}:`,
        error
      );
      return { success: false, error };
    }
  }
}
