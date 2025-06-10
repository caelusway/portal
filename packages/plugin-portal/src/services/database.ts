import { PrismaClient, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { elizaLogger } from '@elizaos/core';

// Singleton Prisma client
let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  return prisma;
}

// Export types from Prisma
export type { Project, NFT, Discord, ChatSession, ChatMessage } from '@prisma/client';

// Database service interface for Eliza actions
export interface DatabaseService {
  // Project operations
  getProjectById(id: string): Promise<any>;
  getProjectByWallet(wallet: string): Promise<any>;
  getProjectByPrivyId(privyId: string): Promise<any>;
  createProject(data: any): Promise<any>;
  updateProject(id: string, data: any): Promise<any>;
  updateProjectLevel(id: string, level: number): Promise<any>;

  // Chat operations
  getOrCreateChatSession(projectId: string): Promise<string>;
  saveChatMessage(
    sessionId: string,
    content: string,
    isFromAgent: boolean,
    actionTaken?: string,
    actionSuccess?: boolean
  ): Promise<void>;
  getChatMessages(sessionId: string): Promise<any[]>;

  // Discord operations
  getDiscordByProjectId(projectId: string): Promise<any>;
  getDiscordByServerId(serverId: string): Promise<any>;
  createOrUpdateDiscord(data: any): Promise<any>;
  createOrUpdateDiscordByServerId(data: any): Promise<any>;
  updateDiscordStats(projectId: string, stats: any): Promise<any>;
  updateDiscordStatsByServerId(serverId: string, stats: any): Promise<any>;
  linkDiscordToProject(serverId: string, projectId: string): Promise<any>;

  // NFT operations
  getNFTsByProjectId(projectId: string): Promise<any[]>;
  createNFT(data: any): Promise<any>;

  // User operations
  findOrCreateUser(data: any): Promise<any>;
  getUserByPrivyId(privyId: string): Promise<any>;
  getUserByWallet(wallet: string): Promise<any>;

  // Paper and Member operations (simplified for now)
  createPaper(data: {
    url: string;
    title?: string;
    authors?: string;
    doi?: string;
    platform?: string;
    sharedBy: string;
    sharedAt: Date;
    discordId: string;
  }): Promise<any>;
  createDiscordMember(data: {
    userId: string;
    username: string;
    displayName: string;
    guildId: string;
    joinedAt: Date;
    discordId?: string;
  }): Promise<any>;
}

// Implementation of database service
export class PrismaDatabaseService implements DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  // Project operations
  async getProjectById(id: string) {
    try {
      return await this.prisma.project.findUnique({
        where: { id },
        include: {
          Discord: true,
          NFTs: true,
          ChatSessions: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        },
      });
    } catch (error) {
      elizaLogger.error('Error getting project by ID:', error);
      throw error;
    }
  }

  async getProjectByWallet(wallet: string) {
    try {
      return await this.prisma.project.findUnique({
        where: { wallet },
        include: {
          Discord: true,
          NFTs: true,
          ChatSessions: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        },
      });
    } catch (error) {
      elizaLogger.error('Error getting project by wallet:', error);
      throw error;
    }
  }

  async getProjectByPrivyId(privyId: string) {
    try {
      return await this.prisma.project.findUnique({
        where: { privyId },
        include: {
          Discord: true,
          NFTs: true,
          ChatSessions: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        },
      });
    } catch (error) {
      elizaLogger.error('Error getting project by privyId:', error);
      throw error;
    }
  }

  async createProject(data: Prisma.ProjectCreateInput) {
    try {
      return await this.prisma.project.create({
        data,
        include: {
          Discord: true,
          NFTs: true,
        },
      });
    } catch (error) {
      elizaLogger.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: string, data: Prisma.ProjectUpdateInput) {
    try {
      return await this.prisma.project.update({
        where: { id },
        data,
        include: {
          Discord: true,
          NFTs: true,
        },
      });
    } catch (error) {
      elizaLogger.error('Error updating project:', error);
      throw error;
    }
  }

  async updateProjectLevel(id: string, level: number) {
    try {
      return await this.prisma.project.update({
        where: { id },
        data: { level },
      });
    } catch (error) {
      elizaLogger.error('Error updating project level:', error);
      throw error;
    }
  }

  // Chat operations
  async getOrCreateChatSession(projectId: string): Promise<string> {
    try {
      // Check for existing session
      const existingSession = await this.prisma.chatSession.findFirst({
        where: { projectId },
        orderBy: { updatedAt: 'desc' },
      });

      if (existingSession) {
        // Update timestamp
        await this.prisma.chatSession.update({
          where: { id: existingSession.id },
          data: { updatedAt: new Date() },
        });
        elizaLogger.info(
          `Using existing chat session ${existingSession.id} for project ${projectId}`
        );
        return existingSession.id;
      }

      // Create new session
      const newSession = await this.prisma.chatSession.create({
        data: { projectId },
      });

      elizaLogger.info(`Created new chat session ${newSession.id} for project ${projectId}`);
      return newSession.id;
    } catch (error) {
      elizaLogger.error('Error managing chat session:', error);
      throw error;
    }
  }

  async saveChatMessage(
    sessionId: string,
    content: string,
    isFromAgent: boolean,
    actionTaken?: string,
    actionSuccess?: boolean
  ): Promise<void> {
    try {
      await this.prisma.chatMessage.create({
        data: {
          sessionId,
          content,
          isFromAgent,
          actionTaken,
          actionSuccess,
        },
      });
    } catch (error) {
      elizaLogger.error('Error saving chat message:', error);
      // Don't throw - we don't want to interrupt user experience
    }
  }

  async getChatMessages(sessionId: string) {
    try {
      return await this.prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
      });
    } catch (error) {
      elizaLogger.error('Error getting chat messages:', error);
      throw error;
    }
  }

  // Discord operations
  async getDiscordByProjectId(projectId: string) {
    try {
      return await this.prisma.discord.findFirst({
        where: { projectId },
      });
    } catch (error) {
      elizaLogger.error('Error getting Discord by project ID:', error);
      throw error;
    }
  }

  async getDiscordByServerId(serverId: string) {
    try {
      return await this.prisma.discord.findFirst({
        where: { serverId },
        include: {
          project: true,
        },
      });
    } catch (error) {
      elizaLogger.error('Error getting Discord by server ID:', error);
      throw error;
    }
  }

  async createOrUpdateDiscord(data: {
    projectId: string;
    serverId: string;
    inviteLink?: string;
    memberCount?: number;
    serverName?: string;
    serverIcon?: string;
    verificationToken?: string;
    botAdded?: boolean;
    verified?: boolean;
  }) {
    try {
      const { projectId, ...updateData } = data;

      const createData: Prisma.DiscordCreateInput = {
        project: { connect: { id: projectId } },
        serverId: updateData.serverId,
        inviteLink: updateData.inviteLink || '',
        ...(updateData.memberCount !== undefined && { memberCount: updateData.memberCount }),
        ...(updateData.serverName !== undefined && { serverName: updateData.serverName }),
        ...(updateData.serverIcon !== undefined && { serverIcon: updateData.serverIcon }),
        ...(updateData.verificationToken !== undefined && {
          verificationToken: updateData.verificationToken,
        }),
        ...(updateData.botAdded !== undefined && { botAdded: updateData.botAdded }),
        ...(updateData.verified !== undefined && { verified: updateData.verified }),
      };

      return await this.prisma.discord.upsert({
        where: { projectId },
        update: { ...updateData, updatedAt: new Date() },
        create: createData,
      });
    } catch (error) {
      elizaLogger.error('Error creating/updating Discord:', error);
      throw error;
    }
  }

  async createOrUpdateDiscordByServerId(data: {
    serverId: string;
    serverName?: string;
    memberCount?: number;
    botAdded?: boolean;
    verified?: boolean;
    inviteLink?: string;
    projectId?: string;
  }) {
    try {
      const { serverId, projectId, ...updateData } = data;

      // If projectId is provided, create new record
      if (projectId) {
        const createData: Prisma.DiscordCreateInput = {
          project: { connect: { id: projectId } },
          serverId,
          inviteLink: updateData.inviteLink || '',
          ...(updateData.serverName !== undefined && { serverName: updateData.serverName }),
          ...(updateData.memberCount !== undefined && { memberCount: updateData.memberCount }),
          ...(updateData.botAdded !== undefined && { botAdded: updateData.botAdded }),
          ...(updateData.verified !== undefined && { verified: updateData.verified }),
        };

        return await this.prisma.discord.create({
          data: createData,
          include: {
            project: true,
          },
        });
      }

      // Otherwise update existing record
      const result = await this.prisma.discord.updateMany({
        where: { serverId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      // Return the updated record with project included
      if (result.count > 0) {
        return await this.getDiscordByServerId(serverId);
      }

      return null;
    } catch (error) {
      elizaLogger.error('Error creating/updating Discord by server ID:', error);
      throw error;
    }
  }

  async updateDiscordStats(
    projectId: string,
    stats: {
      memberCount?: number;
      papersShared?: number;
      messagesCount?: number;
      qualityScore?: number;
    }
  ) {
    try {
      return await this.prisma.discord.update({
        where: { projectId },
        data: {
          ...stats,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      elizaLogger.error('Error updating Discord stats:', error);
      throw error;
    }
  }

  async updateDiscordStatsByServerId(
    serverId: string,
    stats: {
      memberCount?: number;
      messagesCount?: number;
      papersShared?: number;
      qualityScore?: number;
    }
  ) {
    try {
      return await this.prisma.discord.updateMany({
        where: { serverId },
        data: {
          ...stats,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      elizaLogger.error('Error updating Discord stats by server ID:', error);
      throw error;
    }
  }

  async linkDiscordToProject(serverId: string, projectId: string) {
    try {
      return await this.prisma.discord.updateMany({
        where: { serverId },
        data: {
          projectId,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      elizaLogger.error('Error linking Discord to project:', error);
      throw error;
    }
  }

  // NFT operations
  async getNFTsByProjectId(projectId: string) {
    try {
      return await this.prisma.nFT.findMany({
        where: { projectId },
        orderBy: { mintedAt: 'desc' },
      });
    } catch (error) {
      elizaLogger.error('Error getting NFTs by project ID:', error);
      throw error;
    }
  }

  async createNFT(data: {
    type: string;
    projectId: string;
    transactionHash?: string;
    imageUrl?: string;
  }) {
    try {
      return await this.prisma.nFT.create({
        data,
      });
    } catch (error) {
      elizaLogger.error('Error creating NFT:', error);
      throw error;
    }
  }

  // User operations (for future use)
  async findOrCreateUser(data: {
    privyId?: string;
    wallet?: string;
    email?: string;
    fullName?: string;
  }) {
    try {
      // For now, we'll work with the Project model directly
      // This can be extended when we add proper user management
      if (data.privyId) {
        return await this.getProjectByPrivyId(data.privyId);
      }
      if (data.wallet) {
        return await this.getProjectByWallet(data.wallet);
      }
      return null;
    } catch (error) {
      elizaLogger.error('Error finding/creating user:', error);
      throw error;
    }
  }

  async getUserByPrivyId(privyId: string) {
    try {
      return await this.getProjectByPrivyId(privyId);
    } catch (error) {
      elizaLogger.error('Error getting user by privyId:', error);
      throw error;
    }
  }

  async getUserByWallet(wallet: string) {
    try {
      return await this.getProjectByWallet(wallet);
    } catch (error) {
      elizaLogger.error('Error getting user by wallet:', error);
      throw error;
    }
  }

  // Paper and Member operations (simplified for now since models don't exist)
  async createPaper(data: {
    url: string;
    title?: string;
    authors?: string;
    doi?: string;
    platform?: string;
    sharedBy: string;
    sharedAt: Date;
    discordId: string;
  }) {
    try {
      // For now, just log the paper creation since we don't have the model
      elizaLogger.info(
        `Paper shared: ${data.url} by ${data.sharedBy} in Discord ${data.discordId}`
      );
      return { id: `paper-${Date.now()}`, ...data };
    } catch (error) {
      elizaLogger.error('Error creating paper:', error);
      throw error;
    }
  }

  async createDiscordMember(data: {
    userId: string;
    username: string;
    displayName: string;
    guildId: string;
    joinedAt: Date;
    discordId?: string;
  }) {
    try {
      // For now, just log the member creation since we don't have the model
      elizaLogger.info(
        `Discord member joined: ${data.username} (${data.displayName}) in guild ${data.guildId}`
      );
      return { id: `member-${Date.now()}`, ...data };
    } catch (error) {
      elizaLogger.error('Error creating Discord member:', error);
      throw error;
    }
  }

  // Utility methods
  async disconnect() {
    await this.prisma.$disconnect();
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      elizaLogger.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const databaseService = new PrismaDatabaseService();

// Export for use in actions
export default databaseService;
