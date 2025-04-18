'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../lib/use-auth';
import { useUserLevelContext } from '@/lib/user-level.tsx';
import { useWelcomeForm } from '../../lib/welcome-form-context';
import { useLevelRequirements } from '../../hooks/use-level-requirements';
import { CoreAgentChat } from './core-agent-chat';
import { agentLevels } from '../../config/agent-levels';
import bioLogo from '/biolightlogo.png';
import { Badge } from '../ui/badge';
import { CheckCircle } from 'lucide-react';
import { useUserLevel } from '../../hooks/use-user-level';
export function LevelSpecificChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const { user, supabaseUserId } = useAuth();
  const { level, isLoading: levelLoading } = useUserLevel();
  const { isFormSubmitted, formData } = useWelcomeForm();
  const { requirements } = useLevelRequirements();
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState(false);

  // Attempt to get user's name from email, fallback to generic name
  const userName = user?.email?.address ? user.email.address.split('@')[0] : 'Builder';
  const projectName = formData?.projectName || 'Your Project'; // Use formData or fallback

  // Force render after timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!forceRender) {
        console.log('LevelSpecificChat: Force rendering after timeout');
        setForceRender(true);
      }
    }, 3000); // 3 seconds timeout

    return () => clearTimeout(timer);
  }, [forceRender]);

  // Get level config for current user level
  const currentLevelConfig = level ? agentLevels[level] : agentLevels[1];

  useEffect(() => {
    console.log('Current agentId from URL:', agentId);

    // Log the state values for debugging
    console.log('LevelSpecificChat Effect Check:', {
      level,
      isFormSubmitted,
      hasFormData: !!formData,
      userName,
      projectName,
      supabaseUserId,
      requirements,
    });

    // Use the entry message from the level config, or create a custom message
    let message =
      currentLevelConfig?.entryMessage ||
      `Welcome back to ${projectName}! How can I help you today?`;

    // Add requirements information to the message
    if (requirements && requirements.length > 0) {
      message += `\n\nTo advance to the next level, you'll need to complete:`;

      const incompleteRequirements = requirements.filter((req) => !req.completed);
      if (incompleteRequirements.length > 0) {
        incompleteRequirements.forEach((req) => {
          message += `\n- ${req.requirement}`;
        });
      } else {
        message += "\n✅ You've completed all requirements and can now level up!";
      }
    }

    // Set custom level-specific welcome messages
    if (level === 1 && isFormSubmitted && formData) {
      console.log('Setting Level 1 Post-Onboarding Message');
      message = `Congratulations, ${userName}! 

We've just begun the process of bringing [${projectName}] to life.
Your first task is to document your scientific ideas in the Science Bank.

I can guide you through minting your first NFTs to establish your project's scientific foundation.
Would you like me to help you get started?`;
    }

    setInitialMessage(message);
  }, [
    isFormSubmitted,
    formData,
    agentId,
    userName,
    projectName,
    level,
    supabaseUserId,
    requirements,
    currentLevelConfig,
  ]);

  // Show loading for a maximum of 3 seconds, then force render
  if (levelLoading && !forceRender && !supabaseUserId) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center">
          <img src={bioLogo} alt="BIO Logo" className="h-12 mb-4" />
          <p className="text-muted-foreground">Loading agent...</p>
        </div>
      </div>
    );
  }

  // Get level name from config
  const levelName = currentLevelConfig?.name || `Level ${level || 1}`;

  return (
    <div className="flex flex-col h-full p-1 bg-background">
      {' '}
      {/* Full page container */}
      {/* Header */}
      <header className="flex items-center justify-between p-3 mb-2 border-b border-border">
        {/* Left: Project Name */}
        <span className="font-semibold text-md text-muted-foreground">{projectName}</span>

        {/* Center: Logo */}
        <img src={bioLogo} alt="BIO Logo" className="h-6" />

        {/* Right: Level Badge with Name */}
        <Badge variant="outline" className="px-3 py-1 font-medium">
          <span className="mr-1">Level {level || 1}</span>
          <span className="text-sm font-normal">| {levelName}</span>
        </Badge>
      </header>
      {/* Chat Area - Grow to fill remaining space */}
      <div className="flex-grow overflow-hidden">
        <CoreAgentChat
          userId={supabaseUserId || 'guest'}
          userLevel={level || 1}
          initialMessage={initialMessage}
          projectName={projectName}
        />
      </div>
      {/* Requirements Indicator (compact, at bottom) */}
      {requirements && requirements.length > 0 && (
        <div className="px-4 py-2 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Requirements: {requirements.filter((r) => r.completed).length}/{requirements.length}{' '}
            completed
          </span>
          <div className="flex space-x-1">
            {requirements.map((req, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full ${req.completed ? 'bg-green-500' : 'bg-gray-300'}`}
                title={req.requirement}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
