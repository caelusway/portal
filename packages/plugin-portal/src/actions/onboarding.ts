import { Action, IAgentRuntime, Memory, State, HandlerCallback, elizaLogger } from '@elizaos/core';
import { databaseService } from '../services/database.js';
import { validatePortalConfig } from '../environment.js';
import { getUserId } from '../utils/getProjectId.js';

export const onboardingAction: Action = {
  name: 'ONBOARDING',
  similes: [
    'CREATE_PROJECT',
    'START_ONBOARDING',
    'SETUP_PROJECT',
    'NEW_PROJECT',
    'BEGIN_JOURNEY',
    'INITIALIZE_PROJECT',
  ],
  description: 'Create or update a project during onboarding process',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const config = await validatePortalConfig(runtime);
    return !!config.DATABASE_URL;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      elizaLogger.info('Processing onboarding for user:', getUserId(message, state));

      const {
        privyId,
        wallet,
        projectName,
        projectDescription,
        projectVision,
        scientificReferences,
        credentialLinks,
        teamDescription,
        motivation,
        fullName,
        email,
        referralSource,
      } = options;

      if (!privyId && !wallet) {
        if (callback) {
          callback({
            text: 'I need either your Privy ID or wallet address to create your project. Please provide one of these identifiers.',
            action: 'ONBOARDING',
            source: getUserId(message, state),
          });
        }
        return false;
      }

      // Check if project already exists
      let project = null;
      if (privyId) {
        project = await databaseService.getProjectByPrivyId(privyId);
      }
      if (!project && wallet) {
        project = await databaseService.getProjectByWallet(wallet);
      }

      if (project) {
        // Update existing project
        const updateData: any = {};
        if (projectName) updateData.projectName = projectName;
        if (projectDescription) updateData.projectDescription = projectDescription;
        if (projectVision) updateData.projectVision = projectVision;
        if (scientificReferences) updateData.scientificReferences = scientificReferences;
        if (credentialLinks) updateData.credentialLinks = credentialLinks;
        if (teamDescription) updateData.teamMembers = teamDescription;
        if (motivation) updateData.motivation = motivation;
        if (fullName) updateData.fullName = fullName;
        if (email) updateData.email = email;
        if (referralSource) updateData.referralSource = referralSource;

        project = await databaseService.updateProject(project.id, updateData);

        if (callback) {
          callback({
            text: `✅ Your project "${project.projectName || 'Unnamed Project'}" has been updated successfully! You're currently at Level ${project.level}. Ready to continue your BioDAO journey?`,
            action: 'ONBOARDING',
            source: getUserId(message, state),
          });
        }
      } else {
        // Create new project
        const projectData: any = {
          wallet: wallet || '',
          privyId: privyId || null,
          level: 1,
          projectName: projectName || null,
          projectDescription: projectDescription || null,
          projectVision: projectVision || null,
          scientificReferences: scientificReferences || null,
          credentialLinks: credentialLinks || null,
          teamMembers: teamDescription || null,
          motivation: motivation || null,
          fullName: fullName || null,
          email: email || null,
          referralSource: referralSource || null,
        };

        project = await databaseService.createProject(projectData);

        if (callback) {
          callback({
            text: `🎉 Welcome to BioDAO! Your project "${project.projectName || 'Your Project'}" has been created successfully. You're starting at Level 1. Let's begin by minting your Science NFTs!`,
            action: 'ONBOARDING',
            source: getUserId(message, state),
          });
        }
      }

      return true;
    } catch (error) {
      elizaLogger.error('Error in onboarding action:', error);
      if (callback) {
        callback({
          text: 'Sorry, I encountered an error during onboarding. Please try again or contact support.',
          action: 'ONBOARDING',
          source: getUserId(message, state),
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'I want to create a new project' },
      },
      {
        name: '{{user2}}',
        content: { text: 'Start my onboarding process' },
      },
    ],
  ],
};

export default onboardingAction;
