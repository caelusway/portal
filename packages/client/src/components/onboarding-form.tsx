import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAgents } from '@/hooks/use-query-hooks';
import { LogIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { createOnboardingProfile, getOnboardingProfile } from '@/lib/onboarding';
import { createOrUpdateUserLevel } from '@/lib/user-level';
import { formSchema, formPages, type WelcomeFormValues } from '@/lib/onboarding-content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import type { Profile } from '@/types/database.types';
import { useWallets, ConnectedWallet } from '@privy-io/react-auth';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useWelcomeForm } from '@/lib/welcome-form-context';
import { useToast } from '@/hooks/use-toast';
import { useDatabase } from '@/contexts/db-context';
import { usePrivy } from '@privy-io/react-auth';
import { getProjectByPrivyId } from '../lib/prisma-client';

export function WelcomeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [submittedProfile, setSubmittedProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('form'); // "form" or "nft"
  const [fieldSaving, setFieldSaving] = useState<Record<string, boolean>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const { isAuthenticated, login, user } = useAuth();
  const { submitForm } = useWelcomeForm();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { createUser, getUserByPrivyId, createProject } = useDatabase();
  const { wallets } = useWallets();
  const privy = usePrivy();

  // Define the animation keyframes
  const animationStyle = `
    @keyframes pulseOnce {
      0% { border-color: rgb(239, 68, 68); }
      50% { border-color: rgba(239, 68, 68, 0.5); }
      100% { border-color: rgb(239, 68, 68); }
    }
    .animate-pulse-once {
      animation: pulseOnce 0.6s ease-in-out;
    }
    
    @keyframes fadeInOut {
      0% { opacity: 0; }
      50% { opacity: 1; }
      100% { opacity: 0; }
    }
    .animate-fade-in-out {
      animation: fadeInOut 1.5s ease-in-out;
    }
    
    .field-focus {
      border-color: rgb(var(--bio-accent));
      box-shadow: 0 0 0 2px rgba(var(--bio-accent), 0.2);
    }
  `;

  // Get embedded wallet
  const embeddedWallet = wallets?.find(
    (wallet: ConnectedWallet) => wallet.walletClientType === 'privy'
  );

  useEffect(() => {
    const getProfile = async () => {
      if (user?.id) {
        try {
          const project = (await getProjectByPrivyId(user?.id)) as any;

          if (
            project?.projectName &&
            project?.projectDescription &&
            project?.projectVision &&
            project?.scientificReferences &&
            project?.motivation
          ) {
            navigate('/chat');
          }
        } catch (error) {
          console.log('No existing profile found or error fetching profile:', error);
          // Continue with onboarding flow if profile doesn't exist
        }
      }
    };
    getProfile();
  }, [user?.id, navigate]);

  const { data: { data: agentsData } = {} } = useAgents();

  const form = useForm<WelcomeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: Object.fromEntries(
      formPages.flatMap((page) => page.fields).map((field) => [field.id, ''])
    ) as WelcomeFormValues,
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
  });

  // Track when fields are touched
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name && (type === 'change' || type === 'blur')) {
        // Mark field as touched when user interacts with it
        setTouchedFields((prev) => ({ ...prev, [name]: true }));
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Reset touched state for fields when changing pages
  useEffect(() => {
    // Don't reset touch state on initial render
    if (currentPage === 0) return;

    // Only mark fields as untouched for the current page
    const currentPageFieldIds = formPages[currentPage].fields.map((f) => f.id);
    const updatedTouchedFields = { ...touchedFields };

    currentPageFieldIds.forEach((fieldId) => {
      // Only if this is a new page visit, don't reset if user goes back
      if (!(fieldId in updatedTouchedFields)) {
        updatedTouchedFields[fieldId] = false;
      }
    });

    setTouchedFields(updatedTouchedFields);
  }, [currentPage]);

  // Add autosave functionality when fields change
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name && type === 'change') {
        // Show saving indicator for this field
        setFieldSaving((prev) => ({ ...prev, [name]: true }));

        // Simulate saving delay and then mark as saved
        const timer = setTimeout(() => {
          setFieldSaving((prev) => ({ ...prev, [name]: false }));
        }, 1000);

        return () => clearTimeout(timer);
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const handleFormSubmit = form.handleSubmit(async (values) => {
    // Mark all fields on the current page as touched
    const allFields = formPages.flatMap((page) => page.fields);
    const updatedTouchedFields = { ...touchedFields };
    allFields.forEach((field) => {
      updatedTouchedFields[field.id] = true;
    });
    setTouchedFields(updatedTouchedFields);

    // Proceed with direct submission
    await handleSubmit(values);
  });

  const handleSubmit = async (values: WelcomeFormValues) => {
    // Check for any remaining errors before submission
    const hasErrors = Object.keys(form.formState.errors).length > 0;

    if (hasErrors) {
      // Mark all fields as touched to show all errors
      const allFields = formPages.flatMap((page) => page.fields);
      const updatedTouchedFields = { ...touchedFields };
      allFields.forEach((field) => {
        updatedTouchedFields[field.id] = true;
      });
      setTouchedFields(updatedTouchedFields);

      // Find the first field with an error to focus
      const firstErrorField = allFields.find(
        (field) => form.formState.errors[field.id as keyof WelcomeFormValues]
      );

      if (firstErrorField) {
        // Find which page this field is on
        const errorPageIndex = formPages.findIndex((page) =>
          page.fields.some((field) => field.id === firstErrorField.id)
        );

        // Set the page to the one with the error
        if (errorPageIndex !== -1 && errorPageIndex !== currentPage) {
          setCurrentPage(errorPageIndex);
          // Use setTimeout to ensure the page has changed before setting focus
          setTimeout(() => {
            form.setFocus(firstErrorField.id as keyof WelcomeFormValues);
          }, 100);
        } else {
          form.setFocus(firstErrorField.id as keyof WelcomeFormValues);
        }

        return; // Don't proceed with submission
      }
    }

    setIsSubmitting(true);
    try {
      // Save form data to the Portal API using the database context
      if (user?.id) {
        console.log('Submitting form with Privy user:', user);

        // 1. First create or get the BioUser
        let bioUser = await getUserByPrivyId(user.id);

        if (!bioUser) {
          const userData = {
            privyId: user.id,
            wallet: embeddedWallet?.address || null,
            email: values.email || user.email?.address || null,
            fullName: values.fullName || null,
          };

          bioUser = await createUser(userData);
          console.log('BioUser created:', bioUser);
        }

        // 2. Now create the project linked to this user
        const projectData = {
          privyId: user.id, // Use Privy ID
          wallet: embeddedWallet?.address,
          fullName: values.fullName,
          email: values.email || user.email?.address || '', // Prioritize form email, fallback to Privy
          referralSource: values.referralSource,
          projectName: values.projectName,
          projectDescription: values.projectDescription,
          projectLinks: values.projectLinks,
          projectVision: values.projectVision,
          scientificReferences: values.scientificReferences,
          credentialLinks: values.credentialLinks,
          teamMembers: values.teamMembers,
          motivation: values.motivation,
          progress: values.progress,
        };

        try {
          // 2. Create/Update the project using the database context
          const project = await createProject(projectData, bioUser.id);
          console.log('Project created/updated via database context:', project);

          // Convert project to profile for compatibility
          const profile = {
            id: project.id,
            privy_id: user.id,
            full_name: values.fullName,
            email: values.email || user.email?.address || '',
            project_name: values.projectName,
            project_description: values.projectDescription,
            project_vision: values.projectVision,
            scientific_references: values.scientificReferences,
            credential_links: values.credentialLinks,
            team_members: values.teamMembers,
            motivation: values.motivation,
            progress: values.progress,
            // Safely handle date conversion
            created_at:
              project.createdAt instanceof Date
                ? project.createdAt.toISOString()
                : typeof project.createdAt === 'string'
                  ? project.createdAt
                  : new Date().toISOString(),
            updated_at:
              project.updatedAt instanceof Date
                ? project.updatedAt.toISOString()
                : typeof project.updatedAt === 'string'
                  ? project.updatedAt
                  : new Date().toISOString(),
            level: project.level,
          } as Profile;

          setSubmittedProfile(profile);

          // Success toast
          toast({
            title: 'Profile created successfully',
            description: "Your profile has been saved and you're now at level 1!",
            duration: 3000,
          });

          // 4. Save to local context
          submitForm(values);

          // 6. Navigate to chat
          navigate(`/chat`);
        } catch (error: any) {
          console.error('Error submitting form:', error);
          toast({
            title: 'Error',
            description: error.message || 'An unknown error occurred',
            variant: 'destructive',
            duration: 5000,
          });
        } finally {
          setIsSubmitting(false);
        }
      } else {
        toast({
          title: 'Authentication required',
          description: 'You need to be logged in to submit the form',
          variant: 'destructive',
          duration: 3000,
        });
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error('Error processing form:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive',
        duration: 5000,
      });
      setIsSubmitting(false);
    }
  };

  const handleNFTSuccess = (nftData: any) => {
    // Find the CoreAgent to navigate to its chat view
    const agents = agentsData?.agents || [];
    const coreAgent = agents.find(
      (agent) =>
        agent.name.toLowerCase().includes('eliza') || agent.name.toLowerCase().includes('core')
    );

    if (coreAgent?.id) {
      navigate(`/chat/${coreAgent.id}`);
    } else if (agents && agents.length > 0) {
      navigate(`/chat/${agents[0].id}`);
    }
  };

  const skipNFT = () => {
    // Find the CoreAgent to navigate to its chat view
    const agents = agentsData?.agents || [];
    const coreAgent = agents.find(
      (agent) =>
        agent.name.toLowerCase().includes('eliza') || agent.name.toLowerCase().includes('core')
    );

    if (coreAgent?.id) {
      navigate(`/chat/${coreAgent.id}`);
    } else if (agents && agents.length > 0) {
      navigate(`/chat/${agents[0].id}`);
    }
  };

  const nextPage = () => {
    const currentFields = formPages[currentPage].fields;

    // Mark all fields on current page as touched before validation
    const updatedTouchedFields = { ...touchedFields };
    currentFields.forEach((field) => {
      updatedTouchedFields[field.id] = true;
    });
    setTouchedFields(updatedTouchedFields);

    let hasErrors = false;

    currentFields.forEach((field) => {
      const fieldState = form.getFieldState(field.id);
      if (fieldState.invalid) {
        hasErrors = true;
      }
    });

    if (hasErrors) {
      form.setFocus(currentFields[0].id);
      return;
    }

    const fieldsToValidate = currentFields.map((field) => field.id);

    form.trigger(fieldsToValidate).then((isValid) => {
      if (isValid && currentPage < formPages.length - 1) {
        setCurrentPage(currentPage + 1);
      } else if (!isValid) {
        const firstInvalidField = currentFields.find(
          (field) => form.getFieldState(field.id).invalid
        );

        if (firstInvalidField) {
          form.setFocus(firstInvalidField.id);
        }
      }
    });
  };

  const prevPage = () => {
    // Save the current page state
    const currentValues = form.getValues();

    // Navigate to the previous page
    if (currentPage > 0) {
      // Cache the current page values
      const updatedValues = { ...currentValues };

      // Update the page
      setCurrentPage(currentPage - 1);
    }
  };

  const renderFormFields = () => {
    const currentFields = formPages[currentPage].fields;

    return (
      <div className="space-y-6">
        {currentFields.map((field) => (
          <div key={field.id} className="space-y-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <Label htmlFor={field.id}>{field.label}</Label>
                {field.description && (
                  <p className="text-sm text-muted-foreground">{field.description}</p>
                )}
              </div>
              {fieldSaving[field.id] && (
                <span className="text-xs text-bio-accent flex items-center animate-fade-in-out ml-2">
                  <svg
                    className="w-3 h-3 mr-1 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </span>
              )}
            </div>
            {field.type === 'textarea' ? (
              <Textarea
                id={field.id}
                placeholder={field.placeholder}
                className={`min-h-24 focus-visible:ring-bio-accent/50 ${
                  touchedFields[field.id] && form.formState.errors[field.id]
                    ? 'border-red-500 animate-pulse-once'
                    : ''
                }`}
                {...form.register(field.id, {
                  onBlur: () => setTouchedFields((prev) => ({ ...prev, [field.id]: true })),
                })}
              />
            ) : (
              <Input
                id={field.id}
                type={field.type}
                placeholder={field.placeholder}
                className={`focus-visible:ring-bio-accent/50 ${
                  touchedFields[field.id] && form.formState.errors[field.id]
                    ? 'border-red-500 animate-pulse-once'
                    : ''
                }`}
                {...form.register(field.id, {
                  onBlur: () => setTouchedFields((prev) => ({ ...prev, [field.id]: true })),
                })}
              />
            )}
            {touchedFields[field.id] && form.formState.errors[field.id] && (
              <p className="text-sm text-red-500 mt-1 flex items-center">
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
                  className="mr-1"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {form.formState.errors[field.id]?.message}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Add debugging for authentication state
  useEffect(() => {
    console.log('Authentication state:', {
      isAuthenticated,
      user: user?.id ? `User ID: ${user.id}` : 'No user',
      privyAuthenticated: privy.authenticated,
    });
  }, [isAuthenticated, user, privy.authenticated]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
      <style>{animationStyle}</style>

      {!isAuthenticated || !user?.id ? (
        <Card className="w-full max-w-md border-bio-accent/20 border-t-4">
          <CardHeader className="relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-bio-accent/70 to-bio-accent/10"></div>
            <CardTitle className="text-2xl">Welcome to the BioDAO Portal</CardTitle>
            <CardDescription>Please log in to access the application</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="size-24 rounded-full bg-bio-accent/10 flex items-center justify-center mb-6">
              <LogIn className="size-12 text-bio-accent" />
            </div>
            <p className="text-center text-muted-foreground mb-6">
              Sign in with your credentials to continue to the application. You'll need to provide
              information about your project to get started.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-bio-accent hover:bg-bio-accent/90 text-bio-accent-foreground"
              onClick={() => {
                console.log('Login button clicked');
                login();
              }}
            >
              Login to Continue
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-background rounded-lg border border-border shadow-lg overflow-hidden">
          {/* Fixed Header */}
          <div className="relative border-b px-6 py-4">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-bio-accent/70 to-bio-accent/10"></div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Welcome to the BioDAO Portal</h2>
                {activeTab === 'form' ? (
                  <>
                    <p className="text-muted-foreground">{formPages[currentPage].description}</p>
                    {/* Progress indicator */}
                    <div className="flex items-center mt-2 gap-1">
                      {formPages.map((_, index) => (
                        <div
                          key={index}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            index === currentPage
                              ? 'w-8 bg-bio-accent'
                              : index < currentPage
                                ? 'w-4 bg-bio-accent/70'
                                : 'w-4 bg-gray-200'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-xs text-muted-foreground">
                        Step {currentPage + 1} of {formPages.length}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Create an NFT for your project</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span>Authenticated</span>
                </div>
                {user?.email && (
                  <div className="text-sm text-muted-foreground">{user.email.address}</div>
                )}
              </div>
            </div>
          </div>

          {/* Content Area with Scrolling */}
          <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
              <TabsContent value="form" className="h-full">
                <form onSubmit={handleFormSubmit} className="h-full flex flex-col">
                  <div className="flex-1 overflow-auto p-6">
                    {/* Error summary message - only show for touched fields */}
                    {Object.keys(form.formState.errors).length > 0 &&
                      formPages[currentPage].fields.some(
                        (field) =>
                          touchedFields[field.id] &&
                          form.formState.errors[field.id as keyof WelcomeFormValues]
                      ) && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-700 flex items-center">
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
                              className="mr-2"
                            >
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="12"></line>
                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            Please correct the highlighted fields before proceeding
                          </p>
                        </div>
                      )}

                    {renderFormFields()}
                  </div>

                  {/* Fixed Footer */}
                  <div className="border-t p-4 bg-background">
                    <div className="flex justify-between w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevPage}
                        disabled={currentPage === 0}
                        className="flex items-center gap-2"
                      >
                        <ChevronLeft className="size-4" />
                        Previous
                      </Button>
                      {currentPage === formPages.length - 1 ? (
                        <Button
                          type="submit"
                          className="bg-bio-accent hover:bg-bio-accent/90 text-bio-accent-foreground"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit and Continue'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={nextPage}
                          className="bg-bio-accent hover:bg-bio-accent/90 text-bio-accent-foreground flex items-center gap-2"
                        >
                          Next
                          <ChevronRight className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
