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

export interface Twitter {
  id: string;
  projectId: string;
  connected: boolean;
  twitterUsername: string | null;
  twitterId: string | null;
  introTweetsCount: number;
  tweetIds: string | null;
  twitterSpaceUrl: string | null;
  twitterSpaceDate: string | null;
  blogpostUrl: string | null;
  blogpostDate: string | null;
  twitterThreadUrl: string | null;
  twitterThreadDate: string | null;
  loomVideoUrl: string | null;
  loomVideoDate: string | null;
  createdAt: string;
  updatedAt: string;
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
  Twitter?: Twitter;
  Discord?: Discord;
  NFTs?: NFT[];
  verifiedScientistCount?: number;
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
  mintedAt: string;
  projectId: string;
  transactionHash?: string | null;
  imageUrl?: string | null;
  tokenId?: string | null;
  metadataUri?: string | null;
}

export interface Discord {
  id: string;
  serverId: string;
  inviteLink?: string | null;
  memberCount: number;
  papersShared: number;
  messagesCount: number;
  qualityScore: number;
  botAdded: boolean;
  botAddedAt?: string | null;
  verificationToken?: string | null;
  verified: boolean;
  serverIcon?: string | null;
  serverName?: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
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
