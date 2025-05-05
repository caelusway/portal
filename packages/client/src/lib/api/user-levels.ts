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

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Create API client with authentication
const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<any> => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      console.error('API key is invalid or missing');
      throw new Error('API key is invalid or missing');
    }

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }

    // For HEAD or no content requests
    if (response.status === 204 || options.method === 'HEAD') {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// API client with convenience methods
const apiClient = {
  get: (endpoint: string) => fetchWithAuth(`${API_URL}${endpoint}`),

  post: (endpoint: string, data: any) =>
    fetchWithAuth(`${API_URL}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  patch: (endpoint: string, data: any) =>
    fetchWithAuth(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (endpoint: string) =>
    fetchWithAuth(`${API_URL}${endpoint}`, {
      method: 'DELETE',
    }),
};

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

  try {
    console.log(`[getUserLevel] Fetching level for user ${privyId} from Portal API...`);

    try {
      const project = await apiClient.get(`/api/projects/privy/${privyId}`);
      console.log(`[getUserLevel] Project data retrieved:`, project);

      // Create a UserLevel object from the project data
      if (project && typeof project.level === 'number') {
        return {
          id: project.id,
          privy_id: project.privyId,
          level: project.level,
          created_at: project.createdAt,
          updated_at: project.updatedAt,
        };
      } else {
        console.warn(`[getUserLevel] Retrieved project has invalid level data:`, project);
        return null;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        console.warn(`[getUserLevel] No project found for privyId: ${privyId}`);
        return null;
      }
      throw error;
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

  console.log(`[createOrUpdateUserLevel] Checking for existing project for privyId: ${privyId}`);

  try {
    // 1. First try to get the existing project
    try {
      const project = await apiClient.get(`/api/projects/privy/${privyId}`);
      console.log(
        `[createOrUpdateUserLevel] Found existing project with level ${project.level} for ${privyId}.`
      );

      return {
        id: project.id,
        privy_id: project.privyId,
        level: project.level || 1,
        created_at: project.createdAt,
        updated_at: project.updatedAt,
      };
    } catch (error) {
      // If 404 or other error, proceed to create a new project
      if (!(error instanceof Error && error.message.includes('404'))) {
        console.error(`[createOrUpdateUserLevel] Error checking for existing project:`, error);
      }
    }

    // 3. If project doesn't exist (404) or other error, create a new one
    console.log(
      `[createOrUpdateUserLevel] No existing project found for ${privyId}. Creating new project with level 1.`
    );

    const newProject = await apiClient.post(`/api/projects/privy/${privyId}`, {
      level: 1,
    });

    // 4. Return the newly created project in UserLevel format
    console.log(
      `[createOrUpdateUserLevel] Successfully created project with level 1 for ${privyId}.`
    );

    return {
      id: newProject.id,
      privy_id: newProject.privyId,
      level: newProject.level || 1,
      created_at: newProject.createdAt,
      updated_at: newProject.updatedAt,
    };
  } catch (error) {
    // Catch any unexpected errors
    console.error(`[createOrUpdateUserLevel] Unexpected error for ${privyId}:`, error);
    return null;
  }
}

/**
 * Updates the user's level to a specific new level.
 */
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

  console.log(`Updating user level for ${privyId} to ${newLevel}...`);

  try {
    // First get the current project data
    let project;
    try {
      project = await apiClient.get(`/api/projects/privy/${privyId}`);
    } catch (error) {
      console.error(`Error fetching project for ${privyId}:`, error);
      return {
        success: false,
        error: new Error(
          `Failed to fetch project: ${error instanceof Error ? error.message : 'Unknown error'}`
        ),
      };
    }

    // Update the project with the new level
    try {
      await apiClient.patch(`/api/projects/${project.id}`, {
        level: newLevel,
      });

      console.log(`Successfully updated level for ${privyId} to ${newLevel}`);
      return { success: true };
    } catch (error) {
      console.error(`Error updating level for ${privyId}:`, error);
      return {
        success: false,
        error: new Error(
          `Failed to update level: ${error instanceof Error ? error.message : 'Unknown error'}`
        ),
      };
    }
  } catch (error) {
    console.error(`Unexpected error in updateUserLevel for ${privyId}:`, error);
    return { success: false, error };
  }
}

/**
 * Increment the user's level by 1
 */
export async function incrementUserLevel(privyId: string) {
  try {
    // First get the current level object or null
    const currentUserLevelData = await getUserLevel(privyId);

    // Check if user level data exists
    if (!currentUserLevelData) {
      console.error(`Cannot increment level for ${privyId}: User level data not found.`);
      throw new Error(`User level data not found for user ${privyId}`);
    }

    // Safely access the level property now
    const currentLevel = currentUserLevelData.level;
    const nextLevel = currentLevel + 1;

    console.log(`Incrementing level for ${privyId} from ${currentLevel} to ${nextLevel}`);

    // Then call updateUserLevel
    return updateUserLevel(privyId, nextLevel);
  } catch (e) {
    console.error(`Error incrementing level for ${privyId}:`, e);
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
