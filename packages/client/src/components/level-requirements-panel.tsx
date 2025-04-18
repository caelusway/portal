'use client';

import { useUserLevelContext } from '../lib/user-level.tsx';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, Lock, Star, Crown, AlertCircle } from 'lucide-react';
import { agentLevels } from '../config/agent-levels';
import { useLevelRequirements } from '../hooks/use-level-requirements';
import { useUserLevel } from '../hooks/use-user-level';

export function LevelRequirementsPanel() {
  const { level, isLoading: levelLoading } = useUserLevel();
  const { requirements, isLoading: requirementsLoading } = useLevelRequirements();

  const userLevel = level || 1;
  const isLoading = levelLoading || requirementsLoading;

  if (isLoading) {
    return (
      <Card className="w-full bg-card mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Level Requirements</CardTitle>
        </CardHeader>
        <CardContent className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded"></div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Get current and next level data
  const currentLevelData = agentLevels[userLevel];
  const nextLevelData = userLevel < 4 ? agentLevels[userLevel + 1] : null;

  return (
    <Card className="w-full mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Star className="mr-2 h-4 w-4" /> Level Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Current Level */}
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <div className={`p-2 rounded-full mr-3 ${getLevelIconClass(userLevel)}`}>
              {userLevel < 4 ? (
                <Star className={`h-4 w-4 ${getLevelIconColor(userLevel)}`} />
              ) : (
                <Crown className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div>
              <div className="font-medium">
                Current: Level {userLevel} - {currentLevelData.name}
              </div>
              <div className="text-xs text-muted-foreground">{currentLevelData.description}</div>
            </div>
          </div>

          {/* Current Level Requirements */}
          {currentLevelData.levelupRequirements.length > 0 && (
            <div className="pl-8 mt-2">
              <h4 className="text-sm font-medium">Your Progress:</h4>
              <ul className="space-y-2 mt-2">
                {currentLevelData.levelupRequirements.map((req, idx) => {
                  // Check if requirement is completed
                  const reqCompleted = requirements?.find(
                    (r) => r.requirement === req && r.completed
                  );

                  return (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      {reqCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 border border-muted-foreground/50 rounded-full mt-0.5 shrink-0" />
                      )}
                      <span className={reqCompleted ? 'text-muted-foreground' : ''}>{req}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 text-xs text-muted-foreground flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                Use the agent chat to complete these requirements
              </div>
            </div>
          )}
        </div>

        {/* Max Level Reached */}
        {userLevel === 4 && (
          <div className="mt-3 bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center text-green-800">
              <Crown className="h-4 w-4 mr-2" />
              <span className="font-medium">Maximum Level Reached!</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              You have full access to all BioDAO features and capabilities
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getLevelIconClass(level: number): string {
  switch (level) {
    case 1:
      return 'bg-primary/10';
    case 2:
      return 'bg-amber-500/10';
    case 3:
      return 'bg-violet-500/10';
    case 4:
      return 'bg-green-500/10';
    default:
      return 'bg-muted';
  }
}

function getLevelIconColor(level: number): string {
  switch (level) {
    case 1:
      return 'text-primary';
    case 2:
      return 'text-amber-500';
    case 3:
      return 'text-violet-500';
    default:
      return 'text-muted-foreground';
  }
}
