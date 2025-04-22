import ProfileOverlay from '@/components/profile-overlay';
import { useAgents } from '@/hooks/use-query-hooks';
import type { Agent } from '@elizaos/core';
import { useEffect, useState } from 'react';
import { getOnboardingProfile } from '../lib/onboarding';

import { WelcomeForm } from '@/components/onboarding-form';
import { useWelcomeForm } from '@/lib/welcome-form-context';
import { LevelSpecificChat } from '@/components/agent/level-specific-chat';
import { Profile } from '../types/database.types';
import { useAuth } from '../lib/use-auth';
import { useNavigate } from 'react-router-dom';
export default function Home() {
  const { data: { data: agentsData } = {}, isLoading, isError, error } = useAgents();
  const { isFormSubmitted } = useWelcomeForm();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();
  // Extract agents properly from the response
  const agents = agentsData?.agents || [];

  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  //const { startAgent, isAgentStarting, isAgentStopping } = useAgentManagement();

  useEffect(() => {
    const getProfile = async () => {
      if (!user?.id) return;

      const profile = await getOnboardingProfile(user?.id);
      if (
        profile?.full_name &&
        profile?.project_name &&
        profile?.project_description &&
        profile?.project_vision &&
        profile?.scientific_references &&
        profile?.credential_links &&
        profile?.team_members &&
        profile?.motivation
      ) {
        navigate('/dashboard');
      }
      setProfile(profile);
    };
    getProfile();
  }, [user?.id]);

  const openOverlay = (agent: Agent) => {
    setSelectedAgent(agent);
    setOverlayOpen(true);
  };

  const closeOverlay = () => {
    setSelectedAgent(null);
    setOverlayOpen(false);
  };

  return (
    <>
      {!isFormSubmitted && !profile && <WelcomeForm />}

      <div className="flex-1 p-3">
        {isFormSubmitted && (
          <div className="flex flex-col gap-4 h-full">
            <LevelSpecificChat />
          </div>
        )}
      </div>

      <ProfileOverlay
        isOpen={isOverlayOpen}
        onClose={closeOverlay}
        agent={
          agents.find((a) => a.id === selectedAgent?.id) ||
          (selectedAgent as Agent) ||
          agents[0] ||
          ({} as Agent)
        }
        agents={agents}
      />
    </>
  );
}
