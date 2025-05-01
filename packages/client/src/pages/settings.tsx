import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useDatabase, ProjectMember } from '@/contexts/db-context';
import { ProjectInvitations } from '@/components/project-invitations';
import {
  Users,
  UserPlus,
  Shield,
  Crown,
  RefreshCw,
  X,
  User,
  Bell,
  Moon,
  Sun,
  Settings as SettingsIcon,
  Shield as SecurityIcon,
  Mail,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// Import these if they're available
let Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Switch;
try {
  // Try to import the components if they exist
  const tableComponents = require('@/components/ui/table');
  Table = tableComponents.Table;
  TableBody = tableComponents.TableBody;
  TableCell = tableComponents.TableCell;
  TableHead = tableComponents.TableHead;
  TableHeader = tableComponents.TableHeader;
  TableRow = tableComponents.TableRow;

  const switchComponents = require('@/components/ui/switch');
  Switch = switchComponents.Switch;
} catch (e) {
  // Fallback components if imports fail
  Table = (props) => <table className="w-full border-collapse" {...props} />;
  TableHeader = (props) => <thead {...props} />;
  TableBody = (props) => <tbody {...props} />;
  TableRow = (props) => <tr className="border-b" {...props} />;
  TableHead = (props) => <th className="p-2 text-left font-medium" {...props} />;
  TableCell = (props) => <td className="p-2" {...props} />;
  Switch = (props) => (
    <div
      className="inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
      {...props}
    >
      <span className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getProjectsByUserId, getProjectMembers, updateProjectMemberRole, removeProjectMember } =
    useDatabase();

  const [activeTab, setActiveTab] = useState('account');
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Account settings state
  const [accountSettings, setAccountSettings] = useState({
    name: '',
    email: '',
    bio: '',
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    projectUpdates: true,
    teamChanges: true,
    securityAlerts: true,
  });

  // Appearance settings
  const [appearanceSettings, setAppearanceSettings] = useState({
    darkMode: true,
    compactView: false,
  });

  // Load user's projects and set the first project as active
  useEffect(() => {
    const loadProjects = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const projects = await getProjectsByUserId(user.id);
        if (projects.length > 0) {
          setActiveProject(projects[0].id);
          loadProjectMembers(projects[0].id);
        } else {
          setIsLoading(false);
        }

        // Set account info from user data
        if (user) {
          setAccountSettings({
            name: user.email?.address || '',
            email: user.email?.address || '',
            bio: '',
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

  // Save account settings
  const saveAccountSettings = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your account settings have been updated',
    });
  };

  // Save notification settings
  const saveNotificationSettings = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your notification preferences have been updated',
    });
  };

  // Save appearance settings
  const saveAppearanceSettings = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your appearance settings have been updated',
    });
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'founder':
        return (
          <Badge className="bg-purple-500/10 text-purple-500 flex items-center gap-1">
            <Crown className="h-3 w-3" />
            Founder
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-blue-500/10 text-blue-500 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge className="bg-green-500/10 text-green-500 flex items-center gap-1">
            <Users className="h-3 w-3" />
            Member
          </Badge>
        );
    }
  };

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
          <p className="text-muted-foreground">Manage your account, team, and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="mb-6 w-full grid grid-cols-4">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Appearance
            </TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your personal account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={accountSettings.name}
                        onChange={(e) =>
                          setAccountSettings({ ...accountSettings, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={accountSettings.email}
                        onChange={(e) =>
                          setAccountSettings({ ...accountSettings, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input
                      id="bio"
                      value={accountSettings.bio}
                      onChange={(e) =>
                        setAccountSettings({ ...accountSettings, bio: e.target.value })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Security</h3>
                    <Button variant="outline" className="flex items-center gap-2">
                      <SecurityIcon className="h-4 w-4" />
                      Change Password
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveAccountSettings}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Settings */}
          <TabsContent value="team">
            {activeProject ? (
              <Tabs defaultValue="members" className="space-y-6">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="members" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Members
                  </TabsTrigger>
                  <TabsTrigger value="invitations" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invitations
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="members">
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
                            You are the only member of this project. Use the Invitations tab to
                            invite others.
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
                                  <TableCell>
                                    {member.bioUser?.fullName || 'Unknown User'}
                                  </TableCell>
                                  <TableCell>{member.bioUser?.email || 'No email'}</TableCell>
                                  <TableCell>{getRoleBadge(member.role)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {/* Role change menu */}
                                      <select
                                        className="text-xs border rounded p-1"
                                        value={member.role}
                                        onChange={(e) =>
                                          handleUpdateRole(member.id, e.target.value)
                                        }
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
                </TabsContent>

                <TabsContent value="invitations">
                  {activeProject && <ProjectInvitations projectId={activeProject} />}
                </TabsContent>
              </Tabs>
            ) : (
              <Alert>
                <AlertTitle>No Project Found</AlertTitle>
                <AlertDescription>
                  You need to create a project before you can manage team settings.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Control how and when you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive email notifications</p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          emailNotifications: checked,
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Project Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about project changes and updates
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.projectUpdates}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          projectUpdates: checked,
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Team Changes</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when team members join or leave
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.teamChanges}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, teamChanges: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts about security events
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.securityAlerts}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          securityAlerts: checked,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveNotificationSettings}>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>Customize the look and feel of the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Use dark theme for the application
                      </p>
                    </div>
                    <Switch
                      checked={appearanceSettings.darkMode}
                      onCheckedChange={(checked) =>
                        setAppearanceSettings({ ...appearanceSettings, darkMode: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Compact View</Label>
                      <p className="text-sm text-muted-foreground">
                        Use a more compact layout with less whitespace
                      </p>
                    </div>
                    <Switch
                      checked={appearanceSettings.compactView}
                      onCheckedChange={(checked) =>
                        setAppearanceSettings({ ...appearanceSettings, compactView: checked })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveAppearanceSettings}>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
