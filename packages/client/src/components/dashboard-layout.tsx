'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { UserLevelDisplay } from './user-level-display';
import { useUserLevelContext } from '../lib/user-level.tsx';
import { useLevelRequirements } from '../hooks/use-level-requirements';
import { useAuth } from '../lib/use-auth';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { BadgeCheck, ArrowRight, Rocket, Star, Crown } from 'lucide-react';
import { Button } from './ui/button';
import { LevelRequirementsPanel } from './level-requirements-panel';
import { agentLevels } from '../config/agent-levels';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

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

function Level4CompletionScreen() {
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
              DAO Member Size: <strong>10</strong>
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
              NFTs Minted: <strong>3</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LevelRequirementsList({ level }: { level: number }) {
  const levelData = agentLevels[level];

  if (!levelData) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {level < 4 ? (
            <Star className="h-5 w-5 text-primary" />
          ) : (
            <Crown className="h-5 w-5 text-amber-500" />
          )}
          Level {level}: {levelData.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{levelData.description}</p>

        {levelData.levelupRequirements.length > 0 ? (
          <>
            <h4 className="font-medium mb-2">Requirements:</h4>
            <ul className="space-y-2 mb-4">
              {levelData.levelupRequirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs">{index + 1}</span>
                  </div>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm mb-4">Maximum level achieved. No additional requirements.</p>
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
  const { level, isLoading } = useUserLevelContext();
  const { requirements } = useLevelRequirements();

  // UI state
  const [activeTab, setActiveTab] = useState('progress');

  // Only set userLevel when we have the actual data
  const userLevel = !isLoading && level !== null ? level : null;

  // Log the current level for debugging purposes
  useEffect(() => {
    console.log('[DashboardLayout] Current level:', level, 'isLoading:', isLoading);
  }, [level, isLoading]);

  // Sample metrics data - in a real implementation, this would come from your API/database
  const metricsData = {
    members: userLevel && userLevel >= 3 ? 6 : 2,
    papers: userLevel && userLevel >= 3 ? 12 : 0,
    messages: userLevel && userLevel >= 3 ? 45 : 10,
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

  const renderProgressContent = () => {
    if (isLoading || userLevel === null) {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Level Progress</h2>
          {renderSkeletonLevelRequirements()}
          <h3 className="text-lg font-medium mt-6">Next Level Preview</h3>
          {renderSkeletonLevelRequirements()}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Level Progress</h2>

        {/* Current Level Display */}
        <LevelRequirementsList level={userLevel} />

        {/* Next Level Preview (if not max level) */}
        {userLevel < 4 && (
          <>
            <h3 className="text-lg font-medium mt-6">Next Level Preview</h3>
            <LevelRequirementsList level={userLevel + 1} />
          </>
        )}
      </div>
    );
  };

  const renderMetricsContent = () => {
    if (isLoading || userLevel === null) {
      return renderSkeletonMetrics();
    }

    // For level 3, show Discord metrics
    if (userLevel === 3) {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Level 3: Discord Metrics</h2>
          <DiscordMetricsDisplay metrics={metricsData} />
        </div>
      );
    }
    // For level 4, show completion screen
    else if (userLevel === 4) {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Level 4: Ecosystem Partner</h2>
          <Level4CompletionScreen />
        </div>
      );
    }
    // For levels 1-2, show basic status metrics
    else {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Current Status</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">NFT Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-lg">
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
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="M15 8h.01" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </div>
                  <span>
                    NFTs Minted: <strong>{userLevel >= 2 ? 3 : 0}</strong>/3
                  </span>
                </div>

                {userLevel === 1 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Use the agent chat to mint science NFTs for your project.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Community Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-lg">
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
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <span>
                    Members: <strong>{metricsData.members}</strong>
                    {userLevel === 2 ? '/4' : userLevel >= 3 ? '/10' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 text-lg">
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
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <span>
                    Discord: <strong>{userLevel >= 2 ? 'Created' : 'Not Created'}</strong>
                  </span>
                </div>

                {userLevel === 1 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Use the agent chat to set up your Discord server and invite members.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <div className="lg:w-1/3">
          <UserLevelDisplay />
          <LevelRequirementsPanel />
        </div>

        <div className="lg:w-2/3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="progress" className="flex-1">
                Level Progress
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex-1">
                Status Metrics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="progress" className="space-y-4">
              {renderProgressContent()}
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              {renderMetricsContent()}
            </TabsContent>
          </Tabs>

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
              chat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
