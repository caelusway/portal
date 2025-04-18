import { useState, useEffect } from 'react';
import { useAuth } from '../lib/use-auth';
import {
  getUserRequirements,
  completeRequirement,
  RequirementProgress,
} from '../lib/api/level-requirements';
import { checkAndProcessLevelUp } from '../lib/level-eligibility';
import { useUserLevel } from './use-user-level';

export function useLevelRequirements() {
  const { user } = useAuth();
  const { level, isLoading: isLevelLoading } = useUserLevel();
  const [requirements, setRequirements] = useState<RequirementProgress[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.id || !level || isLevelLoading) return;

    const fetchRequirements = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getUserRequirements(user.id, level);
        setRequirements(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequirements();
  }, [user, level, isLevelLoading]);

  const markRequirementComplete = async (requirement: string) => {
    if (!user?.id || !level) return;

    try {
      await completeRequirement(user.id, level, requirement);

      // Update local state
      setRequirements((prev) =>
        prev.map((req) =>
          req.requirement === requirement
            ? { ...req, completed: true, completed_at: new Date().toISOString() }
            : req
        )
      );

      // Check if user can level up now
      await checkAndProcessLevelUp(user.id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  };

  const allRequirementsCompleted = requirements.every((req) => req.completed);

  return {
    requirements,
    isLoading,
    error,
    markRequirementComplete,
    allRequirementsCompleted,
  };
}
