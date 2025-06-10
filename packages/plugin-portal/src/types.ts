export interface PortalConfig {
  discordApiToken?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  openaiApiKey?: string;
  discordClientId?: string;
}

export interface LevelProgress {
  currentLevel: number;
  requirements: {
    [key: string]: any;
  };
  discordStats?: DiscordStats;
  nfts?: NFTData[];
}

export interface DiscordStats {
  memberCount: number;
  papersShared: number;
  messagesCount: number;
  botAdded: boolean;
  verified: boolean;
  serverName?: string;
  serverId?: string;
}

export interface NFTData {
  id: string;
  type: 'idea' | 'hypothesis' | 'vision';
  tokenId?: string;
  imageUrl?: string;
  metadata?: any;
  mintedAt?: Date;
}

export interface ChatContext {
  userId: string;
  projectId: string;
  level: number;
  discordStats?: DiscordStats;
  message: string;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// Level definitions from your existing system
export const LEVELS = {
  1: {
    label: 'Science NFT Creation',
    requirements: ['Mint Idea NFT', 'Mint Vision NFT'],
    description: 'Create your foundational science NFTs',
  },
  2: {
    label: 'Discord Setup',
    requirements: ['Create Discord server', 'Add verification bot', 'Reach 4+ members'],
    description: 'Establish your community foundation',
  },
  3: {
    label: 'Community Growth',
    requirements: ['Reach 10+ members', 'Share 25+ papers', 'Send 100+ messages'],
    description: 'Grow and engage your scientific community',
  },
  4: {
    label: 'Scientific Proof',
    requirements: ['Complete community metrics', 'Twitter integration'],
    description: 'Demonstrate scientific engagement and reach',
  },
} as const;

export type LevelNumber = keyof typeof LEVELS;
