'use client';

import { useUserLevelContext } from '../lib/user-level.tsx';
import { useAuth } from '../lib/use-auth';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Crown, Star } from 'lucide-react';

export function UserLevelDisplay() {
  const { level, isLoading, error } = useUserLevelContext();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <Card className="p-6 bg-card animate-pulse h-32 max-w-md mx-auto mb-6">
        <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
        <div className="h-10 bg-muted rounded mb-4"></div>
        <div className="h-4 bg-muted rounded w-3/4"></div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 max-w-md mx-auto border-destructive/50 text-destructive mb-6">
        <h2 className="text-xl font-semibold mb-1">Error</h2>
        <p className="text-sm">Could not load user level: {error.message}</p>
      </Card>
    );
  }

  const userLevel = level || 1;
  const userName = user?.email?.address ? user.email.address.split('@')[0] : 'Researcher';

  return (
    <Card className="p-6 max-w-md mx-auto mb-6 bg-gradient-to-br from-background to-muted">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Welcome, {userName}</h2>
        {getLevelBadge(userLevel)}
      </div>

      <div className="flex items-center mb-4">
        <div className="bg-primary/10 p-3 rounded-full mr-4">
          {userLevel === 1 && <Star className="h-8 w-8 text-primary" />}
          {userLevel === 2 && <Star className="h-8 w-8 text-amber-500" />}
          {userLevel === 3 && <Star className="h-8 w-8 text-violet-500" />}
          {userLevel === 4 && <Crown className="h-8 w-8 text-amber-500" />}
        </div>
        <div>
          <div className="text-2xl font-bold">{getLevelName(userLevel)}</div>
          <div className="text-sm text-muted-foreground">{getLevelDescription(userLevel)}</div>
        </div>
      </div>
    </Card>
  );
}

function getLevelBadge(level: number) {
  switch (level) {
    case 1:
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary">
          Level 1
        </Badge>
      );
    case 2:
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500">
          Level 2
        </Badge>
      );
    case 3:
      return (
        <Badge variant="outline" className="bg-violet-500/10 text-violet-500">
          Level 3
        </Badge>
      );
    case 4:
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500">
          Level 4
        </Badge>
      );
    default:
      return <Badge variant="outline">Level {level}</Badge>;
  }
}

function getLevelName(level: number): string {
  switch (level) {
    case 1:
      return 'Inception Stage';
    case 2:
      return 'Community Builder';
    case 3:
      return 'Scientific Collaborator';
    case 4:
      return 'Ecosystem Partner';
    default:
      return `Level ${level}`;
  }
}

function getLevelDescription(level: number): string {
  switch (level) {
    case 1:
      return 'Document scientific ideas & mint NFTs';
    case 2:
      return 'Build a community with Discord';
    case 3:
      return 'Expand community & share research';
    case 4:
      return 'Access to the full ecosystem';
    default:
      return 'Advanced BioDAO member';
  }
}
