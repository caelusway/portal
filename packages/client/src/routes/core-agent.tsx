import { useAgent } from '@/hooks/use-query-hooks';
import { WorldManager } from '@/lib/world-manager';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';

import { AgentSidebar } from '../components/agent-sidebar';
import type { UUID, Agent } from '@elizaos/core';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../components/ui/resizable';
import { CoreAgentChat } from '../components/agent/core-agent-chat';
import { useAuth } from '../lib/use-auth';
import { useUserLevel } from '../hooks/use-user-level';
import SocketIOManager from '../lib/socketio-manager';
import { getEntityId } from '../lib/utils';
import clientLogger from '../lib/logger';
import { useToast } from '@/hooks/use-toast';
import { useWelcomeForm } from '@/lib/welcome-form-context';

// Define level requirements (could be moved to a shared constants file)
const LEVELS = {
  1: { label: 'App Started', requirements: ['Wallet connected'] },
  2: { label: 'Science NFTs Minted', requirements: ['Minted Idea NFT', 'Minted Vision NFT'] },
  3: {
    label: 'Community Initiated',
    requirements: ['Process Invite Link', 'Invite Portal Bot', '4 Discord members'],
  },
  4: {
    label: 'Community Growth + Proof',
    requirements: ['10 Discord members', '25 papers shared', '100 messages sent'],
  },
};

export default function CoreAgentRoute() {
  const [showDetails, setShowDetails] = useState(false);
  const worldId = WorldManager.getWorldId();
  const { user } = useAuth();
  const { level, isLoading: levelLoading } = useUserLevel();
  const { formData, isLoading: formLoading } = useWelcomeForm();
  const { agentId } = useParams<{ agentId: UUID }>();
  const { data: agentData } = useAgent(agentId);
  const agent = agentData?.data as Agent;
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const entityId = getEntityId();
  const socketIOManager = SocketIOManager.getInstance();
  const userId = user?.id || '';
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (agentId && entityId) {
      socketIOManager.initialize(entityId, [agentId], { userId });
      clientLogger.info(
        `[CoreAgentRoute] Initialized socket connection for agent ${agentId} with user ${userId}`
      );
    }
  }, [agentId, entityId, userId]);

  useEffect(() => {
    if (!levelLoading && !formLoading && user && agent?.name) {
      if (level === 1 && formData) {
        setInitialMessage(
          `Congratulations, ${formData.fullName}!\nWe've just begun the process of bringing ${formData.projectName} to life.\nYour journey will be guided by the Portal & your project will level up as you progress along the BioDAO building path.\n\nAs a first step, I will mint your Idea and Vision NFTs to your wallet. This is sponsored and requires your approval.`
        );
      } else if (level >= 2) {
        const nextLevel = level + 1;
        const nextLevelInfo = LEVELS[nextLevel as keyof typeof LEVELS];
        if (nextLevelInfo) {
          // TODO: Fetch current progress (e.g., member count) to show progress
          const requirementsText = nextLevelInfo.requirements.join(', ');
          setInitialMessage(
            `Welcome back! You are currently at Level ${level}: ${LEVELS[level as keyof typeof LEVELS]?.label || 'Unknown'}.\nNext step (Level ${nextLevel}): ${nextLevelInfo.label}.\nRequirements: ${requirementsText}.\n\nHow can I help you progress?`
          );
        } else {
          // Handle max level or undefined level
          setInitialMessage(
            `Welcome back! You've reached Level ${level}: ${LEVELS[level as keyof typeof LEVELS]?.label || 'Unknown'}. You're doing great!\n\nHow can I assist you today?`
          );
        }
      } else if (level < 1) {
        // Handle case where level might be 0 or invalid
        setInitialMessage(
          `Hello! It looks like there might be an issue with your progress level. Please contact support or try refreshing.`
        );
      } else {
        // Fallback if level is 1 but formData isn't ready (should be rare if formLoading is false)
        setInitialMessage(`Hello, I'm ${agent.name}. Getting your project details...`);
      }
    } else if (!agent?.name && !levelLoading) {
      setInitialMessage('Loading agent information...');
    }
  }, [agent?.name, level, levelLoading, formData, formLoading, user]);

  const toggleDetails = () => setShowDetails(!showDetails);

  if (levelLoading || formLoading) {
    return <div>Loading user progress and project data...</div>;
  }

  if (!agentId || !user || !agent) return <div>Agent data missing or user not authenticated.</div>;

  return (
    <ResizablePanelGroup direction="horizontal" className="w-full h-full">
      <ResizablePanel defaultSize={65}>
        <CoreAgentChat
          agentId={agentId}
          worldId={worldId}
          agentData={agent}
          showDetails={showDetails}
          toggleDetails={toggleDetails}
          initialMessage={initialMessage || ''}
        />
      </ResizablePanel>
      <ResizableHandle />
      {showDetails && (
        <ResizablePanel
          defaultSize={35}
          className="border rounded-lg m-4 overflow-y-scroll bg-background flex flex-col h-[96vh]"
        >
          <AgentSidebar agentId={agentId} agentName={agent.name} />
        </ResizablePanel>
      )}
    </ResizablePanelGroup>
  );
}
