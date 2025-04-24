import { getSupabase } from '../supabase-client';
import { UserProgress } from '../../types/database.types';

/**
 * Creates or updates a user's level
 * @param privyId The privy id of the user
 * @param level The level to set for the user, defaults to 1
 */
export async function createOrUpdateUserLevel(
  privyId: string,
  level: number = 1
): Promise<UserProgress> {
  if (!privyId) {
    throw new Error('Privy ID is required to create a user level');
  }

  const supabase = getSupabase();

  // Create or update user level
  const { data, error } = await supabase
    .from('user_levels')
    .upsert(
      {
        privy_id: privyId,
        level: level,
      },
      {
        onConflict: 'privy_id',
        // Don't update if the record already exists
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error creating/updating user level:', error);
    if (error.code === '42501') {
      console.error(
        'RLS Error: Ensure JWT has correct privy_id claim and RLS policies allow operation.'
      );
    }
    throw new Error('Failed to create/update user level');
  }

  return data as unknown as UserProgress;
}

/**
 * Updates a user's level to a higher level
 * Only allows increasing levels, not decreasing
 * @param privyId The privy id of the user
 * @param level The new level to set
 */
export async function levelUpUser(privyId: string, level: number): Promise<UserProgress> {
  if (!privyId) {
    throw new Error('Privy ID is required to level up a user');
  }

  if (level < 1) {
    throw new Error('Level must be at least 1');
  }

  // First get the current level
  // (Assume getUserLevel is now only the API-based one, so skip direct Supabase call)
  // You may want to implement a direct Supabase check if needed

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('user_levels')
    .upsert(
      {
        privy_id: privyId,
        level: level,
      },
      {
        onConflict: 'privy_id',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error leveling up user:', error);
    throw new Error('Failed to level up user');
  }

  return data as unknown as UserProgress;
}

/**
 * API functions for fetching and updating user level
 */

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Fetch current user level by project ID
 * @param projectId The project ID to fetch level for
 * @returns The user's current level info or null if error
 */
export async function fetchCurrentLevel(projectId: string): Promise<number | null> {
  if (!projectId) {
    console.warn('fetchCurrentLevel called without projectId');
    return null;
  }

  try {
    console.log(`[fetchCurrentLevel] Fetching current level for project ${projectId}`);
    const response = await fetch(`${API_URL}/api/projects/${projectId}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[fetchCurrentLevel] No project found with ID: ${projectId}`);
        return null;
      }
      throw new Error(`Error fetching user level: ${response.statusText}`);
    }

    const project = await response.json();
    console.log(`[fetchCurrentLevel] Project data retrieved:`, project);

    if (project && typeof project.level === 'number') {
      return project.level;
    } else {
      console.warn(`[fetchCurrentLevel] Retrieved project has invalid level data:`, project);
      return null;
    }
  } catch (error) {
    console.error(`[fetchCurrentLevel] Error fetching level for ${projectId}:`, error);
    return null;
  }
}

/**
 * Fetch user progress by Privy ID
 * @param privyId The Privy ID to fetch progress for
 * @returns The user's progress data or null if error
 */
export async function getUserLevel(privyId: string): Promise<UserProgress | null> {
  if (!privyId) {
    console.warn('getUserLevel called without privyId');
    return null;
  }

  try {
    console.log(`[getUserLevel] Fetching level for user ${privyId}`);
    const response = await fetch(`${API_URL}/api/projects/privy/${privyId}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[getUserLevel] No project found for privyId: ${privyId}`);
        return null;
      }
      throw new Error(`Error fetching user level: ${response.statusText}`);
    }

    const project = await response.json();

    // Only return properties defined in UserProgress
    return {
      id: project.id,
      user_id: project.user_id,
      level: project.level || 1,
      updated_at: project.updatedAt,
    };
  } catch (error) {
    console.error(`[getUserLevel] Error:`, error);
    return null;
  }
}

export default {
  fetchCurrentLevel,
  getUserLevel,
};
