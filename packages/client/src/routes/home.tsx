import ProfileOverlay from '@/components/profile-overlay';
import { useAgents } from '@/hooks/use-query-hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { WelcomeForm } from '@/components/onboarding-form';
import { useWelcomeForm } from '@/lib/welcome-form-context';
import { LevelSpecificChat } from '@/components/agent/level-specific-chat';
import { useAuth } from '@/lib/use-auth';
import { useDatabase } from '@/contexts/db-context';
import type { Agent } from '@elizaos/core';
import Chat from './chat';
import { CoreAgent } from '../components/agent/core-agent';

export default function Home() {
  const { data: { data: agentsData } = {}, isLoading } = useAgents();
  const { isFormSubmitted, isLoading: isFormLoading } = useWelcomeForm();
  const { user, isAuthenticated } = useAuth();
  const { getProjectByPrivyId } = useDatabase();

  const navigate = useNavigate();
  const location = useLocation();

  // Extract agents properly from the response
  const agents = (agentsData?.agents || []) as Agent[];

  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);

  // Redirect to previous page after login
  useEffect(() => {
    if (isAuthenticated) {
      // Check if we have a saved path to return to
      const returnPath = localStorage.getItem('returnTo');
      if (returnPath) {
        localStorage.removeItem('returnTo'); // Clean up
        navigate(returnPath);
        return; // Important: exit early to prevent profile check redirect
      }

      // Also check for state passed from the Navigate component
      const from = location.state?.from?.pathname;
      if (from && from !== '/') {
        navigate(from, { replace: true });
        return; // Exit early
      }
    }
  }, [isAuthenticated, navigate, location]);

  // Check if user has a completed profile and redirect appropriately
  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user?.id || !isAuthenticated) return;

      setIsCheckingProfile(true);
      try {
        // Use the database context to check if the user has a project
        const project = await getProjectByPrivyId(user.id);

        console.log('Home: Project:', project);

        // If project exists with required fields, consider profile complete
        const profileComplete = !!(
          project?.projectDescription &&
          project?.projectName &&
          project?.projectVision &&
          project?.projectLinks
        );

        console.log('Home: Profile complete:', profileComplete);

        setHasCompletedProfile(profileComplete);

        // If profile is complete, redirect to dashboard
        if (profileComplete) {
          navigate('/chat');
        }
      } catch (error) {
        console.error('Error checking user profile:', error);
      } finally {
        setIsCheckingProfile(false);
      }
    };

    // Only run profile check if we're not redirecting to another page
    const returnPath = localStorage.getItem('returnTo');
    const fromState = location.state?.from?.pathname;
    if (!returnPath && !fromState) {
      checkUserProfile();
    }
  }, [user?.id, isAuthenticated, navigate, getProjectByPrivyId, location]);

  const openOverlay = (agent: Agent) => {
    setSelectedAgent(agent);
    setOverlayOpen(true);
  };

  const closeOverlay = () => {
    setSelectedAgent(null);
    setOverlayOpen(false);
  };

  // Show loading state while checking profile or form is loading
  if ((isCheckingProfile || isFormLoading) && isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      {/* Show welcome form if user is authenticated but doesn't have a completed profile */}
      {!hasCompletedProfile && !isFormSubmitted && <WelcomeForm />}

      <div className="flex-1 p-3">
        {/* Show the level-specific chat after form submission */}
        {(isFormSubmitted || hasCompletedProfile) && (
          <div className="flex flex-col gap-4 h-full">
            <CoreAgent />
          </div>
        )}
      </div>

      <ProfileOverlay
        isOpen={isOverlayOpen}
        onClose={closeOverlay}
        agent={
          agents.find((a) => a.id === selectedAgent?.id) ||
          selectedAgent ||
          agents[0] ||
          ({} as Agent)
        }
        agents={agents}
      />
    </>
  );
}
