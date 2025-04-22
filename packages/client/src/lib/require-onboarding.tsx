import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getOnboardingProfile } from './api/onboarding';
import { useAuth } from './use-auth';
import { useToast } from '../hooks/use-toast';

// This is a Higher-Order Component that ensures authentication and onboarding are completed
// It checks if the user is authenticated and if essential profile fields are filled
export const RequireOnboarding = (Component: React.ComponentType<any>) => {
  return (props: any) => {
    const { user, isAuthenticated } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

    useEffect(() => {
      const checkOnboardingStatus = async () => {
        // If user is not authenticated, we can skip checking onboarding
        if (!isAuthenticated || !user?.id) {
          setIsLoading(false);
          return;
        }

        try {
          // Get the user's profile data
          const profile = await getOnboardingProfile(user.id);

          // Check if essential profile fields are filled
          // These are the minimum fields required to proceed past onboarding
          const hasCompleteProfile = !!(
            profile &&
            profile.project_name &&
            profile.project_description &&
            profile.project_vision
          );

          setIsOnboardingComplete(hasCompleteProfile);

          if (!hasCompleteProfile) {
            toast({
              title: 'Onboarding Incomplete',
              description: 'Please complete your onboarding process first',
              variant: 'default',
            });
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          setIsOnboardingComplete(false);
        } finally {
          setIsLoading(false);
        }
      };

      checkOnboardingStatus();
    }, [user?.id, isAuthenticated, toast]);

    // Show loading state while checking onboarding
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-center">
            <div className="h-10 w-40 mx-auto bg-primary/20 rounded-md mb-4"></div>
            <div className="h-4 w-60 mx-auto bg-muted rounded-md"></div>
          </div>
        </div>
      );
    }

    // If not authenticated, redirect to home
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please connect your wallet to access this page',
        variant: 'destructive',
      });
      return <Navigate to="/" replace />;
    }

    // If onboarding is not complete, redirect to home
    if (!isOnboardingComplete) {
      return <Navigate to="/" replace />;
    }

    // If authenticated and onboarding is complete, render the wrapped component
    return <Component {...props} />;
  };
};
