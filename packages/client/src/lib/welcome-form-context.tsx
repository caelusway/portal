import React, { createContext, useContext, useEffect, useState } from 'react';
import { z } from 'zod';
import { useAuth } from './use-auth';
import { useDatabase } from '../contexts/db-context'; // Import database context
import { Profile } from '../types/database.types';

// Form schema from onboarding-form.tsx
const formSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  referralSource: z.string().optional(),
  projectName: z.string().min(2, 'Project name must be at least 2 characters'),
  projectDescription: z.string().min(10, 'Please provide a more detailed project description'),
  projectLinks: z.string().optional(),
  projectVision: z.string().min(10, 'Please provide a more detailed project vision'),
  scientificReferences: z.string().min(5, 'Please provide at least one scientific reference'),
  credentialLinks: z.string().min(5, 'Please provide at least one credential link'),
  teamMembers: z.string().min(5, 'Please provide information about your team members'),
  motivation: z.string().min(10, 'Please provide more details about your motivation'),
  progress: z.string().min(10, 'Please provide more details about your progress'),
});

export type WelcomeFormValues = z.infer<typeof formSchema>;

// Remove localStorage keys
// const WELCOME_FORM_SUBMITTED_KEY = 'welcome-form-submitted';
// const WELCOME_FORM_DATA_KEY = 'welcome-form-data';

interface WelcomeFormContextType {
  isFormSubmitted: boolean;
  formData: WelcomeFormValues | null;
  isLoading: boolean;
  submitForm: (data: WelcomeFormValues) => Promise<void>;
  resetForm: () => void;
}

const WelcomeFormContext = createContext<WelcomeFormContextType | undefined>(undefined);

export function WelcomeFormProvider({ children }: { children: React.ReactNode }) {
  const { user: privyUser } = useAuth();
  const { getProjectByPrivyId, getUserByPrivyId, createUser, createProject, updateProject } =
    useDatabase();

  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
  const [formData, setFormData] = useState<WelcomeFormValues | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profileChecked, setProfileChecked] = useState<boolean>(false);

  // Effect to handle fetching profile
  useEffect(() => {
    // Only run this effect if we have a Privy ID and haven't checked the profile yet
    if (privyUser?.id && !profileChecked) {
      console.log('WelcomeFormProvider: Fetching profile with Privy ID:', privyUser.id);
      console.log('WelcomeFormProvider: Profile checked:', profileChecked);
      const fetchProfileWithPrivyId = async () => {
        console.log('WelcomeFormProvider: Fetching profile with Privy ID:', privyUser.id);
        setIsLoading(true);

        try {
          // Try to get user by privyId
          const bioUser = await getUserByPrivyId(privyUser.id);

          console.log('WelcomeFormProvider: Fetching profile with Privy ID:', privyUser.id);
          console.log('WelcomeFormProvider: Profile checked:', profileChecked);

          console.log('WelcomeFormProvider: Bio user:', bioUser);

          if (!bioUser) {
            console.log('WelcomeFormProvider: No existing user found.');
            setFormData(null);
            setIsFormSubmitted(false);
            setIsLoading(false);
            setProfileChecked(true);
            return;
          }

          // Get project by privyId
          const project = await getProjectByPrivyId(privyUser.id);

          if (project) {
            // Map project fields to form values
            const formValues: WelcomeFormValues = {
              fullName: bioUser.fullName || '',
              email: bioUser.email || '',
              referralSource: '',
              projectName: project.name || '',
              projectDescription: project.description || '',
              projectLinks: project.projectLinks || '',
              projectVision: project.vision || '',
              scientificReferences: project.scientificReferences || '',
              credentialLinks: project.credentialLinks || '',
              teamMembers: project.teamMembers || '',
              motivation: project.motivation || '',
              progress: project.progress || '',
            };
            setFormData(formValues);
            setIsFormSubmitted(true);
          } else {
            console.log('WelcomeFormProvider: No existing project found.');
            setFormData(null);
            setIsFormSubmitted(false);
          }
        } catch (error) {
          console.error('WelcomeFormProvider: Failed to fetch profile:', error);
          setIsFormSubmitted(false);
          setFormData(null);
        } finally {
          setIsLoading(false);
          setProfileChecked(true);
        }
      };

      fetchProfileWithPrivyId();
    } else if (!privyUser?.id) {
      // If no Privy user, mark as not loading and reset
      setIsLoading(false);
      setIsFormSubmitted(false);
      setFormData(null);
      setProfileChecked(false); // Reset so we'll check again when user logs in
    }
  }, [privyUser, profileChecked, getProjectByPrivyId, getUserByPrivyId]);

  const submitForm = async (data: WelcomeFormValues) => {
    if (!privyUser?.id) {
      console.error('Cannot submit form: No Privy ID available');
      throw new Error('User not authenticated');
    }

    // Show loading during submission
    setIsLoading(true);
    try {
      // First, ensure user exists or create them
      let bioUser = await getUserByPrivyId(privyUser.id);

      if (!bioUser) {
        // Create the user first
        const userData = {
          privyId: privyUser.id,
          wallet: privyUser.wallet?.address || null,
          email: data.email || privyUser.email?.address || null,
          fullName: data.fullName,
        };

        bioUser = await createUser(userData);
        console.log('WelcomeFormProvider: Created new user:', bioUser);
      }

      // Prepare project data
      const projectData = {
        privyId: privyUser.id,
        wallet: privyUser.wallet?.address || null,
        fullName: data.fullName,
        email: data.email || privyUser.email?.address || '',
        referralSource: data.referralSource,
        projectName: data.projectName,
        projectDescription: data.projectDescription,
        projectLinks: data.projectLinks,
        projectVision: data.projectVision,
        scientificReferences: data.scientificReferences,
        credentialLinks: data.credentialLinks,
        teamMembers: data.teamMembers,
        motivation: data.motivation,
        progress: data.progress,
      };

      // Check if project already exists
      const existingProject = await getProjectByPrivyId(privyUser.id);

      // Either create new project or update existing one
      let savedProject;
      if (existingProject) {
        savedProject = await updateProject(existingProject.id, projectData, bioUser.id);
        console.log('WelcomeFormProvider: Updated existing project:', savedProject);
      } else {
        savedProject = await createProject(projectData, bioUser.id);
        console.log('WelcomeFormProvider: Created new project:', savedProject);
      }

      setFormData(data); // Update local state with submitted data
      setIsFormSubmitted(true);
    } catch (error) {
      console.error('WelcomeFormProvider: Failed to save profile:', error);

      // Provide more detailed error message
      let errorMessage = 'Failed to save profile.';
      if (error instanceof Error) {
        errorMessage = `Failed to save profile: ${error.message}`;
      }

      // Re-throw with better error message
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset only clears local state, doesn't delete from DB
  const resetForm = () => {
    setIsFormSubmitted(false);
    setFormData(null);
    console.log('WelcomeFormProvider: Local state reset.');
  };

  return (
    <WelcomeFormContext.Provider
      value={{
        isFormSubmitted,
        formData,
        isLoading,
        submitForm,
        resetForm,
      }}
    >
      {children}
    </WelcomeFormContext.Provider>
  );
}

export function useWelcomeForm() {
  const context = useContext(WelcomeFormContext);

  if (context === undefined) {
    throw new Error('useWelcomeForm must be used within a WelcomeFormProvider');
  }

  return context;
}
