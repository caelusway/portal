'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/use-auth';
import { getOnboardingProfile, updateOnboardingProfile } from '../lib/api/onboarding';
import { Profile } from '../types/database.types';
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
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const { level } = useUserLevel();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const profileData = await getOnboardingProfile(user.id);
        setProfile(profileData);
        // Only set form data if profile data exists
        if (profileData) {
          setFormData({
            full_name: profileData.full_name || '',
            email: profileData.email || '',
            username: profileData.username || '',
            project_name: profileData.project_name || '',
            project_description: profileData.project_description || '',
            project_vision: profileData.project_vision || '',
            scientific_references: profileData.scientific_references || '',
            credential_links: profileData.credential_links || '',
            team_members: profileData.team_members || '',
            motivation: profileData.motivation || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile information',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // Prepare the data for update
      const updateData: Partial<Profile> = {
        ...formData,
      };

      const updatedProfile = await updateOnboardingProfile(user.id, updateData);

      setProfile(updatedProfile);
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

  if (isLoading && !profile) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 w-1/3 bg-muted rounded animate-pulse mb-4"></div>
          <div className="h-6 w-1/2 bg-muted rounded animate-pulse mb-8"></div>

          <div className="space-y-8">
            <div className="h-32 bg-muted rounded animate-pulse"></div>
            <div className="h-64 bg-muted rounded animate-pulse"></div>
          </div>
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
                    <Label htmlFor="full_name">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="full_name"
                        name="full_name"
                        value={formData.full_name || ''}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1 p-2 bg-muted/50 rounded">
                        {profile?.full_name || 'Not provided'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1 p-2 bg-muted/50 rounded flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {profile?.email || 'Not provided'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="username">Username</Label>
                    {isEditing ? (
                      <Input
                        id="username"
                        name="username"
                        value={formData.username || ''}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1 p-2 bg-muted/50 rounded">
                        {profile?.username || 'Not provided'}
                      </div>
                    )}
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
                  {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
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
                  <Label htmlFor="project_name">Project Name</Label>
                  {isEditing ? (
                    <Input
                      id="project_name"
                      name="project_name"
                      value={formData.project_name || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-muted/50 rounded font-medium">
                      {profile?.project_name || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="project_description">Project Description</Label>
                  {isEditing ? (
                    <Textarea
                      id="project_description"
                      name="project_description"
                      value={formData.project_description || ''}
                      onChange={handleInputChange}
                      className="mt-1 min-h-[120px]"
                    />
                  ) : (
                    <div className="mt-1 p-3 bg-muted/50 rounded whitespace-pre-wrap">
                      {profile?.project_description || 'No description provided'}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="project_vision">Project Vision</Label>
                  {isEditing ? (
                    <Textarea
                      id="project_vision"
                      name="project_vision"
                      value={formData.project_vision || ''}
                      onChange={handleInputChange}
                      className="mt-1 min-h-[120px]"
                    />
                  ) : (
                    <div className="mt-1 p-3 bg-muted/50 rounded whitespace-pre-wrap">
                      {profile?.project_vision || 'No vision statement provided'}
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
                      id="scientific_references"
                      name="scientific_references"
                      value={formData.scientific_references || ''}
                      onChange={handleInputChange}
                      className="min-h-[150px]"
                      placeholder="Enter scientific references separated by new lines"
                    />
                  ) : (
                    <div className="p-3 bg-muted/50 rounded whitespace-pre-wrap">
                      {profile?.scientific_references || 'No scientific references provided'}
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
                      id="team_members"
                      name="team_members"
                      value={formData.team_members || ''}
                      onChange={handleInputChange}
                      className="min-h-[150px]"
                      placeholder="Enter team members separated by new lines"
                    />
                  ) : (
                    <div className="p-3 bg-muted/50 rounded whitespace-pre-wrap">
                      {profile?.team_members || 'No team members provided'}
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
