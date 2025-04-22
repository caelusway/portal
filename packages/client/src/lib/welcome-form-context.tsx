import React, { createContext, useContext, useEffect, useState } from 'react';
import { z } from 'zod';
import { useAuth } from './use-auth';
import { useDatabase } from '../contexts/db-context'; // Import database context
import { Profile } from '../types/database.types';

// Form schema from onboarding-form.tsx
const formSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  projectName: z.string().min(2, 'Project name must be at least 2 characters'),
  projectDescription: z.string().min(10, 'Please provide a more detailed project description'),
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
  const { getProjectByWallet, getProjectById, upsertProject } = useDatabase(); // Get database methods
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
  const [formData, setFormData] = useState<WelcomeFormValues | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profileChecked, setProfileChecked] = useState<boolean>(false);

  // Effect to handle fetching profile
  useEffect(() => {
    // Only run this effect if we have a Privy ID and haven't checked the profile yet
    if (privyUser?.id && !profileChecked) {
      const fetchProfileWithPrivyId = async () => {
        console.log('WelcomeFormProvider: Fetching profile with Privy ID:', privyUser.id);
        setIsLoading(true);

        try {
          // Try to get project by privyId first
          let project = await getProjectById(privyUser.id);

          // If not found by privyId, try to get by wallet address
          if (!project && privyUser.wallet) {
            const walletAddress =
              typeof privyUser.wallet === 'string' ? privyUser.wallet : privyUser.wallet.toString();

            project = await getProjectByWallet(walletAddress);
          }

          if (project && project.projectName) {
            // Map project fields to form values
            const formValues: WelcomeFormValues = {
              fullName: project.fullName || '',
              email: project.email || '',
              projectName: project.projectName || '',
              projectDescription: project.projectDescription || '',
              projectVision: project.projectVision || '',
              scientificReferences: project.scientificReferences || '',
              credentialLinks: project.credentialLinks || '',
              teamMembers: project.teamMembers || '',
              motivation: project.motivation || '',
              progress: project.progress || '',
            };
            setFormData(formValues);
            setIsFormSubmitted(true);
          } else {
            console.log('WelcomeFormProvider: No existing profile found.');
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
  }, [privyUser?.id, profileChecked, getProjectById, getProjectByWallet]);

  const submitForm = async (data: WelcomeFormValues) => {
    if (!privyUser?.id) {
      console.error('Cannot submit form: No Privy ID available');
      throw new Error('User not authenticated');
    }

    // Show loading during submission
    setIsLoading(true);
    try {
      // Prepare project data with Privy ID and wallet
      const projectData = {
        privyId: privyUser.id,
        wallet: privyUser.wallet
          ? typeof privyUser.wallet === 'string'
            ? privyUser.wallet
            : privyUser.wallet.toString()
          : undefined,
        fullName: data.fullName,
        email: data.email || privyUser.email?.address || '',
        projectName: data.projectName,
        projectDescription: data.projectDescription,
        projectVision: data.projectVision,
        scientificReferences: data.scientificReferences,
        credentialLinks: data.credentialLinks,
        teamMembers: data.teamMembers,
        motivation: data.motivation,
        progress: data.progress,
      };

      console.log('WelcomeFormProvider: Submitting profile with database context');

      // Use the upsertProject function from database context
      const savedProject = await upsertProject(projectData);

      console.log('WelcomeFormProvider: Project saved:', savedProject);
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
