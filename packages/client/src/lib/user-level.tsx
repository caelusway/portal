import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './use-auth';
import { getUserLevel, createOrUpdateUserLevel, updateUserLevel } from './api/user-levels';

interface UserLevelContextType {
  level: number;
  isLoading: boolean;
  error: string | null;
  refetchLevel: () => Promise<void>;
  incrementLevel: () => Promise<void>;
}

const UserLevelContext = createContext<UserLevelContextType | undefined>(undefined);

export function UserLevelProvider({ children }: { children: React.ReactNode }) {
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
    try {
      // Only call createOrUpdateUserLevel if getUserLevel returns null (no record)
      let userLevelData = await getUserLevel(privyId);
      if (userLevelData && typeof userLevelData.level === 'number') {
        setLevel(userLevelData.level);
      } else if (userLevelData === null) {
        // No record exists, so create one with level 1
        const createdLevelData = await createOrUpdateUserLevel(privyId);
        if (createdLevelData && typeof createdLevelData.level === 'number') {
          setLevel(createdLevelData.level);
        } else {
          setError('Failed to initialize user level.');
          setLevel(1);
        }
      } else {
        // Record exists but is malformed; do not overwrite, just log
        setError('User level record has unexpected structure.');
        setLevel(1);
        console.warn('Fetched user level data has unexpected structure:', userLevelData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch or initialize user level');
      setLevel(1);
    } finally {
      setIsLoading(false);
    }
  }, [privyId]);

  useEffect(() => {
    fetchLevel();
    // Only refetch when privyId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privyId]);

  const incrementLevel = useCallback(async () => {
    if (!privyId) {
      setError('User not authenticated');
      throw new Error('User not authenticated');
    }
    const currentLevel = level;
    const nextLevel = currentLevel + 1;
    setLevel(nextLevel);
    setError(null);
    try {
      const { success, error: updateError } = await updateUserLevel(privyId, nextLevel);
      if (!success) {
        setLevel(currentLevel);
        setError(updateError?.message || 'Failed to update level');
        throw updateError || new Error('Failed to update level');
      }
    } catch (err) {
      if (level !== currentLevel) setLevel(currentLevel);
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred during level update'
      );
      throw err;
    }
  }, [privyId, level]);

  const value = useMemo(
    () => ({ level, isLoading, error, refetchLevel: fetchLevel, incrementLevel }),
    [level, isLoading, error, fetchLevel, incrementLevel]
  );

  return <UserLevelContext.Provider value={value}>{children}</UserLevelContext.Provider>;
}

export function useUserLevelContext() {
  const ctx = useContext(UserLevelContext);
  if (!ctx) throw new Error('useUserLevelContext must be used within a UserLevelProvider');
  return ctx;
}
