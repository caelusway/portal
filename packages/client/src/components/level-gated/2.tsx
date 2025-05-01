'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useState } from 'react';
import { useAuth } from '../../lib/use-auth';
import { useLevelRequirements } from '../../hooks/use-level-requirements';
import { X, CheckCircle, Lock, Users, MessageSquare, Bot } from 'lucide-react';

export function ProjectMilestonesForm() {
  const [milestones, setMilestones] = useState(['', '', '']);
  const { user } = useAuth();
  const { markRequirementComplete } = useLevelRequirements();

  const handleMilestoneChange = (index: number, value: string) => {
    const newMilestones = [...milestones];
    newMilestones[index] = value;
    setMilestones(newMilestones);
  };

  const addMilestone = () => {
    setMilestones([...milestones, '']);
  };

  const handleSubmit = async () => {
    if (milestones.some((m) => !m.trim()) || !user?.id) return;

    try {
      // Here you would normally save the milestones to your database
      console.log('Saving project milestones:', milestones);

      // Mark the requirement as complete
      await markRequirementComplete('Define project milestones');

      // Show success message
      alert('Project milestones saved successfully!');
    } catch (error) {
      console.error('Error saving project milestones:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-8">
      <CardHeader>
        <CardTitle>Project Milestones</CardTitle>
        <CardDescription>Define key milestones for your project to track progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Milestone ${index + 1}`}
                value={milestone}
                onChange={(e) => handleMilestoneChange(index, e.target.value)}
              />
            </div>
          ))}
          <div className="flex gap-4">
            <Button variant="outline" onClick={addMilestone}>
              Add Milestone
            </Button>
            <Button onClick={handleSubmit}>Save Milestones</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Updated props interface for ProjectVisionForm
interface ProjectVisionFormProps {
  closeForm?: () => void;
  onSubmit?: (data: { vision: string }) => void;
}

export function ProjectVisionForm({ closeForm, onSubmit }: ProjectVisionFormProps) {
  const [vision, setVision] = useState('');
  const { user } = useAuth();
  const { markRequirementComplete } = useLevelRequirements();

  const handleSubmit = async () => {
    if (!vision.trim()) return;

    try {
      // Here you would normally save the vision to your database
      console.log('Saving project vision:', vision);

      // If onSubmit prop is provided, call it with the data
      if (onSubmit) {
        onSubmit({ vision });
      } else {
        // Otherwise use the default behavior
        if (user?.id) {
          await markRequirementComplete('Create project vision document');
        }

        // Reset form or show success message
        alert('Project vision saved successfully!');
      }

      // Close form if closeForm prop is provided
      if (closeForm) {
        closeForm();
      }
    } catch (error) {
      console.error('Error saving project vision:', error);
    }
  };

  return (
    <Card className="w-full mx-auto border-0">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <div>
          <CardTitle>Project Vision</CardTitle>
          <CardDescription>Articulate the long-term vision for your project</CardDescription>
        </div>
        {closeForm && (
          <Button variant="ghost" size="icon" onClick={closeForm} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <Textarea
          placeholder="Describe your project vision..."
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          className="min-h-[200px] mb-4"
        />
        <Button onClick={handleSubmit}>Save Project Vision</Button>
      </CardContent>
    </Card>
  );
}

export function IdeaNFTMinter() {
  const { user } = useAuth();
  const { markRequirementComplete } = useLevelRequirements();

  const handleMintNFT = async () => {
    if (!user?.id) return;

    try {
      // Here you would normally mint the NFT
      console.log('Minting Idea NFT for user:', user.id);

      // Simulate minting process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mark the requirement as complete
      await markRequirementComplete('Mint Idea NFT');

      // Show success message
      alert('Idea NFT minted successfully!');
    } catch (error) {
      console.error('Error minting Idea NFT:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Mint Idea NFT</CardTitle>
        <CardDescription>Turn your project idea into an NFT to showcase your work</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleMintNFT}
          className="w-full bg-bio-accent hover:bg-bio-accent/90 text-bio-accent-foreground"
        >
          Mint Idea NFT
        </Button>
      </CardContent>
    </Card>
  );
}

export function DiscordSetupCard() {
  const { user } = useAuth();
  const { markRequirementComplete } = useLevelRequirements();
  const [serverName, setServerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [inviteBotDone, setInviteBotDone] = useState(false);

  const handleCreateServer = async () => {
    if (!serverName.trim() || !user?.id) return;

    setIsCreating(true);

    try {
      // Simulate server creation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setIsCreated(true);
      await markRequirementComplete('Create a Discord server for your project');
    } catch (error) {
      console.error('Error creating Discord server:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteBot = async () => {
    if (!isCreated || !user?.id) return;

    try {
      // Simulate bot invitation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setInviteBotDone(true);
      await markRequirementComplete('Invite our Discord bot');
    } catch (error) {
      console.error('Error inviting bot:', error);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" />
          Discord Server Setup
        </CardTitle>
        <CardDescription>Create a Discord server for your research community</CardDescription>
      </CardHeader>

      <CardContent>
        {!isCreated ? (
          <div className="space-y-4">
            <Input
              placeholder="Server name (e.g. My BioDAO Community)"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              className="mb-4"
            />

            <Button
              onClick={handleCreateServer}
              disabled={!serverName.trim() || isCreating}
              className="w-full"
            >
              {isCreating ? 'Creating...' : 'Create Discord Server'}
            </Button>

            {/* Show tutorial video before server is created <DiscordTutorialVideo /> */}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="font-medium text-green-700">Server Created!</p>
                <p className="text-sm text-green-600">
                  "{serverName}" has been created successfully.
                </p>
              </div>
            </div>

            {!inviteBotDone ? (
              <Button onClick={handleInviteBot} className="w-full" variant="outline">
                <Bot className="mr-2 h-4 w-4" /> Invite BioDAO Bot
              </Button>
            ) : (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <div>
                  <p className="font-medium text-green-700">Bot Added!</p>
                  <p className="text-sm text-green-600">
                    BioDAO Bot has been added to your server.
                  </p>
                </div>
              </div>
            )}

            {/* Still show both components after creation for reference */}
            <DiscordTutorialVideo />
            <BioDaoInviteDemo />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TeamInviteCard() {
  const { user } = useAuth();
  const { markRequirementComplete } = useLevelRequirements();
  const [members, setMembers] = useState<
    Array<{ email: string; name: string; status: 'pending' | 'joined' }>
  >([{ email: '', name: '', status: 'pending' }]);
  const [isSending, setIsSending] = useState(false);

  const addMember = () => {
    setMembers([...members, { email: '', name: '', status: 'pending' }]);
  };

  const updateMember = (index: number, field: 'email' | 'name', value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setMembers(newMembers);
  };

  const handleSendInvites = async () => {
    const validMembers = members.filter((m) => m.email.trim() && m.name.trim());
    if (validMembers.length === 0 || !user?.id) return;

    setIsSending(true);

    try {
      // Simulate sending invites
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate some members joining
      setMembers(
        validMembers.map((member, idx) => ({
          ...member,
          status: idx < 3 ? 'joined' : 'pending',
        }))
      );

      if (validMembers.length >= 3) {
        await markRequirementComplete('Grow your community to 4 members');
      }
    } catch (error) {
      console.error('Error sending invites:', error);
    } finally {
      setIsSending(false);
    }
  };

  const joinedCount = members.filter((m) => m.status === 'joined').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="mr-2 h-5 w-5" />
          Invite Team Members
        </CardTitle>
        <CardDescription>Grow your community by inviting team members</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {joinedCount > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
              <p className="font-medium text-blue-700">
                Community Growth: {joinedCount + 1}/4 members
              </p>
              <p className="text-sm text-blue-600">
                {joinedCount + 1 >= 4
                  ? 'Congratulations! You have enough members to advance.'
                  : `Invite ${4 - (joinedCount + 1)} more members to complete this requirement.`}
              </p>
            </div>
          )}

          {members.map((member, index) => (
            <div key={index} className="space-y-3 p-3 border rounded-md">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  value={member.name}
                  onChange={(e) => updateMember(index, 'name', e.target.value)}
                  placeholder="Colleague's name"
                  disabled={member.status === 'joined'}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  value={member.email}
                  onChange={(e) => updateMember(index, 'email', e.target.value)}
                  placeholder="Email address"
                  type="email"
                  disabled={member.status === 'joined'}
                />
              </div>
              {member.status === 'joined' && (
                <div className="flex items-center text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4 mr-1" /> Joined
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <Button variant="outline" onClick={addMember} className="flex-1">
              Add Another
            </Button>
            <Button
              onClick={handleSendInvites}
              disabled={isSending || members.every((m) => m.status === 'joined')}
              className="flex-1"
            >
              {isSending ? 'Sending...' : 'Send Invites'}
            </Button>
          </div>

          {joinedCount + 1 < 4 && (
            <div className="flex items-center justify-between p-3 mt-4 bg-muted/50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Level 3 locked until you have 4 total members
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Add Discord Tutorial Video component
export function DiscordTutorialVideo() {
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

// Bio DAO Discord Invitation Demo component
export function BioDaoInviteDemo() {
  const [copied, setCopied] = useState(false);
  const inviteLink = 'https://discord.gg/biodao';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-900">
      <h3 className="font-medium flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-400">
        <MessageSquare className="h-4 w-4" />
        Join Our Bio DAO Discord (Demo)
      </h3>

      <p className="text-sm text-blue-700/80 dark:text-blue-400/80 mb-4">
        As a demonstration, you can join our actual Bio DAO Discord server to see how an active
        scientific community operates:
      </p>

      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-medium text-sm text-blue-700 dark:text-blue-400">
            <CheckCircle className="h-4 w-4" />
            Learn from real scientists and researchers
          </div>
          <div className="flex items-center gap-2 font-medium text-sm text-blue-700 dark:text-blue-400">
            <CheckCircle className="h-4 w-4" />
            See how we organize research discussions
          </div>
          <div className="flex items-center gap-2 font-medium text-sm text-blue-700 dark:text-blue-400">
            <CheckCircle className="h-4 w-4" />
            Experience our NFT and token gating systems
          </div>
        </div>

        <div className="bg-white dark:bg-blue-950/50 p-3 rounded-md border border-blue-200 dark:border-blue-800 flex items-center justify-between">
          <div className="font-medium text-blue-700 dark:text-blue-400 overflow-hidden text-ellipsis">
            {inviteLink}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-2 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900"
            onClick={handleCopyLink}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>

        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => window.open(inviteLink, '_blank')}
        >
          Join Bio DAO Discord
        </Button>
      </div>
    </div>
  );
}
