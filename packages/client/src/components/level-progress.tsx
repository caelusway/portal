'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useUserLevelContext } from '../lib/user-level.tsx';
import { useLevelRequirements } from '../hooks/use-level-requirements';
import { agentLevels } from '../config/agent-levels';
import { Badge } from './ui/badge';
import { CheckCircle, ArrowRight, Clipboard, Activity } from 'lucide-react';
import { useUserLevel } from '../hooks/use-user-level';

interface LevelProgressProps {
  isDemo?: boolean;
}

export function LevelProgress({ isDemo = false }: LevelProgressProps) {
  const { level, incrementLevel } = useUserLevel();
  const { requirements, markRequirementComplete } = useLevelRequirements();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    nftsMinted: isDemo ? 2 : 0,
    discordCreated: isDemo ? true : false,
    daoMembers: isDemo ? 3 : 0,
    papersShared: isDemo ? 15 : 0,
    messagesSent: isDemo ? 75 : 0,
  });

  // Display level based on prop
  const currentLevel = isDemo ? 3 : level || 1;
  const levelConfig = agentLevels[currentLevel];

  // Calculate progress percentages
  const calculateProgress = () => {
    const metricReqs = levelConfig.metricRequirements || {};

    const progressPercentages: Record<string, number> = {};

    if (metricReqs.nftsMinted) {
      progressPercentages.nftsMinted = Math.min(
        100,
        (metrics.nftsMinted / metricReqs.nftsMinted) * 100
      );
    }

    if (metricReqs.daoMembers) {
      progressPercentages.daoMembers = Math.min(
        100,
        (metrics.daoMembers / metricReqs.daoMembers) * 100
      );
    }

    if (metricReqs.papersShared) {
      progressPercentages.papersShared = Math.min(
        100,
        (metrics.papersShared / metricReqs.papersShared) * 100
      );
    }

    if (metricReqs.messagesSent) {
      progressPercentages.messagesSent = Math.min(
        100,
        (metrics.messagesSent / metricReqs.messagesSent) * 100
      );
    }

    if (metricReqs.discordCreated) {
      progressPercentages.discordCreated = metrics.discordCreated ? 100 : 0;
    }

    return progressPercentages;
  };

  const progressPercentages = calculateProgress();

  // Generate requirement items based on level config
  const generateRequirementItems = () => {
    const items = [];
    const metricReqs = levelConfig.metricRequirements || {};

    if (metricReqs.nftsMinted) {
      items.push({
        name: `Mint Science NFTs (${metrics.nftsMinted}/${metricReqs.nftsMinted})`,
        progress: progressPercentages.nftsMinted,
        completed: metrics.nftsMinted >= (metricReqs.nftsMinted || 0),
        action: {
          label: 'Mint NFTs',
          handler: () => setActiveModule('science_bank'),
        },
      });
    }

    if (metricReqs.discordCreated) {
      items.push({
        name: 'Create Discord Server',
        progress: progressPercentages.discordCreated,
        completed: metrics.discordCreated,
        action: {
          label: 'Create Server',
          handler: () => setActiveModule('discord_creator'),
        },
      });
    }

    if (metricReqs.daoMembers) {
      items.push({
        name: `Invite Team Members (${metrics.daoMembers}/${metricReqs.daoMembers})`,
        progress: progressPercentages.daoMembers,
        completed: metrics.daoMembers >= (metricReqs.daoMembers || 0),
        action: {
          label: 'Invite Members',
          handler: () => setActiveModule('team_inviter'),
        },
      });
    }

    if (metricReqs.papersShared) {
      items.push({
        name: `Share Scientific Papers (${metrics.papersShared}/${metricReqs.papersShared})`,
        progress: progressPercentages.papersShared,
        completed: metrics.papersShared >= (metricReqs.papersShared || 0),
        action: {
          label: 'Share Papers',
          handler: () => setActiveModule('paper_sharing'),
        },
      });
    }

    if (metricReqs.messagesSent) {
      items.push({
        name: `Discord Messages Sent (${metrics.messagesSent}/${metricReqs.messagesSent})`,
        progress: progressPercentages.messagesSent,
        completed: metrics.messagesSent >= (metricReqs.messagesSent || 0),
        action: {
          label: 'Open Discord',
          handler: () => window.open('https://discord.com', '_blank'),
        },
      });
    }

    return items;
  };

  const allRequirementsCompleted = () => {
    const requirements = generateRequirementItems();
    return requirements.every((req) => req.completed);
  };

  // Demo handlers for level actions
  const handleMintNFT = () => {
    setMetrics((prev) => ({ ...prev, nftsMinted: Math.min(prev.nftsMinted + 1, 3) }));
    setActiveModule(null);
    markRequirementComplete('Mint Science NFTs');
  };

  const handleCreateDiscord = () => {
    setMetrics((prev) => ({ ...prev, discordCreated: true }));
    setActiveModule(null);
    markRequirementComplete('Create a Discord server for your project');
  };

  const handleInviteMember = () => {
    setMetrics((prev) => ({
      ...prev,
      daoMembers: Math.min(prev.daoMembers + 1, currentLevel === 2 ? 4 : 10),
    }));
    setActiveModule(null);
    if (metrics.daoMembers + 1 >= 4) {
      markRequirementComplete('Grow your community to 4 members');
    }
  };

  const handleSharePaper = () => {
    setMetrics((prev) => ({ ...prev, papersShared: prev.papersShared + 1 }));
    setActiveModule(null);
  };

  const handleSimulateMessages = () => {
    setMetrics((prev) => ({ ...prev, messagesSent: prev.messagesSent + 10 }));
  };

  // Handle level up
  const handleLevelUp = () => {
    incrementLevel();
    // Reset progress for next level
    setMetrics({
      nftsMinted: metrics.nftsMinted,
      discordCreated: metrics.discordCreated,
      daoMembers: metrics.daoMembers,
      papersShared: metrics.papersShared,
      messagesSent: metrics.messagesSent,
    });
  };

  return (
    <Card className="w-full border bg-card text-card-foreground">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold">
              Level {currentLevel}: {levelConfig.name}
            </CardTitle>
            <CardDescription className="mt-1">{levelConfig.description}</CardDescription>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2 font-semibold border-2">
            Level {currentLevel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="space-y-5">
          <div className="space-y-3">
            {generateRequirementItems().map((req, index) => (
              <div key={index} className="mb-5">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    {req.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Activity className="h-5 w-5 text-amber-500" />
                    )}
                    <span className={req.completed ? 'text-muted-foreground line-through' : ''}>
                      {req.name}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={req.completed ? 'outline' : 'default'}
                    disabled={req.completed && !isDemo}
                    onClick={req.action.handler}
                  >
                    {req.action.label}
                  </Button>
                </div>
                <Progress value={req.progress} className="h-2" />
              </div>
            ))}
          </div>

          {allRequirementsCompleted() && currentLevel < 4 && (
            <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-green-800 dark:text-green-300">
                    All requirements completed!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    You're ready to advance to Level {currentLevel + 1}
                  </p>
                </div>
                <Button
                  onClick={handleLevelUp}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Level Up
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {activeModule === 'paper_sharing' && (
        <div className="absolute inset-x-0 bottom-16 mb-2 z-10 flex justify-center px-4">
          <Card className="w-full max-w-lg max-h-[60vh] flex flex-col shadow-xl border border-border">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
              <div className="flex items-center gap-2">
                <Clipboard className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Share Scientific Papers</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveModule(null)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Upload Paper</h3>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <p className="text-muted-foreground">
                    Drag and drop your paper or click to browse
                  </p>
                  <Button variant="outline" className="mt-4" onClick={handleSharePaper}>
                    Select File
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={handleSharePaper} variant="default">
                Share Paper
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Debug: Message Simulator (only in demo mode) */}
      {isDemo && currentLevel === 3 && (
        <div className="p-4 border-t">
          <Button size="sm" variant="outline" onClick={handleSimulateMessages}>
            Simulate 10 Discord Messages
          </Button>
        </div>
      )}
    </Card>
  );
}
