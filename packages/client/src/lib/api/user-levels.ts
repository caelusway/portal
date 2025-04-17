import { supabase, getSupabase } from '../supabase-client';

// Define the type inline based on expected table structure
interface UserLevel {
  id: string; // Assuming UUID represented as string
  privy_id: string;
  level: number;
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
}

// Define the expected return type
interface UserLevelResponse {
  level: number;
  updated_at: string;
}

/**
 * Create a default user level using an RPC that bypasses RLS
 */
export async function createDefaultUserLevel(userId: string): Promise<UserLevelResponse | null> {
  if (!userId) {
    console.error('createDefaultUserLevel requires userId.');
    return null;
  }

  try {
    // Always get the latest client with JWT token
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('create_default_user_level', { p_privy_id: userId });

    if (error) {
      console.error(`Error creating default user level via RPC for ${userId}:`, error);
      return null;
    }

    console.log(`Successfully created default level for ${userId} using RPC`);

    // Type assertion for the returned data
    const typedData = data as { level: number; updated_at: string };
    return {
      level: typedData.level,
      updated_at: typedData.updated_at,
    };
  } catch (e) {
    console.error(`Error in createDefaultUserLevel for ${userId}:`, e);
    return null;
  }
}

/**
 * Fetches the current level for a given user.
 */
export async function getUserLevel(privyId: string): Promise<UserLevel | null> {
  if (!privyId) {
    console.warn('getUserLevel called without privyId');
    return null;
  }

  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('user_levels')
      .select('*') // Select all known columns
      .eq('privy_id', privyId)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching user level for ${privyId}:`, error);
      // Handle specific RLS errors if needed
      if (error.code === '42501') {
        console.error('RLS Error: Check JWT claims and SELECT policy on user_levels.');
      }
      throw error; // Re-throw other errors
    }

    console.log(`Fetched user level data for ${privyId}:`, data);
    // Perform runtime check before casting
    if (data && typeof data.level === 'number' && typeof data.privy_id === 'string') {
      // Cast to unknown first for type safety
      return data as unknown as UserLevel;
    } else if (data) {
      console.warn('Fetched user level data has unexpected structure:', data);
      return null; // Return null if structure is wrong
    } else {
      return null; // No data found
    }
  } catch (error) {
    console.error(`Unexpected error in getUserLevel for ${privyId}:`, error);
    return null; // Return null on unexpected errors
  }
}

/**
 * Ensures a user level record exists, creating one with level 1 if it doesn't.
 * Avoids overwriting existing levels.
 */
export async function createOrUpdateUserLevel(privyId: string): Promise<UserLevel | null> {
  if (!privyId) {
    console.warn('createOrUpdateUserLevel called without privyId');
    return null;
  }

  const supabase = getSupabase();
  console.log(
    `[createOrUpdateUserLevel] Checking for existing level record for privyId: ${privyId}`
  );

  try {
    // 1. Attempt to select the existing record first
    const { data: existingData, error: selectError } = await supabase
      .from('user_levels')
      .select('*')
      .eq('privy_id', privyId)
      .maybeSingle(); // maybeSingle returns null if not found, doesn't throw error

    if (selectError) {
      // Handle potential SELECT errors (like RLS issues)
      console.error(
        `[createOrUpdateUserLevel] Error selecting user level for ${privyId}:`,
        selectError
      );
      if (selectError.code === '42501') {
        console.error('RLS Error: Check JWT claims and SELECT policy on user_levels.');
      }
      throw selectError; // Re-throw to be caught by outer catch
    }

    // 2. If a record already exists, return it
    if (existingData) {
      console.log(
        `[createOrUpdateUserLevel] Found existing level ${existingData.level} for ${privyId}. No update needed.`
      );
      // Perform runtime check before casting
      if (typeof existingData.level === 'number') {
        // Cast to unknown first for type safety
        return existingData as unknown as UserLevel;
      } else {
        console.warn(
          '[createOrUpdateUserLevel] Existing level data has unexpected structure:',
          existingData
        );
        // Fall through to attempt insert? Or return error? Let's return error.
        throw new Error('Existing user level record has invalid format.');
      }
    }

    // 3. If no record exists, insert a new one with level 1
    console.log(
      `[createOrUpdateUserLevel] No existing record found for ${privyId}. Inserting level 1.`
    );
    const { data: insertedData, error: insertError } = await supabase
      .from('user_levels')
      .insert({ privy_id: privyId, level: 1 })
      .select('*')
      .single(); // Use single() here, expect exactly one row back after insert

    if (insertError) {
      console.error(
        `[createOrUpdateUserLevel] Error inserting level 1 record for ${privyId}:`,
        insertError
      );
      if (insertError.code === '23505') {
        // Unique constraint violation
        console.warn(
          `[createOrUpdateUserLevel] Race condition? Record likely created between SELECT and INSERT.`
        );
        // Attempt to fetch the record again as it should exist now
        return getUserLevel(privyId);
      } else if (insertError.code === '42501') {
        console.error('RLS Error: Check JWT claims and INSERT policy on user_levels.');
      }
      throw insertError; // Re-throw other errors
    }

    // 4. Return the newly inserted record
    if (insertedData && typeof insertedData.level === 'number') {
      console.log(`[createOrUpdateUserLevel] Successfully inserted level 1 record for ${privyId}.`);
      // Cast to unknown first for type safety
      return insertedData as unknown as UserLevel;
    } else {
      console.error(
        `[createOrUpdateUserLevel] Insert successful but returned no data or invalid data for ${privyId}.`
      );
      throw new Error('Failed to create user level record (invalid insert result).');
    }
  } catch (error) {
    // Catch errors from SELECT, INSERT, or the re-fetch
    console.error(
      `[createOrUpdateUserLevel] Unexpected error during ensure level process for ${privyId}:`,
      error
    );
    return null; // Return null on unexpected errors
  }
}

/**
 * Updates the user's level to a specific new level.
 */
// Removed userId and used privyId, removed .select().single()
export async function updateUserLevel(
  privyId: string,
  newLevel: number
): Promise<{ success: boolean; error?: any }> {
  if (!privyId) {
    console.warn('updateUserLevel called without privyId');
    return { success: false, error: new Error('Missing privyId') };
  }
  if (typeof newLevel !== 'number' || newLevel < 1) {
    console.warn(`updateUserLevel called with invalid newLevel: ${newLevel}`);
    return { success: false, error: new Error('Invalid newLevel') };
  }

  const supabase = getSupabase();
  console.log(`Updating user level for ${privyId} to ${newLevel}...`);

  try {
    const { error } = await supabase
      .from('user_levels')
      .update({ level: newLevel })
      .eq('privy_id', privyId);
    // Removed .select().single() to avoid PGRST116 if row doesn't exist or RLS prevents reading

    if (error) {
      console.error(`Error updating user level for ${privyId}:`, error);
      if (error.code === '42501') {
        console.error('RLS Error: Check JWT claims and UPDATE policy on user_levels.');
      } else if (error.code === 'PGRST116') {
        // This shouldn't happen without select(), but log if it does
        console.error('PGRST116 occurred unexpectedly during update for ', privyId);
      }
      // Return error information
      return { success: false, error };
    }

    // If no error, assume success (we can't easily check affected rows without SELECT)
    console.log(`User level update request sent for ${privyId} to level ${newLevel}.`);
    return { success: true };
  } catch (error) {
    console.error(`Unexpected error in updateUserLevel for ${privyId}:`, error);
    return { success: false, error };
  }
}

/**
 * Increment the user's level by 1
 */
export async function incrementUserLevel(userId: string) {
  try {
    // First get the current level object or null
    const currentUserLevelData = await getUserLevel(userId);

    // Check if user level data exists
    if (!currentUserLevelData) {
      console.error(`Cannot increment level for ${userId}: User level data not found.`);
      throw new Error(`User level data not found for user ${userId}`);
    }

    // Safely access the level property now
    const currentLevel = currentUserLevelData.level;
    const nextLevel = currentLevel + 1;

    // Then call updateUserLevel
    return updateUserLevel(userId, nextLevel);
  } catch (e) {
    console.error(`Error incrementing level for ${userId}:`, e);
    throw e; // Re-throw
  }
}

/**
 * Updates or inserts a record in the requirement_progress table.
 */
export async function updateRequirementProgress(
  privyId: string,
  level: number, // Added level parameter
  requirement: string, // Changed from requirementId to requirement
  isCompleted: boolean
): Promise<{ success: boolean; error?: any }> {
  if (!privyId || !requirement || level === undefined || level === null) {
    console.warn('updateRequirementProgress requires privyId, level, and requirement');
    return { success: false, error: new Error('Missing privyId, level, or requirement') };
  }

  const supabase = getSupabase();
  const currentTime = new Date().toISOString();

  console.log(
    `Updating requirement progress for ${privyId}, level ${level}, requirement ${requirement} to ${isCompleted}`
  );

  try {
    const { error } = await supabase.from('requirement_progress').upsert(
      {
        privy_id: privyId,
        level: level, // Added level field
        requirement: requirement, // Changed to requirement
        completed: isCompleted,
        completed_at: isCompleted ? currentTime : null,
      },
      {
        onConflict: 'privy_id, level, requirement', // Updated conflict target
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.error(
        `Error upserting requirement progress for ${privyId}, level ${level}, requirement ${requirement}:`,
        error
      );
      if (error.code === '42501') {
        console.error(
          'RLS Error: Check JWT claims and INSERT/UPDATE policy on requirement_progress.'
        );
      }
      return { success: false, error };
    }

    console.log(
      `Successfully upserted requirement progress for ${privyId}, level ${level}, requirement ${requirement}.`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `Unexpected error in updateRequirementProgress for ${privyId}, level ${level}, requirement ${requirement}:`,
      error
    );
    return { success: false, error };
  }
}
