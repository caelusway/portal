'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { UserLevelDisplay } from './user-level-display';
import { BadgeCheck, ArrowRight, Rocket, Star, Crown, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { LevelRequirementsPanel } from './level-requirements-panel';
import { agentLevels } from '../config/agent-levels';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useDashboardData } from '../hooks/use-dashboard-data';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Level 1 - Inception Stage: Science NFT Minting

// Level 2 - Community Builder: Discord Setup and Team Invites

// Level 3 - Scientific Collaborator: Paper Sharing and Community Growth

// Level 4 - Ecosystem Partner: Congratulations Screen

// Level 3 display components
function ProgressCard({
  title,
  current,
  target,
  icon,
}: {
  title: string;
  current: number;
  target: number;
  icon: React.ReactNode;
}) {
  const progress = Math.min(100, Math.round((current / target) * 100));

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">{title}</h3>
        <div className="bg-primary/10 p-1.5 rounded-full">{icon}</div>
      </div>
      <div className="flex items-end gap-1 mb-1">
        <span className="text-2xl font-bold">{current}</span>
        <span className="text-muted-foreground text-sm">/ {target}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-primary'}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="mt-1 text-xs text-right text-muted-foreground">{progress}% complete</div>
    </div>
  );
}

function DiscordMetricsDisplay({
  metrics,
}: {
  metrics: { members: number; papers: number; messages: number };
}) {
  const requirements = {
    members: 10,
    papers: 25,
    messages: 100,
  };

  const allCompleted =
    metrics.members >= requirements.members &&
    metrics.papers >= requirements.papers &&
    metrics.messages >= requirements.messages;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProgressCard
          title="Discord Members"
          current={metrics.members}
          target={requirements.members}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 0 0-6-6 6 6 0 0 0-6 6 7 7 0 0 0 12 5" />
              <path d="M10 9a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1z" />
              <path d="M14 16v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-5a1 1 0 0 0-1 1v1" />
            </svg>
          }
        />
        <ProgressCard
          title="Scientific Papers"
          current={metrics.papers}
          target={requirements.papers}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          }
        />
        <ProgressCard
          title="Discord Messages"
          current={metrics.messages}
          target={requirements.messages}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          }
        />
      </div>

      {allCompleted && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-green-500" />
            <h3 className="font-medium text-green-700">All requirements completed!</h3>
          </div>
          <p className="text-green-600 text-sm mt-1">
            You've met all the Discord metrics requirements. Ready for next level!
          </p>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-700 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          How It Works
        </h3>
        <p className="text-blue-600 text-sm mt-1">
          Our Discord bot automatically tracks your server growth, scientific paper sharing, and
          message activity. You'll be notified in chat when you've met all requirements for level 4!
        </p>
      </div>
    </div>
  );
}

function Level4CompletionScreen({
  memberCount,
  nftCount,
}: {
  memberCount: number;
  nftCount: number;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Congratulations!</h2>
        <div className="space-y-4">
          <p className="text-lg">Your DAO is now Level 4!</p>

          <p>The BIO team is now available to you, they'll reach out shortly.</p>

          <p>Continue sharing papers, inviting community members, and discussing science.</p>

          <p className="mt-6">
            You can learn about the next phase of building your DAO in our sandbox guide.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Community Status</h3>
          <div className="flex items-center gap-2 text-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>
              DAO Member Size: <strong>{memberCount || 10}</strong>
            </span>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Science Bank</h3>
          <div className="flex items-center gap-2 text-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
            </svg>
            <span>
              NFTs Minted: <strong>{nftCount || 3}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component to show Level 1/2 NFT & Discord Status
function Level1And2MetricsDisplay({
  level,
  nfts,
  discordStats,
  project,
}: {
  level: number;
  nfts: any[];
  discordStats: any;
  project: any;
}) {
  // Find specific NFTs
  const ideaNFT = nfts?.find((nft) => nft.type === 'idea');
  const visionNFT = nfts?.find((nft) => nft.type === 'vision');
  const discordMemberRequirement = 4; // For level 2 completion

  // Function to render NFT status with image
  const renderNFTStatus = (nft: any, type: string, name: string) => {
    const isMinted = !!nft;
    const imageUrl = nft?.imageUrl;
    const displayImageUrl = imageUrl?.startsWith('/')
      ? `${import.meta.env.VITE_PUBLIC_API_URL}${imageUrl}`
      : imageUrl;

    return (
      <div className="flex items-center justify-between p-2 border rounded mb-2 bg-background">
        <div className="flex items-center gap-2">
          {isMinted && imageUrl ? (
            <img
              src={displayImageUrl}
              alt={`${name} NFT`}
              className="w-10 h-10 object-cover rounded"
            />
          ) : isMinted ? (
            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs">
              No Img
            </div>
          ) : (
            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">?</div>
          )}
          <span className="text-sm font-medium">{name} NFT</span>
        </div>
        {isMinted ? (
          <BadgeCheck className="h-5 w-5 text-green-500" />
        ) : (
          <span className="text-xs text-muted-foreground">Not Minted</span>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Science NFTs (Level 1)</CardTitle>
          <CardDescription>Mint your core project NFTs.</CardDescription>
        </CardHeader>
        <CardContent>
          {renderNFTStatus(ideaNFT, 'idea', 'Idea')}
          {renderNFTStatus(visionNFT, 'vision', 'Vision')}

          {level === 1 && (!ideaNFT || !visionNFT) && (
            <p className="text-sm text-muted-foreground mt-3">
              Use the agent chat to mint your required Idea and Vision NFTs.
            </p>
          )}
          {level === 1 && ideaNFT && visionNFT && (
            <p className="text-sm text-green-600 mt-3 flex items-center gap-1">
              <BadgeCheck className="h-4 w-4" /> All required NFTs minted! Interact with them to
              progress.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Community Status (Level 2)</CardTitle>
          <CardDescription>Establish your Discord presence.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Discord Created Status */}
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Discord Server
            </span>
            {discordStats ? (
              <BadgeCheck className="h-5 w-5 text-green-500" />
            ) : (
              <span className="text-xs text-muted-foreground">Not Created</span>
            )}
          </div>

          {/* Discord Member Count Status*/}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Discord Members
            </span>
            <span
              className={`text-sm font-medium ${discordStats?.memberCount >= discordMemberRequirement ? 'text-green-600' : ''}`}
            >
              <strong>{discordStats?.memberCount || 0}</strong>/{discordMemberRequirement}
            </span>
          </div>

          {level === 1 && (
            <p className="text-sm text-muted-foreground mt-3">
              Use the agent chat to set up your Discord server (Requirement for Level 2).
            </p>
          )}
          {level === 2 && !discordStats && (
            <p className="text-sm text-muted-foreground mt-3">
              Use the agent chat to set up your Discord server and invite members.
            </p>
          )}
          {level === 2 && discordStats && discordStats.memberCount < discordMemberRequirement && (
            <p className="text-sm text-muted-foreground mt-3">
              Invite members to your Discord server to reach the goal of {discordMemberRequirement}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LevelRequirementsList({ level, currentLevel }: { level: number; currentLevel?: number }) {
  const levelData = agentLevels[level];

  if (!levelData) return null;
  const isCompleted = currentLevel && level < currentLevel;
  const isCurrent = currentLevel && level === currentLevel;

  return (
    <Card className={`mb-6 ${isCompleted ? 'opacity-70 border-dashed' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {level < 4 ? (
              <Star className="h-5 w-5 text-primary" />
            ) : (
              <Crown className="h-5 w-5 text-amber-500" />
            )}
            Level {level}: {levelData.name}
          </span>
          {isCompleted && <BadgeCheck className="h-6 w-6 text-green-500" />}
          {isCurrent && <Badge className="text-xs">Current Level</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{levelData.description}</p>

        {levelData.levelupRequirements.length > 0 ? (
          <>
            <h4 className="font-medium mb-2">Requirements to reach Level {level + 1}:</h4>
            <ul className="space-y-2 mb-4">
              {levelData.levelupRequirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div
                    className={`h-5 w-5 rounded-full ${isCompleted ? 'bg-green-100' : 'bg-primary/10'} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    {isCompleted ? (
                      <BadgeCheck className="h-3 w-3 text-green-600" />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  <span className={isCompleted ? 'line-through text-muted-foreground' : ''}>
                    {req}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          level === 4 && (
            <p className="text-sm mb-4">Maximum level achieved. Continue growing your DAO!</p>
          )
        )}
      </CardContent>
    </Card>
  );
}

// Add a Discord Tutorial Video component for Level 2
function DiscordTutorialVideo() {
  return (
    <div className="bg-muted/50 rounded-lg p-4 mb-6">
      <h3 className="font-medium flex items-center gap-2 mb-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        >
          <path d="m22 8-6 4 6 4V8Z" />
          <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
        </svg>
        Discord Server Setup Tutorial
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        Follow this step-by-step video guide to set up your Discord server and invite our bot:
      </p>
      <a
        href="https://www.youtube.com/watch?v=EDd8TMC3XfM&t=3s"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-card p-3 border rounded-md hover:bg-accent/10 transition-colors"
      >
        <div className="bg-primary/10 p-2 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="font-medium">Discord Server Setup for BioDAO</div>
          <div className="text-xs text-muted-foreground">youtube.com</div>
        </div>
      </a>
    </div>
  );
}

export function DashboardLayout() {
  const { level, project, discordStats, nfts, progress, isLoading, error, refresh } =
    useDashboardData();
  const [userLevel, setUserLevel] = useState<number>(1); // Actual current level
  const [viewedLevel, setViewedLevel] = useState<number>(1); // Level being viewed

  // Update userLevel whenever level changes or when project data loads
  useEffect(() => {
    // Only update if level is available and valid
    if (level && typeof level === 'number') {
      setUserLevel(level);
      // Only update viewedLevel if it hasn't been manually changed by the user yet,
      // or if the user's actual level increases beyond the currently viewed one.
      setViewedLevel((currentViewed) => (level >= currentViewed ? level : currentViewed));
    }
  }, [level]);

  // Calculate metrics from real data
  const metricsData = {
    members: discordStats?.memberCount || 0,
    papers: discordStats?.papersShared || 0,
    messages: discordStats?.messagesCount || 0,
  };

  // Render skeleton loaders for level requirements
  const renderSkeletonLevelRequirements = () => (
    <Card className="mb-6">
      <CardHeader>
        <div className="h-6 bg-muted rounded w-1/3 animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="h-4 bg-muted rounded w-3/4 mb-4 animate-pulse"></div>
        <div className="h-4 bg-muted rounded w-1/4 mb-2 animate-pulse"></div>
        <div className="space-y-2 mb-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-muted animate-pulse"></div>
                <div className="h-4 flex-1 bg-muted rounded animate-pulse"></div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );

  // Skeleton metrics display
  const renderSkeletonMetrics = () => (
    <div className="space-y-6">
      <div className="h-6 bg-muted rounded w-1/4 animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="h-5 bg-muted rounded w-1/3 animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
              <div className="h-5 flex-1 bg-muted rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 bg-muted rounded w-1/3 animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
              <div className="h-5 flex-1 bg-muted rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
              <div className="h-5 flex-1 bg-muted rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Level Navigation Dropdown
  const renderLevelNavigator = () => {
    const options = [];
    for (let i = 1; i <= userLevel; i++) {
      options.push(
        <SelectItem key={i} value={i.toString()}>
          Level {i} {i === userLevel ? '(Current)' : i < userLevel ? '(Completed)' : ''}
        </SelectItem>
      );
    }

    // Only show navigator if user is past level 1
    if (userLevel > 1) {
      return (
        <div className="mb-6 flex items-center gap-2 border-b pb-4">
          <label
            htmlFor="level-select"
            className="text-sm font-medium text-muted-foreground shrink-0"
          >
            Navigate Levels:
          </label>
          <Select
            value={viewedLevel.toString()}
            onValueChange={(value) => setViewedLevel(parseInt(value))}
          >
            <SelectTrigger id="level-select" className="w-[200px] h-9">
              <SelectValue placeholder="Select level..." />
            </SelectTrigger>
            <SelectContent>{options}</SelectContent>
          </Select>
        </div>
      );
    }
    return null; // Don't show navigator at level 1
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <div className="lg:w-1/3">
          <UserLevelDisplay />
          <LevelRequirementsPanel />
        </div>

        <div className="lg:w-2/3">
          {/* Use Level Navigator Dropdown */}
          {renderLevelNavigator()}

          {/* Display Content Directly */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Details for Level {viewedLevel}</h2>

            {/* Display Requirements for the viewed level */}
            {isLoading ? (
              renderSkeletonLevelRequirements()
            ) : (
              <LevelRequirementsList level={viewedLevel} currentLevel={userLevel} />
            )}

            {/* Display Status/Metrics for the viewed level */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Status & Metrics</h3>
              {isLoading
                ? renderSkeletonMetrics()
                : (() => {
                    switch (viewedLevel) {
                      case 1:
                      case 2:
                        return (
                          <Level1And2MetricsDisplay
                            level={viewedLevel}
                            nfts={nfts}
                            discordStats={discordStats}
                            project={project}
                          />
                        );
                      case 3:
                        return <DiscordMetricsDisplay metrics={metricsData} />;
                      case 4:
                        return (
                          <Level4CompletionScreen
                            memberCount={metricsData.members}
                            nftCount={nfts?.length || 0}
                          />
                        );
                      default:
                        return <div>Select a level to view details.</div>;
                    }
                  })()}
              {/* Show tutorial video only when viewing level 2      {viewedLevel === 2 && <DiscordTutorialVideo />} */}
            </div>

            {/* Add a button to go back to current level view */}
            {viewedLevel !== userLevel && (
              <Button variant="outline" onClick={() => setViewedLevel(userLevel)} className="mt-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Go to Current Level ({userLevel})
              </Button>
            )}
          </div>

          {/* Keep the "How to Progress" info box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
            <h3 className="font-medium text-amber-800 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              How to Progress
            </h3>
            <p className="text-amber-700 text-sm mt-1">
              Use the chat with our AI agent to complete tasks and progress to the next level. The
              dashboard shows your current progress but all actions must be taken through the agent
              chat. You can view previous level details using the navigation dropdown above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
