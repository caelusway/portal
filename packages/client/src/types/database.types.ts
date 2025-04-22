export interface Profile {
  id: string;
  user_id?: string;
  privy_id?: string;
  username?: string;
  avatar_url?: string;
  full_name?: string;
  email?: string;
  project_name?: string;
  project_description?: string;
  project_vision?: string;
  scientific_references?: string;
  credential_links?: string;
  team_members?: string;
  motivation?: string;
  progress?: string;
  created_at: string;
  updated_at?: string;
  level?: number;
}

// Keep OnboardingProfile as an alias to Profile for backward compatibility
export type OnboardingProfile = Profile;

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  vision?: string;
  created_at: string;
  level?: number;
}

export interface AgentInteraction {
  id: string;
  user_id: string;
  message: string;
  agent_response: string;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  level: number;
  discord_id?: string;
  updated_at: string;
}

export interface NFTMetadata {
  id: string;
  user_id: string;
  profile_id: string;
  token_id: string;
  contract_address: string;
  metadata_uri: string;
  type: 'idea' | 'vision';
  created_at: string;
  image_uri: string;
  chain_id: number;
  premint_uid?: string;
  status: 'pending' | 'minted' | 'failed';
}

export interface NFTMintRequest {
  profile_id: string;
  type: 'idea' | 'vision';
  prompt: string;
  image_uri?: string;
}

export interface LevelRequirements {
  id: string;
  level: number;
  description: string; // Optional: Human-readable description
  requirements_config: Record<string, any>; // Use JSONB in the DB
  created_at: Date; // Use native Date/Timestamp type
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

/**
 * Frontend representation of Discord stats
 */
export interface DiscordStats {
  serverId: string;
  serverName: string;
  memberCount: number;
  messagesCount: number;
  papersShared: number;
  verified: boolean;
  botAdded: boolean;
}
