import { elizaLogger } from '@elizaos/core';
import { databaseService } from './database.js';
import { emailService } from './email-service.js';

export interface LevelRequirements {
  label: string;
  requirements: string[];
  description: string;
}

export const LEVEL_DEFINITIONS: Record<number, LevelRequirements> = {
  1: {
    label: 'App Started',
    requirements: ['Wallet connected'],
    description: 'Welcome to BioDAO! Connect your wallet to begin your journey.',
  },
  2: {
    label: 'Science NFTs Minted',
    requirements: ['Minted Idea NFT', 'Minted Hypothesis NFT'],
    description: 'Mint your scientific ideas as NFTs to establish your research foundation.',
  },
  3: {
    label: 'Community Initiated',
    requirements: ['Discord created', '4 Discord members'],
    description:
      'Build your research community by creating a Discord server and inviting collaborators.',
  },
  4: {
    label: 'Community Growth + Proof',
    requirements: ['10 Discord members', '25 papers shared', '100 messages sent'],
    description: 'Grow your community and demonstrate active scientific collaboration.',
  },
};

export class LevelManager {
  async checkLevelProgress(projectId: string): Promise<{
    currentLevel: number;
    nextLevel?: number;
    canAdvance: boolean;
    missingRequirements: string[];
    completedRequirements: string[];
  }> {
    try {
      const project = await databaseService.getProjectById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const currentLevel = project.level;
      const nextLevel = currentLevel + 1;

      if (nextLevel > 4) {
        return {
          currentLevel,
          canAdvance: false,
          missingRequirements: [],
          completedRequirements: LEVEL_DEFINITIONS[currentLevel]?.requirements || [],
        };
      }

      const requirements = LEVEL_DEFINITIONS[nextLevel]?.requirements || [];
      const { completed, missing } = await this.evaluateRequirements(project, requirements);

      return {
        currentLevel,
        nextLevel,
        canAdvance: missing.length === 0,
        missingRequirements: missing,
        completedRequirements: completed,
      };
    } catch (error) {
      elizaLogger.error('Error checking level progress:', error);
      throw error;
    }
  }

  async advanceLevel(projectId: string): Promise<{
    success: boolean;
    newLevel: number;
    message: string;
  }> {
    try {
      const progress = await this.checkLevelProgress(projectId);

      if (!progress.canAdvance) {
        return {
          success: false,
          newLevel: progress.currentLevel,
          message: `Cannot advance to level ${progress.nextLevel}. Missing: ${progress.missingRequirements.join(', ')}`,
        };
      }

      const newLevel = progress.nextLevel!;
      await databaseService.updateProjectLevel(projectId, newLevel);

      elizaLogger.info(`Project ${projectId} advanced to level ${newLevel}`);

      // Get updated project data for email notifications
      const project = await databaseService.getProjectById(projectId);

      // Send level up email if user has email
      if (project?.email && emailService) {
        try {
          await emailService.sendLevelUpEmail(project.email, newLevel);
          elizaLogger.info(`📧 Level up email sent to ${project.email} for level ${newLevel}`);
        } catch (error) {
          elizaLogger.error('Failed to send level up email:', error);
        }
      }

      // Send sandbox notification email if reached level 4
      if (newLevel === 4 && project && emailService) {
        try {
          await emailService.sendSandboxEmail(project);
          elizaLogger.info(`📧 Sandbox notification email sent for project ${projectId}`);
        } catch (error) {
          elizaLogger.error('Failed to send sandbox notification email:', error);
        }
      }

      return {
        success: true,
        newLevel,
        message: `🎉 Congratulations! You've advanced to Level ${newLevel}: ${LEVEL_DEFINITIONS[newLevel]?.label}`,
      };
    } catch (error) {
      elizaLogger.error('Error advancing level:', error);
      throw error;
    }
  }

  /**
   * Resend level up email for a specific project and level
   */
  async resendLevelUpEmail(projectId: string, level?: number): Promise<boolean> {
    try {
      const project = await databaseService.getProjectById(projectId);
      if (!project?.email) {
        elizaLogger.warn(`No email found for project ${projectId}`);
        return false;
      }

      const targetLevel = level || project.level;
      if (emailService) {
        return await emailService.resendLevelUpEmail(project.email, targetLevel);
      }

      elizaLogger.warn('Email service not available');
      return false;
    } catch (error) {
      elizaLogger.error('Error resending level up email:', error);
      return false;
    }
  }

  /**
   * Resend sandbox notification email for a project
   */
  async resendSandboxEmail(projectId: string): Promise<boolean> {
    try {
      const project = await databaseService.getProjectById(projectId);
      if (!project) {
        elizaLogger.warn(`Project ${projectId} not found`);
        return false;
      }

      if (emailService) {
        return await emailService.resendSandboxEmail(project);
      }

      elizaLogger.warn('Email service not available');
      return false;
    } catch (error) {
      elizaLogger.error('Error resending sandbox email:', error);
      return false;
    }
  }

  private async evaluateRequirements(
    project: any,
    requirements: string[]
  ): Promise<{
    completed: string[];
    missing: string[];
  }> {
    const completed: string[] = [];
    const missing: string[] = [];

    for (const requirement of requirements) {
      const isCompleted = await this.checkRequirement(project, requirement);
      if (isCompleted) {
        completed.push(requirement);
      } else {
        missing.push(requirement);
      }
    }

    return { completed, missing };
  }

  private async checkRequirement(project: any, requirement: string): Promise<boolean> {
    switch (requirement) {
      case 'Wallet connected':
        return !!project.wallet;

      case 'Minted Idea NFT':
        return project.NFTs?.some((nft: any) => nft.type === 'idea') || false;

      case 'Minted Hypothesis NFT':
        return project.NFTs?.some((nft: any) => nft.type === 'hypothesis') || false;

      case 'Discord created':
        return !!project.Discord;

      case '4 Discord members':
        return project.Discord?.memberCount >= 4 || false;

      case '10 Discord members':
        return project.Discord?.memberCount >= 10 || false;

      case '25 papers shared':
        return project.Discord?.papersShared >= 25 || false;

      case '100 messages sent':
        return project.Discord?.messagesCount >= 100 || false;

      default:
        elizaLogger.warn(`Unknown requirement: ${requirement}`);
        return false;
    }
  }

  getLevelInfo(level: number): LevelRequirements | null {
    return LEVEL_DEFINITIONS[level] || null;
  }

  getAllLevels(): Record<number, LevelRequirements> {
    return LEVEL_DEFINITIONS;
  }
}

export const levelManager = new LevelManager();
export default levelManager;
