import React, { createContext, useContext, useEffect, useState } from 'react';

// Types that match our database schema
export interface Project {
  id: string;
  wallet: string;
  privyId?: string;
  level: number;
  fullName?: string;
  email?: string;
  projectName?: string;
  projectDescription?: string;
  projectVision?: string;
  scientificReferences?: string;
  credentialLinks?: string;
  teamMembers?: string;
  motivation?: string;
  progress?: string;
  createdAt: Date;
  updatedAt: Date;
  // Add relations
  Discord?: Discord;
  NFTs?: NFT[];
}

export interface NFT {
  id: string;
  type: string;
  mintedAt: Date;
  projectId: string;
  transactionHash?: string;
  imageUrl?: string;
}

export interface Discord {
  id: string;
  serverId: string;
  memberCount: number;
  papersShared: number;
  messagesCount: number;
  qualityScore: number;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  inviteLink: string;
  botAdded: boolean;
  botAddedAt?: Date;
  verificationToken?: string;
  verified: boolean;
  serverIcon?: string;
  serverName?: string;
}

export interface ChatSession {
  id: string;
  projectId: string;
  startedAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  content: string;
  isFromAgent: boolean;
  timestamp: Date;
  sessionId: string;
  actionTaken?: string;
  actionSuccess?: boolean;
}

// Define the type for our database context
interface DatabaseContextType {
  // Project methods
  getProjectById: (id: string) => Promise<Project | null>;
  getProjectByWallet: (wallet: string) => Promise<Project | null>;
  upsertProject: (projectData: Partial<Project>) => Promise<Project>;

  // NFT methods
  getNFTsByProjectId: (projectId: string) => Promise<NFT[]>;
  requestNFTMint: (projectId: string, nftType: string) => Promise<boolean>;

  // Discord methods
  getDiscordByProjectId: (projectId: string) => Promise<Discord | null>;
  setupDiscord: (projectId: string, inviteLink: string) => Promise<boolean>;
  checkDiscordStats: (projectId: string) => Promise<Discord | null>;

  // Chat methods
  getChatSessionsByProjectId: (projectId: string) => Promise<ChatSession[]>;
  getChatMessagesBySessionId: (sessionId: string) => Promise<ChatMessage[]>;
  createChatMessage: (
    sessionId: string,
    content: string,
    isFromAgent: boolean
  ) => Promise<ChatMessage>;
  getOrCreateChatSession: (projectId: string) => Promise<ChatSession>;

  // Loading state
  loading: boolean;
}

// Create the context with default values
const DatabaseContext = createContext<DatabaseContextType>({
  getProjectById: async () => null,
  getProjectByWallet: async () => null,
  upsertProject: async () => ({
    id: '',
    wallet: '',
    level: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getNFTsByProjectId: async () => [],
  requestNFTMint: async () => false,
  getDiscordByProjectId: async () => null,
  setupDiscord: async () => false,
  checkDiscordStats: async () => null,
  getChatSessionsByProjectId: async () => [],
  getChatMessagesBySessionId: async () => [],
  createChatMessage: async () => ({
    id: '',
    content: '',
    isFromAgent: false,
    timestamp: new Date(),
    sessionId: '',
  }),
  getOrCreateChatSession: async () => ({
    id: '',
    projectId: '',
    startedAt: new Date(),
    updatedAt: new Date(),
  }),
  loading: true,
});

// API base URL from environment or default
const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';

// Provider component
export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);

  // Initialize any connections or state needed
  useEffect(() => {
    // Setup completed
    setLoading(false);
  }, []);

  // Project methods
  const getProjectById = async (id: string): Promise<Project | null> => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching project by ID:', error);
      return null;
    }
  };

  const getProjectByWallet = async (wallet: string): Promise<Project | null> => {
    try {
      const response = await fetch(`${API_URL}/api/projects/wallet/${wallet}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching project by wallet:', error);
      return null;
    }
  };

  const upsertProject = async (projectData: Partial<Project>): Promise<Project> => {
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });
      return await response.json();
    } catch (error) {
      console.error('Error upserting project:', error);
      throw error;
    }
  };

  // NFT methods
  const getNFTsByProjectId = async (projectId: string): Promise<NFT[]> => {
    try {
      const response = await fetch(`${API_URL}/api/nfts/project/${projectId}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      return [];
    }
  };

  const requestNFTMint = async (projectId: string, nftType: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/nfts/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, type: nftType }),
      });
      const result = await response.json();
      return result.success || false;
    } catch (error) {
      console.error('Error requesting NFT mint:', error);
      return false;
    }
  };

  // Discord methods
  const getDiscordByProjectId = async (projectId: string): Promise<Discord | null> => {
    try {
      const response = await fetch(`${API_URL}/api/discord/project/${projectId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching Discord info:', error);
      return null;
    }
  };

  const setupDiscord = async (projectId: string, inviteLink: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/discord/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, inviteLink }),
      });
      const result = await response.json();
      return result.success || false;
    } catch (error) {
      console.error('Error setting up Discord:', error);
      return false;
    }
  };

  const checkDiscordStats = async (projectId: string): Promise<Discord | null> => {
    try {
      const response = await fetch(`${API_URL}/api/discord/stats/${projectId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error checking Discord stats:', error);
      return null;
    }
  };

  // Chat methods
  const getChatSessionsByProjectId = async (projectId: string): Promise<ChatSession[]> => {
    try {
      const response = await fetch(`${API_URL}/api/chat/sessions/project/${projectId}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      return [];
    }
  };

  const getChatMessagesBySessionId = async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      const response = await fetch(`${API_URL}/api/chat/messages/session/${sessionId}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  };

  const createChatMessage = async (
    sessionId: string,
    content: string,
    isFromAgent: boolean
  ): Promise<ChatMessage> => {
    try {
      const response = await fetch(`${API_URL}/api/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, content, isFromAgent }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw error;
    }
  };

  const getOrCreateChatSession = async (projectId: string): Promise<ChatSession> => {
    try {
      const response = await fetch(`${API_URL}/api/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error getting/creating chat session:', error);
      throw error;
    }
  };

  // Provide all methods through context
  const value = {
    getProjectById,
    getProjectByWallet,
    upsertProject,
    getNFTsByProjectId,
    requestNFTMint,
    getDiscordByProjectId,
    setupDiscord,
    checkDiscordStats,
    getChatSessionsByProjectId,
    getChatMessagesBySessionId,
    createChatMessage,
    getOrCreateChatSession,
    loading,
  };

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
};

// Custom hook to use the database context
export const useDatabase = () => useContext(DatabaseContext);
