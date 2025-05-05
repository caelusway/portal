import React, { createContext, useContext, useEffect, useState } from 'react';

// Types that match our database schema
export interface BioUser {
  id: string;
  privyId: string;
  wallet: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  referralCode: string | null;
  referredById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string | null;
  description: string | null;
  vision: string | null;
  level: number;
  fullName?: string;
  email?: string;
  referralSource?: string;
  projectName?: string;
  projectDescription?: string;
  projectLinks?: string;
  projectVision?: string;
  scientificReferences?: string;
  credentialLinks?: string;
  teamMembers?: string;
  motivation?: string;
  progress?: string;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  members?: ProjectMember[];
  Discord?: Discord;
  NFTs?: NFT[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  bioUserId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  project?: Project;
  bioUser?: BioUser;
}

export interface ProjectInvite {
  id: string;
  projectId: string;
  inviterUserId: string;
  inviteeEmail: string;
  token: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  project?: Project;
  inviter?: BioUser;
}

export interface NFT {
  id: string;
  projectId: string;
  type: string;
  tokenId: string | null;
  contractAddress: string | null;
  chain: string | null;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  metadata: any;
  mintedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Discord {
  id: string;
  projectId: string;
  serverId: string;
  serverName: string | null;
  serverIcon: string | null;
  inviteLink: string | null;
  verificationToken: string | null;
  memberCount: number;
  messagesCount: number;
  papersShared: number;
  botAdded: boolean;
  botAddedAt: Date | null;
  verified: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  // User methods
  getUserById: (id: string) => Promise<BioUser | null>;
  getUserByPrivyId: (privyId: string) => Promise<BioUser | null>;
  getUserByWallet: (wallet: string) => Promise<BioUser | null>;
  createUser: (userData: Partial<BioUser>) => Promise<BioUser>;
  updateUser: (id: string, userData: Partial<BioUser>) => Promise<BioUser>;

  // Project methods
  getProjectById: (id: string, userId: string) => Promise<Project | null>;
  getProjectsByUserId: (userId: string) => Promise<Project[]>;
  createProject: (projectData: Partial<Project>, userId: string) => Promise<Project>;
  updateProject: (id: string, projectData: Partial<Project>, userId: string) => Promise<Project>;

  // Project Member methods
  getProjectMembers: (projectId: string) => Promise<ProjectMember[]>;
  addProjectMember: (projectId: string, bioUserId: string, role: string) => Promise<ProjectMember>;
  updateProjectMemberRole: (id: string, role: string) => Promise<ProjectMember>;
  removeProjectMember: (id: string) => Promise<boolean>;

  // Project Invite methods
  createProjectInvite: (
    projectId: string,
    inviterUserId: string,
    inviteeEmail: string
  ) => Promise<ProjectInvite>;
  verifyInviteToken: (token: string) => Promise<ProjectInvite | null>;
  acceptInvite: (token: string, userId: string) => Promise<boolean>;
  getInvitesByProjectId: (projectId: string) => Promise<ProjectInvite[]>;

  // NFT methods
  getNFTsByProjectId: (projectId: string, userId: string) => Promise<NFT[]>;
  requestNFTMint: (projectId: string, nftType: string, userId: string) => Promise<boolean>;

  // Discord methods
  getDiscordByProjectId: (projectId: string, userId: string) => Promise<Discord | null>;
  setupDiscord: (projectId: string, inviteLink: string, userId: string) => Promise<boolean>;
  checkDiscordStats: (projectId: string, userId: string) => Promise<Discord | null>;

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
  getUserById: async () => null,
  getUserByPrivyId: async () => null,
  getUserByWallet: async () => null,
  createUser: async () => ({
    id: '',
    privyId: '',
    wallet: null,
    email: null,
    fullName: null,
    avatarUrl: null,
    referralCode: null,
    referredById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateUser: async () => ({
    id: '',
    privyId: '',
    wallet: null,
    email: null,
    fullName: null,
    avatarUrl: null,
    referralCode: null,
    referredById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getProjectById: async () => null,
  getProjectsByUserId: async () => [],
  createProject: async () => ({
    id: '',
    name: null,
    description: null,
    vision: null,
    level: 1,
    scientificReferences: '',
    credentialLinks: '',
    teamDescription: '',
    motivation: '',
    progress: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateProject: async () => ({
    id: '',
    name: null,
    description: null,
    vision: null,
    level: 1,
    scientificReferences: '',
    credentialLinks: '',
    teamDescription: '',
    motivation: '',
    progress: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getProjectMembers: async () => [],
  addProjectMember: async () => ({
    id: '',
    projectId: '',
    bioUserId: '',
    role: 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateProjectMemberRole: async () => ({
    id: '',
    projectId: '',
    bioUserId: '',
    role: 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  removeProjectMember: async () => false,
  createProjectInvite: async () => ({
    id: '',
    projectId: '',
    inviterUserId: '',
    inviteeEmail: '',
    token: '',
    status: 'pending',
    expiresAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  verifyInviteToken: async () => null,
  acceptInvite: async () => false,
  getInvitesByProjectId: async () => [],
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

  // User methods
  const getUserById = async (id: string): Promise<BioUser | null> => {
    try {
      const response = await fetch(`${API_URL}/api/users/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  };

  const getUserByPrivyId = async (privyId: string): Promise<BioUser | null> => {
    try {
      const response = await fetch(`${API_URL}/api/users/privy/${privyId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching user by Privy ID:', error);
      return null;
    }
  };

  const getUserByWallet = async (wallet: string): Promise<BioUser | null> => {
    try {
      const response = await fetch(`${API_URL}/api/users/wallet/${wallet}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching user by wallet:', error);
      return null;
    }
  };

  const createUser = async (userData: Partial<BioUser>): Promise<BioUser> => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const updateUser = async (id: string, userData: Partial<BioUser>): Promise<BioUser> => {
    try {
      const response = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  // Project methods
  const getProjectById = async (id: string, userId: string): Promise<Project | null> => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}?userId=${userId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching project by ID:', error);
      return null;
    }
  };

  const getProjectsByUserId = async (userId: string): Promise<Project[]> => {
    try {
      const response = await fetch(`${API_URL}/api/projects?userId=${userId}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching projects by user ID:', error);
      return [];
    }
  };

  const createProject = async (projectData: Partial<Project>, userId: string): Promise<Project> => {
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...projectData, userId }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  };

  const updateProject = async (
    id: string,
    projectData: Partial<Project>,
    userId: string
  ): Promise<Project> => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...projectData, userId }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  };

  // Project Member methods
  const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/members`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching project members:', error);
      return [];
    }
  };

  const addProjectMember = async (
    projectId: string,
    bioUserId: string,
    role: string
  ): Promise<ProjectMember> => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bioUserId, role }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error adding project member:', error);
      throw error;
    }
  };

  const updateProjectMemberRole = async (id: string, role: string): Promise<ProjectMember> => {
    try {
      const response = await fetch(`${API_URL}/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating project member role:', error);
      throw error;
    }
  };

  const removeProjectMember = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/members/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      return result.success || false;
    } catch (error) {
      console.error('Error removing project member:', error);
      return false;
    }
  };

  // Project Invite methods
  const createProjectInvite = async (
    projectId: string,
    inviterUserId: string,
    inviteeEmail: string
  ): Promise<ProjectInvite> => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: inviterUserId, inviteeEmail }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating project invite:', error);
      throw error;
    }
  };

  const verifyInviteToken = async (token: string): Promise<ProjectInvite | null> => {
    try {
      const response = await fetch(`${API_URL}/api/invites/verify?token=${token}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error verifying invite token:', error);
      return null;
    }
  };

  const acceptInvite = async (token: string, userId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/invites/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId }),
      });
      const result = await response.json();
      return result.success || false;
    } catch (error) {
      console.error('Error accepting invite:', error);
      return false;
    }
  };

  const getInvitesByProjectId = async (projectId: string): Promise<ProjectInvite[]> => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/invites`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching project invites:', error);
      return [];
    }
  };

  // NFT methods
  const getNFTsByProjectId = async (projectId: string, userId: string): Promise<NFT[]> => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/nfts?userId=${userId}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      return [];
    }
  };

  const requestNFTMint = async (
    projectId: string,
    nftType: string,
    userId: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/nfts/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, type: nftType, userId }),
      });
      const result = await response.json();
      return result.success || false;
    } catch (error) {
      console.error('Error requesting NFT mint:', error);
      return false;
    }
  };

  // Discord methods
  const getDiscordByProjectId = async (
    projectId: string,
    userId: string
  ): Promise<Discord | null> => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/discord?userId=${userId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching Discord info:', error);
      return null;
    }
  };

  const setupDiscord = async (
    projectId: string,
    inviteLink: string,
    userId: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/discord/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, inviteLink, userId }),
      });
      const result = await response.json();
      return result.success || false;
    } catch (error) {
      console.error('Error setting up Discord:', error);
      return false;
    }
  };

  const checkDiscordStats = async (projectId: string, userId: string): Promise<Discord | null> => {
    try {
      const response = await fetch(
        `${API_URL}/api/projects/${projectId}/discord/stats?userId=${userId}`
      );
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
    getUserById,
    getUserByPrivyId,
    getUserByWallet,
    createUser,
    updateUser,
    getProjectById,
    getProjectsByUserId,
    createProject,
    updateProject,
    getProjectMembers,
    addProjectMember,
    updateProjectMemberRole,
    removeProjectMember,
    createProjectInvite,
    verifyInviteToken,
    acceptInvite,
    getInvitesByProjectId,
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
