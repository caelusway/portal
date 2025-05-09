import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useDatabase, ProjectMember, Twitter } from '@/contexts/db-context';
import { ProjectInvitations } from '@/components/project-invitations';
import {
  Users,
  UserPlus,
  RefreshCw,
  X,
  User,
  Twitter as TwitterIcon,
  MessageCircle,
  Link2,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '@/lib/settings-context';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
// Import Privy hook for linking accounts
import { useLinkAccount, usePrivy } from '@privy-io/react-auth';

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, updateActiveTab } = useSettings();
  const {
    getProjectByPrivyId,
    getProjectMembers,
    updateProjectMemberRole,
    removeProjectMember,
    getUserByPrivyId,
    updateUserSocialConnections,
    getTwitterByProjectId,
    updateTwitterInfo,
  } = useDatabase();

  // Use Privy hooks
  const privy = usePrivy();
  const { unlinkTwitter, unlinkDiscord } = privy;

  // Use Privy's useLinkAccount hook
  const { linkTwitter, linkDiscord } = useLinkAccount({
    onSuccess: async ({ linkMethod, linkedAccount }) => {
      // Refresh user data from Privy after successful connection
      try {
        // Wait a brief moment for Privy to update their backend
        await new Promise((r) => setTimeout(r, 1000));

        // Get the updated user from Privy
        const updatedPrivyUser = privy.user;

        // Add debug logging
        console.log('Updated Privy user:', updatedPrivyUser);

        if (!updatedPrivyUser || !isAuthenticated) {
          console.error('User not authenticated or not found');
          return;
        }

        // Get our BioUser from database
        const bioUser = await getUserByPrivyId(updatedPrivyUser.id);

        if (!bioUser) {
          console.error('BioUser not found in database');
          return;
        }

        // Add debug logging for social accounts
        console.log('Discord connection:', updatedPrivyUser.discord);
        console.log('Twitter connection:', updatedPrivyUser.twitter);

        // Check which platform was linked and extract the data
        if (linkMethod === 'discord' && updatedPrivyUser.discord) {
          // Use any type to bypass TypeScript checking
          const discord = updatedPrivyUser.discord as any;

          await updateUserSocialConnections(bioUser.id, {
            platform: 'discord',
            platformId: discord.subject || '',
            username: discord.username || '',
            email: discord.email || undefined,
            avatarUrl: discord.profileImage || discord.avatarUrl || discord.avatar || undefined,
          });

          console.log('Saved Discord connection to API');
        } else if (linkMethod === 'twitter' && updatedPrivyUser.twitter) {
          // Use any type to bypass TypeScript checking
          const twitter = updatedPrivyUser.twitter as any;

          await updateUserSocialConnections(bioUser.id, {
            platform: 'twitter',
            platformId: twitter.subject || '',
            username: twitter.username || '',
            avatarUrl:
              twitter.profileImage ||
              twitter.avatarUrl ||
              twitter.avatar ||
              twitter.profilePictureUrl ||
              undefined,
          });

          console.log('Saved Twitter connection to API');
        }

        toast({
          title: 'Account Linked',
          description: `Successfully linked your ${linkMethod} account`,
        });
      } catch (error) {
        console.error('Error saving connection to API:', error);
        toast({
          title: 'Connection Error',
          description: `Your ${linkMethod} account was linked but we couldn't save it to our database. Please try again.`,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to link account: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Handle unlinking accounts
  const handleUnlinkAccount = async (platform: 'twitter' | 'discord') => {
    try {
      if (platform === 'twitter') {
        await unlinkTwitter(user?.twitter?.subject || '');
      } else if (platform === 'discord') {
        await unlinkDiscord(user?.discord?.subject || '');
      }

      // Get our BioUser from database to update the connection
      if (user?.id) {
        const bioUser = await getUserByPrivyId(user.id);
        if (bioUser) {
          // Update the database to reflect the unlinked account
          // We're sending empty values to clear the connection
          await updateUserSocialConnections(bioUser.id, {
            platform,
            platformId: '',
            username: '',
          });
        }
      }

      toast({
        title: 'Account Unlinked',
        description: `Successfully disconnected your ${platform} account`,
      });

      // Force refresh to show updated UI
      window.location.reload();
    } catch (error) {
      console.error(`Error unlinking ${platform} account:`, error);
      toast({
        title: 'Error',
        description: `Failed to unlink ${platform} account. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  // Use active tab from settings context
  const [activeTab, setActiveTab] = useState(settings.activeTab);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [twitterInfo, setTwitterInfo] = useState<Twitter | null>(null);
  const [isTwitterLoading, setIsTwitterLoading] = useState(false);

  // Account settings state
  const [accountSettings, setAccountSettings] = useState({
    email: '',
  });

  console.log('linkedAccounts', user);

  // Update tab in settings context when it changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    updateActiveTab(tab);
  };

  // Sync local state with settings context if it changes externally
  useEffect(() => {
    if (settings.activeTab !== activeTab) {
      setActiveTab(settings.activeTab);
    }
  }, [settings.activeTab]);

  // Load Twitter information
  const loadTwitterInfo = async (projectId: string) => {
    if (!user?.id) return;

    try {
      setIsTwitterLoading(true);
      const twitterData = await getTwitterByProjectId(projectId, user.id);
      setTwitterInfo(twitterData);
    } catch (error) {
      console.error('Error loading Twitter information:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Twitter information',
        variant: 'destructive',
      });
    } finally {
      setIsTwitterLoading(false);
    }
  };

  // Update Twitter information
  const handleUpdateTwitterInfo = async (data: Partial<Twitter>) => {
    if (!activeProject || !user?.id) return;

    try {
      setIsUpdating(true);
      const updatedTwitter = await updateTwitterInfo(activeProject, data, user.id);
      setTwitterInfo(updatedTwitter);
      toast({
        title: 'Success',
        description: 'Twitter information updated successfully',
      });
    } catch (error) {
      console.error('Error updating Twitter information:', error);
      toast({
        title: 'Error',
        description: 'Failed to update Twitter information',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Load user's projects and set the first project as active
  useEffect(() => {
    const loadProjects = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const project = await getProjectByPrivyId(user.id);
        if (project) {
          setActiveProject(project.id);
          loadProjectMembers(project.id);
          loadTwitterInfo(project.id);
        } else {
          setIsLoading(false);
        }

        // Set account info from user data
        if (user) {
          setAccountSettings({
            email: user.email?.address || '',
          });
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your projects',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    };

    loadProjects();

    console.log('linkedAccounts', user);
  }, [user?.id]);

  // Load project members
  const loadProjectMembers = async (projectId: string) => {
    try {
      setIsRefreshing(true);
      const membersList = await getProjectMembers(projectId);
      setMembers(membersList);
    } catch (error) {
      console.error('Error loading team members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  // Refresh members list
  const refreshMembers = () => {
    if (activeProject) {
      loadProjectMembers(activeProject);
    }
  };

  // Update member role
  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      setIsUpdating(true);
      await updateProjectMemberRole(memberId, newRole);
      toast({
        title: 'Role Updated',
        description: `Team member role has been updated to ${newRole}`,
      });
      refreshMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update team member role',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      setIsUpdating(true);
      await removeProjectMember(memberId);
      toast({
        title: 'Member Removed',
        description: 'Team member has been removed from the project',
      });
      refreshMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'founder':
        return (
          <Badge className="bg-purple-500/10 text-purple-500 flex items-center gap-1">
            Founder
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-blue-500/10 text-blue-500 flex items-center gap-1">Admin</Badge>
        );
      default:
        return (
          <Badge className="bg-green-500/10 text-green-500 flex items-center gap-1">Member</Badge>
        );
    }
  };

  // Display connected accounts status
  const renderConnectedAccounts = () => {
    return (
      <div className="space-y-8">
        {/* Project Twitter Account */}
        <div className="rounded-lg border p-4">
          <div className="mb-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <TwitterIcon className="h-4 w-4 text-[#1DA1F2]" />
              Project Twitter Account
            </h3>
            <p className="text-sm text-muted-foreground">
              Connect your project's official Twitter account for verification and community updates
            </p>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#1DA1F2]/10 p-2 rounded-full">
                <TwitterIcon className="h-5 w-5 text-[#1DA1F2]" />
              </div>
              <div>
                <p className="font-medium">Status</p>
                <p className="text-sm text-muted-foreground">
                  {user?.twitter ? (
                    <span className="text-green-500 font-medium">
                      Connected as @{user.twitter.username}
                    </span>
                  ) : (
                    'Not connected'
                  )}
                </p>
              </div>
            </div>
            {user?.twitter ? (
              <Button
                onClick={() => handleUnlinkAccount('twitter')}
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50/10"
              >
                Disconnect
              </Button>
            ) : (
              <Button onClick={linkTwitter} variant="default" size="sm">
                Connect Project Twitter
              </Button>
            )}
          </div>

          {/* Twitter Information Section */}
          {twitterInfo && (
            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Twitter Progress</h4>

              <div className="space-y-4">
                {/* Intro Tweets Count */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="introTweetsCount">Intro Tweets Count</Label>
                    <Input
                      id="introTweetsCount"
                      type="number"
                      value={twitterInfo.introTweetsCount || 0}
                      onChange={(e) =>
                        handleUpdateTwitterInfo({ introTweetsCount: parseInt(e.target.value) || 0 })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="twitterUsername">Twitter Username</Label>
                    <Input
                      id="twitterUsername"
                      value={twitterInfo.twitterUsername || ''}
                      onChange={(e) => handleUpdateTwitterInfo({ twitterUsername: e.target.value })}
                      className="mt-1"
                      placeholder="@username"
                    />
                  </div>
                </div>

                {/* Twitter Space */}
                <div>
                  <Label htmlFor="twitterSpaceUrl">Twitter Space URL</Label>
                  <Input
                    id="twitterSpaceUrl"
                    value={twitterInfo.twitterSpaceUrl || ''}
                    onChange={(e) => handleUpdateTwitterInfo({ twitterSpaceUrl: e.target.value })}
                    className="mt-1"
                    placeholder="https://twitter.com/i/spaces/..."
                  />
                  <div className="mt-2">
                    <Label htmlFor="twitterSpaceDate">Twitter Space Date</Label>
                    <Input
                      id="twitterSpaceDate"
                      type="date"
                      value={
                        twitterInfo.twitterSpaceDate
                          ? new Date(twitterInfo.twitterSpaceDate).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        handleUpdateTwitterInfo({
                          twitterSpaceDate: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Blogpost */}
                <div>
                  <Label htmlFor="blogpostUrl">Blogpost URL</Label>
                  <Input
                    id="blogpostUrl"
                    value={twitterInfo.blogpostUrl || ''}
                    onChange={(e) => handleUpdateTwitterInfo({ blogpostUrl: e.target.value })}
                    className="mt-1"
                    placeholder="https://yourblog.com/post/..."
                  />
                  <div className="mt-2">
                    <Label htmlFor="blogpostDate">Blogpost Date</Label>
                    <Input
                      id="blogpostDate"
                      type="date"
                      value={
                        twitterInfo.blogpostDate
                          ? new Date(twitterInfo.blogpostDate).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        handleUpdateTwitterInfo({
                          blogpostDate: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Twitter Thread */}
                <div>
                  <Label htmlFor="twitterThreadUrl">Twitter Thread URL</Label>
                  <Input
                    id="twitterThreadUrl"
                    value={twitterInfo.twitterThreadUrl || ''}
                    onChange={(e) => handleUpdateTwitterInfo({ twitterThreadUrl: e.target.value })}
                    className="mt-1"
                    placeholder="https://twitter.com/username/status/..."
                  />
                  <div className="mt-2">
                    <Label htmlFor="twitterThreadDate">Twitter Thread Date</Label>
                    <Input
                      id="twitterThreadDate"
                      type="date"
                      value={
                        twitterInfo.twitterThreadDate
                          ? new Date(twitterInfo.twitterThreadDate).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        handleUpdateTwitterInfo({
                          twitterThreadDate: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Personal Discord Account */}
        <div className="rounded-lg border p-4">
          <div className="mb-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#5865F2]" />
              Founder's Discord Account
            </h3>
            <p className="text-sm text-muted-foreground">
              Connect your personal Discord account to manage your project's community server
            </p>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#5865F2]/10 p-2 rounded-full">
                <MessageCircle className="h-5 w-5 text-[#5865F2]" />
              </div>
              <div>
                <p className="font-medium">Status</p>
                <p className="text-sm text-muted-foreground">
                  {user?.discord ? (
                    <span className="text-green-500 font-medium">
                      Connected as {user.discord.username}
                    </span>
                  ) : (
                    'Not connected'
                  )}
                </p>
              </div>
            </div>
            {user?.discord ? (
              <Button
                onClick={() => handleUnlinkAccount('discord')}
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50/10"
              >
                Disconnect
              </Button>
            ) : (
              <Button onClick={linkDiscord} variant="default" size="sm">
                Connect Personal Discord
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add useEffect to monitor user data changes and log them
  useEffect(() => {
    if (user) {
      console.log('Current user data:', user);
      console.log('Discord connection status:', user.discord ? 'Connected' : 'Not connected');
      console.log('Twitter connection status:', user.twitter ? 'Connected' : 'Not connected');

      // Check linked accounts
      const linkedAccounts = user.linkedAccounts || [];
      console.log('All linked accounts:', linkedAccounts);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-center py-12">
            <RefreshCw className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-7 w-7" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your team and connected accounts</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="mb-6 w-full grid grid-cols-2">
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Connections
            </TabsTrigger>
          </TabsList>

          {/* Team Settings */}
          <TabsContent value="team">
            {activeProject ? (
              <div className="space-y-6">
                {/* Team Members Section */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Team Members</CardTitle>
                        <CardDescription>People with access to this project</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshMembers}
                        disabled={isRefreshing}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {members.length === 0 ? (
                      <Alert>
                        <AlertTitle>No team members</AlertTitle>
                        <AlertDescription>
                          You are the only member of this project. Use the Invitations section below
                          to invite others.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {members.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell>{member.bioUser?.fullName || 'Unknown User'}</TableCell>
                                <TableCell>{member.bioUser?.email || 'No email'}</TableCell>
                                <TableCell>{getRoleBadge(member.role)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {/* Role change menu */}
                                    <select
                                      className="text-xs border rounded p-1"
                                      value={member.role}
                                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                                      disabled={isUpdating}
                                    >
                                      <option value="founder">Founder</option>
                                      <option value="admin">Admin</option>
                                      <option value="member">Member</option>
                                    </select>

                                    {/* Remove button */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-100/10"
                                      onClick={() => handleRemoveMember(member.id)}
                                      disabled={isUpdating}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Invitations Section */}
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Project Invitations
                  </h2>
                  {activeProject && <ProjectInvitations projectId={activeProject} />}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertTitle>No Project Found</AlertTitle>
                <AlertDescription>
                  You need to create a project before you can manage team settings.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Connections Settings */}
          <TabsContent value="connections">
            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>
                  Connect your personal and project social accounts for verification and community
                  management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderConnectedAccounts()}

                <div className="bg-muted/50 p-4 rounded-md mt-6">
                  <h3 className="font-medium text-sm mb-2">Why connect different accounts?</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>
                      • <strong>Project Twitter</strong>: Used for project verification, sharing
                      updates, and tracking growth metrics
                    </li>
                    <li>
                      • <strong>Personal Discord</strong>: Required for creating and managing your
                      project's community server
                    </li>
                    <li>
                      • These connections help verify your project's growth and progress through the
                      levels
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
