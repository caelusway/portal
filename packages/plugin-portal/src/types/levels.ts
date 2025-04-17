import { IAgentRuntime } from '@elizaos/core';
import { supabase } from '../lib/supabase';
import { DiscordService } from '../services/discordService';

export type LevelRequirement = {
  id: string;
  type: 'wallet' | 'nft' | 'discord' | 'community' | 'custom';
  description: string;
  validator: (privyId: string, runtime: IAgentRuntime) => Promise<boolean>;
  progress?: (privyId: string, runtime: IAgentRuntime) => Promise<number>;
};

export type Level = {
  id: number;
  label: string;
  description: string;
  requirements: LevelRequirement[];
  rewards?: {
    type: string;
    amount: number;
    description: string;
  }[];
  nextLevelId?: number;
};

export type UserProgress = {
  userId: string; // Note: This should likely be privyId based on other context
  currentLevel: number;
  completedRequirements: string[];
  progress: Record<string, number>; // Progress percentage for each requirement ID
  lastUpdated: Date;
};

export const LEVELS: Record<number, Level> = {
  1: {
    id: 1,
    label: 'App Started',
    description: 'Begin your BioDAO journey by connecting your wallet',
    requirements: [
      {
        id: 'wallet_connected',
        type: 'wallet',
        description: 'Connect your wallet',
        validator: async (privyId, runtime) => {
          console.log(`Checking wallet for ${privyId} via runtime...`);
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('privy_id', privyId)
            .maybeSingle();
          return !!data;
        },
        progress: async (privyId, runtime) => {
          const isValid = await LEVELS[1].requirements[0].validator(privyId, runtime);
          return isValid ? 100 : 0;
        },
      },
    ],
  },
  2: {
    id: 2,
    label: 'Science NFTs Minted',
    description: 'Mint your first scientific NFTs',
    requirements: [
      {
        id: 'idea_nft',
        type: 'nft',
        description: 'Mint Idea NFT',
        validator: async (privyId, runtime) => {
          console.log(`Checking idea NFT for ${privyId} via runtime...`);
          const { data } = await supabase
            .from('nft_metadata')
            .select('id')
            .eq('privy_id', privyId)
            .eq('type', 'idea')
            .eq('status', 'minted')
            .limit(1);
          return !!data && data.length > 0;
        },
        progress: async (privyId, runtime) => {
          const isValid = await LEVELS[2].requirements[0].validator(privyId, runtime);
          return isValid ? 100 : 0;
        },
      },
      {
        id: 'vision_nft',
        type: 'nft',
        description: 'Mint Vision NFT',
        validator: async (privyId, runtime) => {
          console.log(`Checking vision NFT for ${privyId} via runtime...`);
          const { data } = await supabase
            .from('nft_metadata')
            .select('id')
            .eq('privy_id', privyId)
            .eq('type', 'vision')
            .eq('status', 'minted')
            .limit(1);
          return !!data && data.length > 0;
        },
        progress: async (privyId, runtime) => {
          const isValid = await LEVELS[2].requirements[1].validator(privyId, runtime);
          return isValid ? 100 : 0;
        },
      },
    ],
  },
  3: {
    id: 3,
    label: 'Community Initiated',
    description: 'Start building your scientific community',
    requirements: [
      {
        id: 'discord_created',
        type: 'discord',
        description: 'Provide Discord Server Invite Link',
        validator: async (privyId, runtime) => {
          const discordService = runtime.getService<DiscordService>('DiscordService');
          if (!discordService) return false;
          const serverId = await discordService.getUserServerId(privyId);
          console.log(`[Validator:discord_created] Found serverId: ${serverId} for ${privyId}`);
          return !!serverId;
        },
        progress: async (privyId, runtime) => {
          const isValid = await LEVELS[3].requirements[0].validator(privyId, runtime);
          return isValid ? 100 : 0;
        },
      },
      {
        id: 'discord_members_4',
        type: 'community',
        description: 'Reach 4 Discord members',
        validator: async (privyId, runtime) => {
          const discordService = runtime.getService<DiscordService>('DiscordService');
          if (!discordService) return false;
          const serverId = await discordService.getUserServerId(privyId);
          if (!serverId) return false;
          const metrics = await discordService.getDiscordMetrics(serverId);
          console.log(`[Validator:discord_members_4] Metrics for ${serverId}:`, metrics);
          return (metrics?.memberCount || 0) >= 4;
        },
        progress: async (privyId, runtime) => {
          const discordService = runtime.getService<DiscordService>('DiscordService');
          if (!discordService) return 0;
          const serverId = await discordService.getUserServerId(privyId);
          if (!serverId) return 0;
          const metrics = await discordService.getDiscordMetrics(serverId);
          const memberCount = metrics?.memberCount || 0;
          return Math.min(Math.floor((memberCount / 4) * 100), 100);
        },
      },
    ],
  },
  4: {
    id: 4,
    label: 'Community Growth + Proof',
    description: 'Grow your community and share scientific knowledge',
    requirements: [
      {
        id: 'discord_members_10',
        type: 'community',
        description: 'Reach 10 Discord members',
        validator: async (privyId, runtime) => {
          const discordService = runtime.getService<DiscordService>('DiscordService');
          if (!discordService) return false;
          const serverId = await discordService.getUserServerId(privyId);
          if (!serverId) return false;
          const metrics = await discordService.getDiscordMetrics(serverId);
          console.log(`[Validator:discord_members_10] Metrics for ${serverId}:`, metrics);
          return (metrics?.memberCount || 0) >= 10;
        },
        progress: async (privyId, runtime) => {
          const discordService = runtime.getService<DiscordService>('DiscordService');
          if (!discordService) return 0;
          const serverId = await discordService.getUserServerId(privyId);
          if (!serverId) return 0;
          const metrics = await discordService.getDiscordMetrics(serverId);
          const memberCount = metrics?.memberCount || 0;
          return Math.min(Math.floor((memberCount / 10) * 100), 100);
        },
      },
      {
        id: 'papers_shared_25',
        type: 'community',
        description: 'Share 25 scientific papers',
        validator: async (privyId, runtime) => {
          const discordService = runtime.getService<DiscordService>('DiscordService');
          if (!discordService) return false;
          const serverId = await discordService.getUserServerId(privyId);
          if (!serverId) return false;
          const metrics = await discordService.getDiscordMetrics(serverId);
          console.log(`[Validator:papers_shared_25] Metrics for ${serverId}:`, metrics);
          return (metrics?.paperShares || 0) >= 25;
        },
        progress: async (privyId, runtime) => {
          const discordService = runtime.getService<DiscordService>('DiscordService');
          if (!discordService) return 0;
          const serverId = await discordService.getUserServerId(privyId);
          if (!serverId) return 0;
          const metrics = await discordService.getDiscordMetrics(serverId);
          const paperShares = metrics?.paperShares || 0;
          return Math.min(Math.floor((paperShares / 25) * 100), 100);
        },
      },
      {
        id: 'messages_100',
        type: 'community',
        description: 'Send 100 messages',
        validator: async (privyId, runtime) => {
          const discordService = runtime.getService<DiscordService>('DiscordService');
          if (!discordService) return false;
          const serverId = await discordService.getUserServerId(privyId);
          if (!serverId) return false;
          const metrics = await discordService.getDiscordMetrics(serverId);
          console.log(`[Validator:messages_100] Metrics for ${serverId}:`, metrics);
          return (metrics?.totalMessages || 0) >= 100;
        },
        progress: async (privyId, runtime) => {
          const discordService = runtime.getService<DiscordService>('DiscordService');
          if (!discordService) return 0;
          const serverId = await discordService.getUserServerId(privyId);
          if (!serverId) return 0;
          const metrics = await discordService.getDiscordMetrics(serverId);
          const totalMessages = metrics?.totalMessages || 0;
          return Math.min(Math.floor((totalMessages / 100) * 100), 100);
        },
      },
    ],
  },
} as const;
