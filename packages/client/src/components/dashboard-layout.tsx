'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { UserLevelDisplay } from './user-level-display';
import {
  BadgeCheck,
  ArrowRight,
  Rocket,
  Star,
  Crown,
  ArrowLeft,
  Users,
  FileText,
  Twitter,
  Mic2,
  BookOpen,
  MessageSquare,
  Video,
} from 'lucide-react';
import { Button } from './ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '../lib/use-auth';

const agentLevels: Record<
  number,
  { name: string; description: string; levelupRequirements: string[] }
> = {
  1: {
    name: 'Science NFT Creation',
    description: 'Mint your core project NFTs to establish your scientific assets on-chain.',
    levelupRequirements: ['Mint Idea NFT', 'Mint Vision NFT'],
  },
  2: {
    name: 'Discord Setup',
    description: "Establish your community's communication hub on Discord.",
    levelupRequirements: [
      'Share Discord invite link',
      'Install verification bot',
      'Reach 4+ members',
    ],
  },
  3: {
    name: 'Community Engagement',
    description: 'Grow your Discord community and foster initial scientific engagement.',
    levelupRequirements: ['Reach 10+ members', 'Share 25+ scientific papers', 'Send 100+ messages'],
  },
  4: {
    name: 'Social Foundation',
    description: "Establish your project's presence on Twitter.",
    levelupRequirements: ['Connect Twitter account', 'Publish 3 introductory tweets'],
  },
  5: {
    name: 'Community Verification & Outreach',
    description: 'Grow a verified scientific community and engage them via Twitter Spaces.',
    levelupRequirements: [
      '10+ verified scientists/patients in Discord',
      'Host a public Twitter Space',
    ],
  },
  6: {
    name: 'Vision Articulation',
    description: "Articulate your DAO's long-term vision through a blogpost and Twitter thread.",
    levelupRequirements: ['Publish a visionary blogpost', 'Share blogpost as a Twitter thread'],
  },
  7: {
    name: 'Onboarding Completion',
    description: 'Finalize onboarding by creating a welcome video. Congratulations!',
    levelupRequirements: ['Record a welcome Loom video for new members'],
  },
};

function ProgressCard({
  title,
  current,
  target,
  icon,
  unit = '',
}: {
  title: string;
  current: number;
  target: number;
  icon: React.ReactNode;
  unit?: string;
}) {
  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">{title}</h3>
        <div className="bg-primary/10 p-1.5 rounded-full">{icon}</div>
      </div>
      <div className="flex items-end gap-1 mb-1">
        <span className="text-2xl font-bold">{current}</span>
        <span className="text-muted-foreground text-sm">
          / {target}
          {unit}
        </span>
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
          icon={<Users className="h-4 w-4 text-primary" />}
        />
        <ProgressCard
          title="Scientific Papers"
          current={metrics.papers}
          target={requirements.papers}
          icon={<FileText className="h-4 w-4 text-primary" />}
        />
        <ProgressCard
          title="Discord Messages"
          current={metrics.messages}
          target={requirements.messages}
          icon={<MessageSquare className="h-4 w-4 text-primary" />}
        />
      </div>

      {allCompleted && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-green-500" />
            <h3 className="font-medium text-green-700 dark:text-green-400">
              All Discord metrics for Level 3 completed!
            </h3>
          </div>
          <p className="text-green-600 dark:text-green-400 text-sm mt-1">
            You've met all the Discord metrics requirements for this level.
          </p>
        </div>
      )}

      <div className="border border-border bg-card shadow-sm rounded-lg p-4">
        <h3 className="font-medium flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-full">
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
              className="text-primary"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          How It Works
        </h3>
        <p className="text-muted-foreground text-sm mt-2">
          Our Discord bot automatically tracks your server growth, scientific paper sharing, and
          message activity. You'll be notified in chat when you've met all requirements for the next
          level!
        </p>
      </div>
    </div>
  );
}

function MaxLevelCompletionScreen({ projectName }: { projectName?: string }) {
  return (
    <div className="space-y-6">
      <div className="border border-border bg-card shadow-sm rounded-lg p-6 text-center">
        <Rocket className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
          <span className="bg-primary/10 text-primary p-1.5 rounded-full">
            <Crown className="h-5 w-5" />
          </span>
          Onboarding Complete!
        </h2>
        <div className="space-y-4">
          <p className="text-lg">
            Congratulations on completing all onboarding levels for {projectName || 'your BioDAO'}!
          </p>
          <p>
            Your DAO is now fully set up and ready for growth. The BIO team and CoreAgent are here
            to support your journey.
          </p>
          <p className="mt-6">
            Explore advanced features, funding opportunities, and continue to build your scientific
            community.
          </p>
        </div>
      </div>
    </div>
  );
}

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
  const ideaNFT = nfts?.find((nft) => nft.type === 'idea');
  const visionNFT = nfts?.find((nft) => nft.type === 'vision');
  const discordMemberRequirement = 4;

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
              All required NFTs minted! Interact with them to progress.
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

function Level4SocialFoundationDisplay({
  twitterInfo,
  settingsUrl = '/settings?tab=connections',
  user,
}: {
  twitterInfo?: { connected: boolean; username?: string; introTweetsCount: number };
  settingsUrl?: string;
  user: any;
}) {
  const tweetsRequired = 3;
  const tweetsDone = twitterInfo?.introTweetsCount || 0;
  const tweetsNeeded = Math.max(0, tweetsRequired - tweetsDone);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Social Foundation</CardTitle>
        <CardDescription>Establish your project's presence on Twitter.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded bg-background">
          <div className="flex items-center gap-3">
            <Twitter className="h-6 w-6 text-blue-500" />
            <div>
              <p className="font-medium">Twitter Account</p>
              {user?.twitter ? (
                <p className="text-sm text-green-600">
                  Connected as @{user.twitter.username || 'Unknown'}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Not Connected</p>
              )}
            </div>
          </div>
          {!user?.twitter && (
            <Button asChild variant="outline" size="sm">
              <a href={settingsUrl} target="_blank" rel="noopener noreferrer">
                Connect Twitter
              </a>
            </Button>
          )}
        </div>

        {user?.twitter && (
          <div className="space-y-2">
            <Label>Introductory Tweets</Label>
            <ProgressCard
              title="Tweets Published"
              current={tweetsDone}
              target={tweetsRequired}
              icon={<MessageSquare className="h-4 w-4 text-primary" />}
            />
            {tweetsNeeded > 0 && (
              <p className="text-sm text-muted-foreground">
                Publish {tweetsNeeded} more introductory tweet(s) about your DAO and share the URLs
                with CoreAgent.
              </p>
            )}
          </div>
        )}

        {twitterInfo?.connected && tweetsDone >= tweetsRequired && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <BadgeCheck className="h-4 w-4" /> All Twitter requirements met for Level 4!
          </p>
        )}
        {!twitterInfo?.connected && (
          <p className="text-sm text-muted-foreground">
            Connect your Twitter account via settings to begin this stage.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Level5CommunityVerificationDisplay({
  communityStats,
}: {
  communityStats?: {
    verifiedScientists: number;
    twitterSpaceHosted: boolean;
    twitterSpaceUrl?: string | undefined;
  };
}) {
  const scientistsRequired = 10;
  const scientistsCurrent = communityStats?.verifiedScientists || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Community Verification & Outreach (Level 5)</CardTitle>
        <CardDescription>
          Grow a verified scientific community and host a Twitter Space.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProgressCard
          title="Verified Scientists/Patients"
          current={scientistsCurrent}
          target={scientistsRequired}
          icon={<Users className="h-4 w-4 text-primary" />}
        />
        <p className="text-xs text-muted-foreground">
          Members are verified via Discord bot DMs by sharing scientific profiles.
        </p>

        <div className="flex items-center justify-between p-3 border rounded bg-background">
          <div className="flex items-center gap-3">
            <Mic2 className="h-6 w-6 text-purple-500" />
            <div>
              <p className="font-medium">Public Twitter Space</p>
              {communityStats?.twitterSpaceHosted ? (
                <a
                  href={communityStats.twitterSpaceUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:underline"
                >
                  Space Hosted (View Link)
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Not Hosted Yet</p>
              )}
            </div>
          </div>
          {!communityStats?.twitterSpaceHosted && (
            <p className="text-xs text-muted-foreground text-right">
              Host and share URL with CoreAgent.
            </p>
          )}
        </div>
        {communityStats?.twitterSpaceHosted && scientistsCurrent >= scientistsRequired && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <BadgeCheck className="h-4 w-4" /> All requirements met for Level 5!
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Level6VisionArticulationDisplay({
  visionContent,
}: {
  visionContent?: { blogpostUrl?: string; twitterThreadUrl?: string };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Vision Articulation (Level 6)</CardTitle>
        <CardDescription>
          Publish a visionary blogpost and share it as a Twitter thread.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded bg-background">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-indigo-500" />
            <div>
              <p className="font-medium">Visionary Blogpost</p>
              {visionContent?.blogpostUrl ? (
                <a
                  href={visionContent.blogpostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:underline"
                >
                  Blogpost Published (View Link)
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Not Published Yet</p>
              )}
            </div>
          </div>
          {!visionContent?.blogpostUrl && (
            <p className="text-xs text-muted-foreground text-right">
              Publish and share URL with CoreAgent.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between p-3 border rounded bg-background">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-blue-400" />
            <div>
              <p className="font-medium">Twitter Thread</p>
              {visionContent?.twitterThreadUrl ? (
                <a
                  href={visionContent.twitterThreadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:underline"
                >
                  Thread Shared (View Link)
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Not Shared Yet</p>
              )}
            </div>
          </div>
          {!visionContent?.twitterThreadUrl && (
            <p className="text-xs text-muted-foreground text-right">
              Share and provide first tweet URL to CoreAgent.
            </p>
          )}
        </div>
        {visionContent?.blogpostUrl && visionContent?.twitterThreadUrl && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <BadgeCheck className="h-4 w-4" /> All requirements met for Level 6!
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Level7OnboardingCompletionDisplay({
  completionData,
}: {
  completionData?: { loomVideoUrl?: string };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Onboarding Completion (Level 7)</CardTitle>
        <CardDescription>Create a welcome Loom video for new members.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded bg-background">
          <div className="flex items-center gap-3">
            <Video className="h-6 w-6 text-red-500" />
            <div>
              <p className="font-medium">Welcome Loom Video</p>
              {completionData?.loomVideoUrl ? (
                <a
                  href={completionData.loomVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:underline"
                >
                  Video Submitted (View Link)
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Not Submitted Yet</p>
              )}
            </div>
          </div>
          {!completionData?.loomVideoUrl && (
            <p className="text-xs text-muted-foreground text-right">
              Record and share URL with CoreAgent.
            </p>
          )}
        </div>
        {completionData?.loomVideoUrl && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-center">
            <BadgeCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold text-green-700 dark:text-green-400">
              Congratulations! BioDAO Onboarding Complete!
            </h3>
            <p className="text-sm text-green-600 dark:text-green-500 mt-1">
              You have successfully completed all stages of the onboarding process.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LevelRequirementsList({ level, currentLevel }: { level: number; currentLevel?: number }) {
  const levelData = agentLevels[level];

  if (!levelData) return <p className="text-muted-foreground">Level data not found.</p>;
  const isCompleted = currentLevel && level < currentLevel;
  const isCurrent = currentLevel && level === currentLevel;

  let LevelIcon = Star;
  let iconColor = 'text-primary';
  if (level >= 5 && level < 7) {
    LevelIcon = Rocket;
    iconColor = 'text-orange-500';
  } else if (level >= 7) {
    LevelIcon = Crown;
    iconColor = 'text-amber-500';
  }

  return (
    <Card className={`mb-6 ${isCompleted ? 'opacity-70 border-dashed' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <LevelIcon className={`h-5 w-5 ${iconColor}`} />
            Level {level}: {levelData.name}
          </span>
          {isCompleted && <BadgeCheck className="h-6 w-6 text-green-500" />}
          {isCurrent && <Badge className="text-xs">Current Level</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{levelData.description}</p>

        {levelData.levelupRequirements.length > 0 &&
        !(
          level === 7 &&
          levelData.levelupRequirements[0]?.includes('All onboarding requirements completed!')
        ) ? (
          <>
            <h4 className="font-medium mb-2">
              Requirements to reach Level {level + 1 > 7 ? 'Completion' : level + 1}:
            </h4>
            <ul className="space-y-2 mb-4">
              {levelData.levelupRequirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div
                    className={`h-5 w-5 rounded-full ${isCompleted ? 'bg-green-100' : 'bg-primary/10'} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    {isCompleted ? (
                      <BadgeCheck className="h-3 w-3 text-green-600" />
                    ) : (
                      <span className={`text-xs ${isCompleted ? '' : 'text-primary'}`}>
                        {index + 1}
                      </span>
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
          <p className="text-sm mb-4 text-green-600 font-medium">
            {level === 7
              ? 'All onboarding requirements completed!'
              : 'No further requirements for this level.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DiscordTutorialVideo() {
  return (
    <div className="border border-border bg-card shadow-sm rounded-lg p-4 mb-6">
      <h3 className="font-medium flex items-center gap-2 mb-2">
        <div className="bg-primary/10 p-1.5 rounded-full">
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
        </div>
        Discord Server Setup Tutorial
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        Follow this step-by-step video guide to set up your Discord server and invite our bot:
      </p>
      <a
        href="https://www.youtube.com/watch?v=EDd8TMC3XfM&t=3s"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-muted/30 p-3 border rounded-md hover:bg-accent/10 transition-colors"
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
  const { level, project, discordStats, nfts, isLoading, error, refresh } = useDashboardData();
  const [userLevel, setUserLevel] = useState<number>(1);
  const [viewedLevel, setViewedLevel] = useState<number>(1);
  const { user } = useAuth();

  const totalLevels = Object.keys(agentLevels).length;

  useEffect(() => {
    if (level && typeof level === 'number') {
      const currentActualLevel = Math.min(level, totalLevels);
      setUserLevel(currentActualLevel);
      setViewedLevel((currentViewed) =>
        currentActualLevel >= currentViewed ? currentActualLevel : currentViewed
      );
    }
  }, [level, totalLevels]);

  const discordMetricsDataL3 = {
    members: discordStats?.memberCount || 0,
    papers: discordStats?.papersShared || 0,
    messages: discordStats?.messagesCount || 0,
  };

  // Derive data for levels 4-7 directly from the project object
  // const projectTwitter = project?.Twitter || {}; // Keep this in mind for typing, but use project.Twitter directly in useMemo for safety
  // const verifiedScientistCount = project?.verifiedScientistCount || 0;

  const placeholderTwitterInfo = useMemo(
    () => ({
      connected: project?.Twitter?.connected || false,
      username: project?.Twitter?.twitterUsername || '',
      introTweetsCount: project?.Twitter?.introTweetsCount || 0,
    }),
    [project?.Twitter]
  );

  const placeholderCommunityStats = useMemo(
    () => ({
      verifiedScientists: project?.verifiedScientistCount || 0,
      twitterSpaceHosted: !!project?.Twitter?.twitterSpaceUrl,
      twitterSpaceUrl:
        project?.Twitter?.twitterSpaceUrl === null ? undefined : project?.Twitter?.twitterSpaceUrl,
    }),
    [project?.Twitter, project?.verifiedScientistCount]
  );

  const placeholderVisionContent = useMemo(
    () => ({
      blogpostUrl: project?.Twitter?.blogpostUrl || undefined,
      twitterThreadUrl: project?.Twitter?.twitterThreadUrl || undefined,
    }),
    [project?.Twitter]
  );

  const placeholderCompletionData = useMemo(
    () => ({
      loomVideoUrl: project?.Twitter?.loomVideoUrl || undefined,
    }),
    [project?.Twitter]
  );

  const currentLevelDataForHeader = agentLevels[userLevel];
  const nextLevelRequirementsHeader = currentLevelDataForHeader?.levelupRequirements || [];

  const renderSkeletonLevelRequirements = () => (
    <Card className="mb-4">
      <CardHeader className="pb-2">
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

  const renderSkeletonMetrics = (count = 2) => (
    <div className="space-y-4">
      <div className="h-6 bg-muted rounded w-1/4 animate-pulse mb-4"></div>
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <Card key={i} className="mb-4">
            <CardHeader className="pb-2">
              <div className="h-5 bg-muted rounded w-1/3 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
                <div className="h-5 flex-1 bg-muted rounded animate-pulse"></div>
              </div>
              {i % 2 === 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
                  <div className="h-5 flex-1 bg-muted rounded animate-pulse"></div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );

  return (
    <div className="container py-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 bg-card rounded-lg border shadow-sm p-4">
          <UserLevelDisplay />
        </div>

        <div className="md:col-span-8 bg-card rounded-lg border shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-full">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-medium">Current Progress (Level {userLevel})</h3>
            </div>

            {userLevel > 0 ? (
              <div className="flex items-center gap-2">
                <label htmlFor="level-select" className="text-sm text-muted-foreground shrink-0">
                  View Level:
                </label>
                <Select
                  value={viewedLevel.toString()}
                  onValueChange={(value) => setViewedLevel(Math.min(parseInt(value), totalLevels))}
                >
                  <SelectTrigger id="level-select" className="w-[140px] h-8">
                    <SelectValue placeholder="Select level..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(agentLevels)
                      .map((levelKey) => parseInt(levelKey))
                      .filter(
                        (lk) => lk <= userLevel || (lk === userLevel + 1 && userLevel < totalLevels)
                      )
                      .map((i) => (
                        <SelectItem
                          key={i}
                          value={i.toString()}
                          disabled={i > userLevel + 1 && userLevel < totalLevels && i !== 1}
                        >
                          Level {i}{' '}
                          {i === userLevel
                            ? '(Current)'
                            : i === userLevel + 1 && userLevel < totalLevels
                              ? '(Next)'
                              : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Badge>Level {userLevel}</Badge>
            )}
          </div>

          {nextLevelRequirementsHeader.length > 0 &&
          !(
            userLevel === totalLevels &&
            agentLevels[totalLevels]?.levelupRequirements[0]?.includes(
              'All onboarding requirements completed!'
            )
          ) ? (
            <ul className="space-y-1 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                To reach Level {userLevel + 1 > totalLevels ? 'Completion' : userLevel + 1}:
              </p>
              {nextLevelRequirementsHeader.slice(0, 3).map((req, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-sm">
                  <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs text-primary">{idx + 1}</span>
                  </div>
                  <span className="text-muted-foreground">{req}</span>
                </li>
              ))}
              {nextLevelRequirementsHeader.length > 3 && (
                <li className="text-xs text-muted-foreground pl-7">
                  +{nextLevelRequirementsHeader.length - 3} more tasks
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-green-600 mt-2">
              {userLevel === totalLevels
                ? 'All onboarding levels completed! 🎉'
                : 'Loading requirements...'}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border shadow-sm p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="py-1">
                Level {viewedLevel}
              </Badge>
              <h2 className="text-lg font-medium">Requirements & Goals</h2>
            </div>

            {viewedLevel !== userLevel && userLevel > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewedLevel(userLevel)}
                className="text-xs h-8"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Current Level
              </Button>
            )}
          </div>

          {isLoading ? (
            renderSkeletonLevelRequirements()
          ) : (
            <LevelRequirementsList level={viewedLevel} currentLevel={userLevel} />
          )}

          <div className="border border-border bg-muted/30 rounded-lg p-3 mt-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <div className="bg-primary/10 p-1 rounded-full">
                <Rocket className="h-3.5 w-3.5 text-primary" />
              </div>
              How to Progress
            </h3>
            <div className="border-l-2 border-primary/30 pl-3 mt-1">
              <p className="text-muted-foreground text-xs">
                Use the chat with our AI agent (CoreAgent) to complete tasks and progress to the
                next level. All actions must be taken through the agent chat.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="py-1">
              Level {viewedLevel}
            </Badge>
            <h2 className="text-lg font-medium">Progress Metrics</h2>
          </div>

          {isLoading ? (
            renderSkeletonMetrics(viewedLevel > 3 ? 1 : 2)
          ) : (
            <>
              {(() => {
                if (!agentLevels[viewedLevel]) {
                  if (userLevel >= totalLevels) {
                    return <MaxLevelCompletionScreen projectName={project?.name} />;
                  }
                  return (
                    <div>Select a valid level to view details. Current Level: {userLevel}</div>
                  );
                }
                switch (viewedLevel) {
                  case 1:
                  case 2:
                    return (
                      <Level1And2MetricsDisplay
                        level={viewedLevel}
                        nfts={nfts || []}
                        discordStats={discordStats}
                        project={project}
                      />
                    );
                  case 3:
                    return <DiscordMetricsDisplay metrics={discordMetricsDataL3} />;
                  case 4:
                    return (
                      <Level4SocialFoundationDisplay
                        twitterInfo={placeholderTwitterInfo}
                        settingsUrl={
                          process.env.VITE_PUBLIC_APP_URL
                            ? `${process.env.VITE_PUBLIC_APP_URL}/settings?tab=connections`
                            : '/settings?tab=connections'
                        }
                        user={user}
                      />
                    );
                  case 5:
                    return (
                      <Level5CommunityVerificationDisplay
                        communityStats={
                          placeholderCommunityStats as {
                            verifiedScientists: number;
                            twitterSpaceHosted: boolean;
                            twitterSpaceUrl?: string | undefined;
                          }
                        }
                      />
                    );
                  case 6:
                    return (
                      <Level6VisionArticulationDisplay visionContent={placeholderVisionContent} />
                    );
                  case 7:
                    return (
                      <Level7OnboardingCompletionDisplay
                        completionData={placeholderCompletionData}
                      />
                    );
                  default:
                    return <div>Details for Level {viewedLevel} will be shown here.</div>;
                }
              })()}

              {viewedLevel === 2 && <DiscordTutorialVideo />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
