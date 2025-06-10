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
  teamDescription?: string;
  motivation?: string;
  progress?: string;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  members?: ProjectMember[];
  Discord?: Discord;
  Twitter?: Twitter;
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

export interface Twitter {
  id: string;
  projectId: string;
  connected: boolean;
  twitterUsername: string | null;
  twitterId: string | null;
  introTweetsCount: number;
  tweetIds: string | null;
  twitterSpaceUrl: string | null;
  twitterSpaceDate: Date | null;
  blogpostUrl: string | null;
  blogpostDate: Date | null;
  twitterThreadUrl: string | null;
  twitterThreadDate: Date | null;
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
  sessionType?: string;
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

// Add POL-related interfaces
export interface POLResult {
  merkleRoot: string;
  transactionData: {
    to: string;
    data: string;
  };
  files: Array<{
    filename: string;
    hash: string;
    size: number;
  }>;
  metadata: {
    timestamp: string;
    totalFiles: number;
  };
}

// Define the type for our database context
interface DatabaseContextType {
  // User methods
  getUserById: (id: string) => Promise<BioUser | null>;
  getUserByPrivyId: (privyId: string) => Promise<BioUser | null>;
  getUserByWallet: (wallet: string) => Promise<BioUser | null>;
  getUserByEmail: (email: string) => Promise<BioUser | null>;
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
    privyId: string,
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

  // Twitter methods
  getTwitterByProjectId: (projectId: string, userId: string) => Promise<Twitter | null>;
  updateTwitterInfo: (
    projectId: string,
    twitterData: Partial<Twitter>,
    userId: string
  ) => Promise<Twitter>;

  // Chat methods
  getChatSessionsByProjectId: (projectId: string, sessionType?: string) => Promise<ChatSession[]>;
  getChatMessagesBySessionId: (sessionId: string) => Promise<ChatMessage[]>;
  createChatMessage: (
    sessionId: string,
    content: string,
    isFromAgent: boolean
  ) => Promise<ChatMessage>;
  getOrCreateChatSession: (projectId: string, sessionType?: string) => Promise<ChatSession>;

  getProjectByPrivyId: (privyId: string) => Promise<Project | null>;

  // Loading state
  loading: boolean;

  // New method to update user's social connections
  updateUserSocialConnections: (
    userId: string,
    connectionData: {
      platform: 'discord' | 'twitter';
      platformId: string;
      username: string;
      email?: string;
      avatarUrl?: string;
      name?: string;
      accessToken?: string;
      refreshToken?: string;
    }
  ) => Promise<BioUser>;

  // POL methods
  generatePOL: (files: File[]) => Promise<POLResult>;
}

// Create the context with default values
const DatabaseContext = createContext<DatabaseContextType>({
  getUserById: async () => null,
  getUserByPrivyId: async () => null,
  getUserByWallet: async () => null,
  getUserByEmail: async () => null,
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
  getProjectByPrivyId: async () => null,
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
    sessionType: 'coreagent',
    startedAt: new Date(),
    updatedAt: new Date(),
  }),
  loading: true,
  updateUserSocialConnections: async () => ({
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
  getTwitterByProjectId: async () => null,
  updateTwitterInfo: async () => ({
    id: '',
    projectId: '',
    connected: false,
    twitterUsername: null,
    twitterId: null,
    introTweetsCount: 0,
    tweetIds: null,
    twitterSpaceUrl: null,
    twitterSpaceDate: null,
    blogpostUrl: null,
    blogpostDate: null,
    twitterThreadUrl: null,
    twitterThreadDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  generatePOL: async () => ({
    merkleRoot: '',
    transactionData: { to: '', data: '' },
    files: [],
    metadata: { timestamp: '', totalFiles: 0 },
  }),
});

// API base URL from environment or default
const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Update the fetchWithAuth helper to handle FormData properly
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    'x-api-key': API_KEY,
  };

  // Add existing headers from options, but handle Authorization separately for POL
  if (options.headers) {
    Object.entries(options.headers as Record<string, string>).forEach(([key, value]) => {
      headers[key] = value;
    });
  }

  // Only add Content-Type for non-FormData requests
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed: ${response.statusText}`);
  }

  return response.json();
};

// Update API client
const apiClient = {
  get: (endpoint: string) => fetchWithAuth(`${API_URL}${endpoint}`),

  post: (endpoint: string, data: any) =>
    fetchWithAuth(`${API_URL}${endpoint}`, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  put: (endpoint: string, data: any) =>
    fetchWithAuth(`${API_URL}${endpoint}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (endpoint: string) =>
    fetchWithAuth(`${API_URL}${endpoint}`, {
      method: 'DELETE',
    }),

  // POL-specific method with custom headers
  postPOL: (endpoint: string, formData: FormData) =>
    fetchWithAuth(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_POI_API_KEY}`,
      },
      body: formData,
    }),
};

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
      return await apiClient.get(`/api/users/${id}`);
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  };

  const getUserByPrivyId = async (privyId: string): Promise<BioUser | null> => {
    try {
      return await apiClient.get(`/api/users/privy/${privyId}`);
    } catch (error) {
      console.error('Error fetching user by Privy ID:', error);
      return null;
    }
  };

  const getUserByWallet = async (wallet: string): Promise<BioUser | null> => {
    try {
      return await apiClient.get(`/api/users/wallet/${wallet}`);
    } catch (error) {
      console.error('Error fetching user by wallet:', error);
      return null;
    }
  };

  const getUserByEmail = async (email: string): Promise<BioUser | null> => {
    try {
      return await apiClient.get(`/api/users/email/${email}`);
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  };

  const createUser = async (userData: Partial<BioUser>): Promise<BioUser> => {
    try {
      return await apiClient.post(`/api/users`, userData);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const updateUser = async (id: string, userData: Partial<BioUser>): Promise<BioUser> => {
    try {
      return await apiClient.put(`/api/users/${id}`, userData);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  // Project methods
  const getProjectById = async (id: string, userId: string): Promise<Project | null> => {
    try {
      return await apiClient.get(`/api/projects/${id}?userId=${userId}`);
    } catch (error) {
      console.error('Error fetching project by ID:', error);
      return null;
    }
  };

  const getProjectsByUserId = async (userId: string): Promise<Project[]> => {
    try {
      return await apiClient.get(`/api/projects?userId=${userId}`);
    } catch (error) {
      console.error('Error fetching projects by user ID:', error);
      return [];
    }
  };

  const getProjectByPrivyId = async (privyId: string): Promise<Project | null> => {
    try {
      return await apiClient.get(`/api/projects/privy/${privyId}`);
    } catch (error) {
      console.error('Error fetching project by Privy ID:', error);
      return null;
    }
  };

  const createProject = async (projectData: Partial<Project>, userId: string): Promise<Project> => {
    try {
      return await apiClient.post(`/api/projects`, { ...projectData, userId });
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
      // Map client-side field names to database field names
      const mappedData: Record<string, any> = {
        projectName: projectData.name,
        projectDescription: projectData.description,
        projectVision: projectData.vision,
        scientificReferences: projectData.scientificReferences,
        teamMembers: projectData.teamMembers,
        credentialLinks: projectData.credentialLinks,
        motivation: projectData.motivation,
        progress: projectData.progress,
      };

      // Remove undefined fields
      Object.keys(mappedData).forEach(
        (key) => mappedData[key] === undefined && delete mappedData[key]
      );

      return await apiClient.put(`/api/projects/${id}`, mappedData);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  };

  // Project Member methods
  const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
    try {
      return await apiClient.get(`/api/projects/${projectId}/members`);
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
      return await apiClient.post(`/api/projects/${projectId}/members`, { bioUserId, role });
    } catch (error) {
      console.error('Error adding project member:', error);
      throw error;
    }
  };

  const updateProjectMemberRole = async (id: string, role: string): Promise<ProjectMember> => {
    try {
      return await apiClient.put(`/api/projects/members/${id}`, { role });
    } catch (error) {
      console.error('Error updating project member role:', error);
      throw error;
    }
  };

  const removeProjectMember = async (id: string): Promise<boolean> => {
    try {
      const result = await apiClient.delete(`/api/projects/members/${id}`);
      return result.success || false;
    } catch (error) {
      console.error('Error removing project member:', error);
      return false;
    }
  };

  // Project Invite methods
  const createProjectInvite = async (
    projectId: string,
    privyId: string,
    inviteeEmail: string
  ): Promise<ProjectInvite> => {
    try {
      return await apiClient.post(`/api/projects/${projectId}/invites/${privyId}`, {
        inviteeEmail: inviteeEmail,
      });
    } catch (error) {
      console.error('Error creating project invite:', error);
      throw error;
    }
  };

  const verifyInviteToken = async (token: string): Promise<ProjectInvite | null> => {
    try {
      return await apiClient.get(`/api/invites/verify?token=${token}`);
    } catch (error) {
      console.error('Error verifying invite token:', error);
      return null;
    }
  };

  const acceptInvite = async (token: string, userId: string): Promise<boolean> => {
    try {
      const result = await apiClient.post(`/api/invites/accept`, { token, userId });
      console.log('AcceptInvite: Result:', result);
      return result.success || false;
    } catch (error) {
      console.error('Error accepting invite:', error);
      return false;
    }
  };

  const getInvitesByProjectId = async (projectId: string): Promise<ProjectInvite[]> => {
    try {
      return await apiClient.get(`/api/projects/${projectId}/invites`);
    } catch (error) {
      console.error('Error fetching project invites:', error);
      return [];
    }
  };

  // NFT methods
  const getNFTsByProjectId = async (projectId: string, userId: string): Promise<NFT[]> => {
    try {
      return await apiClient.get(`/api/projects/${projectId}/nfts?userId=${userId}`);
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
      const result = await apiClient.post(`/api/nfts/mint`, { projectId, type: nftType, userId });
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
      return await apiClient.get(`/api/projects/${projectId}/discord`);
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
      const result = await apiClient.post(`/api/discord/setup`, { projectId, inviteLink, userId });
      return result.success || false;
    } catch (error) {
      console.error('Error setting up Discord:', error);
      return false;
    }
  };

  const checkDiscordStats = async (projectId: string, userId: string): Promise<Discord | null> => {
    try {
      return await apiClient.get(`/api/projects/${projectId}/discord/stats?userId=${userId}`);
    } catch (error) {
      console.error('Error checking Discord stats:', error);
      return null;
    }
  };

  // Twitter methods
  const getTwitterByProjectId = async (
    projectId: string,
    userId: string
  ): Promise<Twitter | null> => {
    try {
      return await apiClient.get(`/api/projects/${projectId}/twitter`);
    } catch (error) {
      console.error('Error fetching Twitter info:', error);
      return null;
    }
  };

  const updateTwitterInfo = async (
    projectId: string,
    twitterData: Partial<Twitter>,
    userId: string
  ): Promise<Twitter> => {
    try {
      return await apiClient.put(`/api/projects/${projectId}/twitter`, { ...twitterData, userId });
    } catch (error) {
      console.error('Error updating Twitter info:', error);
      throw error;
    }
  };

  // Chat methods
  const getChatSessionsByProjectId = async (
    projectId: string,
    sessionType: string = 'coreagent'
  ): Promise<ChatSession[]> => {
    try {
      return await apiClient.get(`/api/chat/sessions/project/${projectId}/type/${sessionType}`);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      return [];
    }
  };

  const getChatMessagesBySessionId = async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      return await apiClient.get(`/api/chat/messages/session/${sessionId}`);
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
      return await apiClient.post(`/api/chat/messages`, { sessionId, content, isFromAgent });
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw error;
    }
  };

  const getOrCreateChatSession = async (
    projectId: string,
    sessionType: string = 'coreagent'
  ): Promise<ChatSession> => {
    try {
      return await apiClient.post(`/api/chat/sessions`, { projectId, sessionType });
    } catch (error) {
      console.error('Error getting/creating chat session:', error);
      throw error;
    }
  };

  // Add a method to update user's social connections
  const updateUserSocialConnections = async (
    userId: string,
    connectionData: {
      platform: 'discord' | 'twitter';
      platformId: string;
      username: string;
      email?: string;
      avatarUrl?: string;
      name?: string;
      accessToken?: string;
      refreshToken?: string;
    }
  ): Promise<BioUser> => {
    try {
      return await apiClient.put(`/api/users/${userId}/social-connections`, connectionData);
    } catch (error) {
      console.error(`Error updating ${connectionData.platform} connection:`, error);
      throw error;
    }
  };

  // POL methods
  const generatePOL = async (files: File[]): Promise<POLResult> => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const result = await apiClient.postPOL('/api/v1/inventions', formData);

      return {
        merkleRoot: result.result.root,
        transactionData: result.result.transaction,
        files: result.result.files,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error('Error generating POL:', error);
      throw error;
    }
  };

  // Provide all methods through context
  const value = {
    getUserById,
    getUserByPrivyId,
    getUserByWallet,
    getUserByEmail,
    createUser,
    updateUser,
    updateUserSocialConnections,
    getProjectById,
    getProjectsByUserId,
    getProjectByPrivyId,
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
    getTwitterByProjectId,
    updateTwitterInfo,
    generatePOL,
  };

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
};

// Custom hook to use the database context
export const useDatabase = () => useContext(DatabaseContext);
