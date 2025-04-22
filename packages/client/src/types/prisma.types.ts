import { Project, NFT, Discord, ChatSession, ChatMessage } from '@prisma/client';

export interface ProjectWithRelations extends Project {
  Discord?: Discord | null;
  NFTs?: NFT[];
  chatSessions?: ChatSession[];
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}

export interface NFTCreateInput {
  name: string;
  description: string;
  imageUrl: string;
  projectId: string;
  metadata?: any;
}

export interface ProjectCreateInput {
  wallet: string;
  privyId?: string;
  level?: number;
  fullName?: string;
  email?: string;
  projectName?: string;
  projectDescription?: string;
  projectVision?: string;
}

export interface DiscordCreateInput {
  projectId: string;
  serverId: string;
  serverName: string;
  serverIcon?: string;
  inviteCode: string;
  memberCount?: number;
}

export interface ChatMessageCreateInput {
  sessionId: string;
  content: string;
  isFromAgent: boolean;
  actionTaken?: string;
  actionSuccess?: boolean;
}
