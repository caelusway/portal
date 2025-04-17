import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/use-auth';
import {
  updateUserLevel,
  incrementUserLevel,
  getUserLevel,
  createDefaultUserLevel,
  createOrUpdateUserLevel,
} from '../lib/api/user-levels';
import { supabase } from '../lib/supabase-client';

interface UserLevel {
  level: number;
  updated_at: string;
}

export function useUserLevel() {
  const { user } = useAuth();
  const privyId = user?.id;
  const [level, setLevel] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLevel = useCallback(async () => {
    if (!privyId) {
      setIsLoading(false);
      setLevel(1);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    let userLevelData: UserLevel | null = null;

    try {
      console.log(`[useUserLevel] Attempting to fetch level for ${privyId}...`);
      userLevelData = await getUserLevel(privyId);

      if (userLevelData && typeof userLevelData.level === 'number') {
        console.log(`[useUserLevel] Level ${userLevelData.level} found for ${privyId}.`);
        setLevel(userLevelData.level);
      } else {
        console.log(
          `[useUserLevel] No valid level data returned for ${privyId} from initial fetch.`
        );
        console.log(`[useUserLevel] Attempting createOrUpdateUserLevel for ${privyId}...`);
        const createdLevelData = await createOrUpdateUserLevel(privyId);

        if (createdLevelData && typeof createdLevelData.level === 'number') {
          console.log(
            `[useUserLevel] Ensured level ${createdLevelData.level} exists for ${privyId}.`
          );
          setLevel(createdLevelData.level);
        } else {
          console.error(`[useUserLevel] Failed to create/ensure level 1 record for ${privyId}.`);
          setError('Failed to initialize user level.');
          setLevel(1);
        }
      }
    } catch (err: any) {
      console.error(`[useUserLevel] Error during level fetch/create for ${privyId}:`, err);
      setError(err.message || 'Failed to fetch or initialize user level');
      setLevel(1);
    } finally {
      setIsLoading(false);
    }
  }, [privyId]);

  useEffect(() => {
    fetchLevel();
  }, [fetchLevel]);

  const incrementLevel = useCallback(async () => {
    if (!privyId) {
      console.error('Cannot increment level without privyId.');
      throw new Error('User not authenticated');
    }

    const currentLevel = level;
    const nextLevel = currentLevel + 1;

    setLevel(nextLevel);
    setError(null);

    try {
      const { success, error: updateError } = await updateUserLevel(privyId, nextLevel);
      if (!success) {
        console.error('Failed to update level on backend:', updateError);
        setLevel(currentLevel);
        setError(updateError?.message || 'Failed to update level');
        throw updateError || new Error('Failed to update level');
      }
      console.log(`Successfully updated level to ${nextLevel} for ${privyId}`);
    } catch (err) {
      if (level !== currentLevel) {
        setLevel(currentLevel);
      }
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred during level update'
      );
      throw err;
    }
  }, [privyId, level]);

  return { level, isLoading, error, refetchLevel: fetchLevel, incrementLevel };
}
