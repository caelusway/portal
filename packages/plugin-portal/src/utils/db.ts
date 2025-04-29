import { PrismaClient } from '@prisma/client';
import { logger } from '@elizaos/core';

// Check for DATABASE_URL environment variable
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  logger.warn(
    '[Prisma] DATABASE_URL environment variable is not set. Prisma functionality will not work.'
  );
} else {
  logger.info('[Prisma] DATABASE_URL environment variable is set.');
}

// Instantiate and export Prisma client only if DATABASE_URL is set
export const prisma = DATABASE_URL ? new PrismaClient() : null;

// Project operations
export const ProjectService = {
  getById: async (id: string) => {
    return prisma.project.findUnique({
      where: { id },
      include: {
        Discord: true,
        NFTs: true,
      },
    });
  },

  getByWallet: async (wallet: string) => {
    return prisma.project.findUnique({
      where: { wallet },
      include: {
        Discord: true,
        NFTs: true,
      },
    });
  },

  getByPrivyId: async (privyId: string) => {
    return prisma.project.findUnique({
      where: { privyId },
      include: {
        Discord: true,
        NFTs: true,
      },
    });
  },

  updateLevel: async (id: string, level: number) => {
    return prisma.project.update({
      where: { id },
      data: { level },
    });
  },

  create: async (data: any) => {
    return prisma.project.create({
      data,
    });
  },

  update: async (id: string, data: any) => {
    return prisma.project.update({
      where: { id },
      data,
    });
  },
};

// Discord operations
export const DiscordService = {
  getByProjectId: async (projectId: string) => {
    return prisma.discord.findUnique({
      where: { projectId },
    });
  },

  getByServerId: async (serverId: string) => {
    return prisma.discord.findFirst({
      where: { serverId },
    });
  },

  updateStats: async (id: string, data: any) => {
    return prisma.discord.update({
      where: { id },
      data,
    });
  },

  markBotAsInstalled: async (projectId: string) => {
    try {
      const result = await prisma.discord.updateMany({
        where: { projectId },
        data: {
          botAdded: true,
          botAddedAt: new Date(),
        },
      });
      return result.count > 0;
    } catch (error) {
      console.error('Error marking bot as installed:', error);
      return false;
    }
  },

  create: async (data: any) => {
    return prisma.discord.create({
      data,
    });
  },
};

// NFT operations
export const NFTService = {
  getByProjectId: async (projectId: string) => {
    return prisma.nFT.findMany({
      where: { projectId },
    });
  },

  create: async (data: any) => {
    return prisma.nFT.create({
      data,
    });
  },

  update: async (id: string, data: any) => {
    return prisma.nFT.update({
      where: { id },
      data,
    });
  },
};
