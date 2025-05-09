'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/use-auth';
import { useDatabase, BioUser, Project } from '../contexts/db-context';
import { useUserLevel } from '../hooks/use-user-level';
import { agentLevels } from '../config/agent-levels';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  CheckCircle,
  Edit,
  Save,
  Star,
  Crown,
  User,
  Rocket,
  Book,
  Users,
  Mail,
  Loader2,
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const { level } = useUserLevel();
  const { toast } = useToast();
  const { getUserByPrivyId, getProjectByPrivyId, updateUser, updateProject } = useDatabase();

  const [bioUser, setBioUser] = useState<BioUser | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [userFormData, setUserFormData] = useState<Partial<BioUser>>({});
  const [projectFormData, setProjectFormData] = useState<Partial<Project>>({});
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch user and project data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        // Fetch user and project data in parallel
        const [userData, projectData] = await Promise.all([
          getUserByPrivyId(user.id),
          getProjectByPrivyId(user.id),
        ]);

        setBioUser(userData);
        setProject(projectData);

        // Initialize form data
        if (userData) {
          setUserFormData({
            fullName: userData.fullName || '',
            email: userData.email || '',
          });
        }

        if (projectData) {
          setProjectFormData({
            name: projectData.projectName || '',
            description: projectData.projectDescription || '',
            vision: projectData.projectVision || '',
            scientificReferences: projectData.scientificReferences || '',
            teamMembers: projectData.teamMembers || '',
            credentialLinks: projectData.credentialLinks || '',
            motivation: projectData.motivation || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile information',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, getUserByPrivyId, getProjectByPrivyId, toast]);

  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProjectInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProjectFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user?.id || !bioUser?.id || !project?.id) return;

    try {
      setIsLoading(true);

      // Update user data
      const updatedUser = await updateUser(bioUser.id, userFormData);
      setBioUser(updatedUser);

      // Update project data
      const updatedProject = await updateProject(project.id, projectFormData, bioUser.id);
      setProject(updatedProject);

      setIsEditing(false);

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelIcon = (userLevel: number) => {
    if (userLevel >= 4) return <Crown className="h-6 w-6 text-amber-500" />;
    return <Star className="h-6 w-6 text-primary" />;
  };

  if (isLoading && (!bioUser || !project)) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile data...</p>
        </div>
      </div>
    );
  }

  // Get current level data
  const currentLevelData = level ? agentLevels[level] : null;

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">View and manage your profile information</p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" /> Edit Profile
            </Button>
          ) : (
            <Button onClick={handleSaveProfile} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" /> Save Changes
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full grid grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="project">Project Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="fullName"
                        name="fullName"
                        value={userFormData.fullName || ''}
                        onChange={handleUserInputChange}
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1 p-2 bg-muted/50 rounded">
                        {bioUser?.fullName || 'Not provided'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        name="email"
                        value={userFormData.email || ''}
                        onChange={handleUserInputChange}
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1 p-2 bg-muted/50 rounded flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {bioUser?.email || user?.email?.address || 'Not provided'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Wallet Address</Label>
                    <div className="mt-1 p-2 bg-muted/50 rounded font-mono text-xs">
                      {bioUser?.wallet || 'Not connected'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Level Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getLevelIcon(level || 1)}
                    Current Level
                  </CardTitle>
                  <CardDescription>Your progress in the BioDAO</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex justify-between items-center">
                    <span className="text-lg font-bold">Level {level}</span>
                    <Badge className="text-sm" variant="outline">
                      {currentLevelData?.name || 'Loading...'}
                    </Badge>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h4 className="font-medium text-sm">Level Capabilities:</h4>
                    <ul className="space-y-2">
                      {currentLevelData?.capabilities.map((capability, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{capability}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {level && level < 4 && currentLevelData && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium text-sm mb-2">Next level requirements:</h4>
                      <ul className="space-y-2">
                        {currentLevelData.levelupRequirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs">{index + 1}</span>
                            </div>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-muted/20 text-xs text-muted-foreground">
                  Last updated:{' '}
                  {project?.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'N/A'}
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="project">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  Project Information
                </CardTitle>
                <CardDescription>Details about your BioDAO project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      name="name"
                      value={projectFormData.name || ''}
                      onChange={handleProjectInputChange}
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-muted/50 rounded font-medium">
                      {project?.projectName || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Project Description</Label>
                  {isEditing ? (
                    <Textarea
                      id="description"
                      name="description"
                      value={projectFormData.description || ''}
                      onChange={handleProjectInputChange}
                      className="mt-1 min-h-[120px]"
                    />
                  ) : (
                    <div className="mt-1 p-3 bg-muted/50 rounded whitespace-pre-wrap">
                      {project?.projectDescription || 'No description provided'}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="vision">Project Vision</Label>
                  {isEditing ? (
                    <Textarea
                      id="vision"
                      name="vision"
                      value={projectFormData.vision || ''}
                      onChange={handleProjectInputChange}
                      className="mt-1 min-h-[120px]"
                    />
                  ) : (
                    <div className="mt-1 p-3 bg-muted/50 rounded whitespace-pre-wrap">
                      {project?.projectVision || 'No vision statement provided'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Book className="h-5 w-5 text-primary" />
                    Scientific References
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      id="scientificReferences"
                      name="scientificReferences"
                      value={projectFormData.scientificReferences || ''}
                      onChange={handleProjectInputChange}
                      className="min-h-[150px]"
                      placeholder="Enter scientific references separated by new lines"
                    />
                  ) : (
                    <div className="p-3 bg-muted/50 rounded whitespace-pre-wrap">
                      {project?.scientificReferences || 'No scientific references provided'}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      id="teamMembers"
                      name="teamMembers"
                      value={projectFormData.teamMembers || ''}
                      onChange={handleProjectInputChange}
                      className="min-h-[150px]"
                      placeholder="Enter team members separated by new lines"
                    />
                  ) : (
                    <div className="p-3 bg-muted/50 rounded whitespace-pre-wrap">
                      {project?.teamMembers || 'No team members provided'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
