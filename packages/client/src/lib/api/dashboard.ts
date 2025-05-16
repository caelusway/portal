import { NFT, Discord, Project as ProjectType } from '../../types/database.types';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Define new data types
export interface TwitterData {
  connected: boolean;
  twitterId?: string | null;
  twitterUsername?: string | null;
  introTweetsCount: number;
  tweetIds?: string | null;
  twitterSpaceUrl?: string | null;
  twitterSpaceDate?: Date | null;
  blogpostUrl?: string | null;
  blogpostDate?: Date | null;
  twitterThreadUrl?: string | null;
  twitterThreadDate?: Date | null;
  loomVideoUrl?: string | null;
  loomVideoDate?: Date | null;
}

export interface CommunityStats {
  verifiedScientists: number;
  twitterSpaceUrl?: string | null;
  twitterSpaceHosted: boolean;
}

export interface VisionContent {
  // Data from /api/twitter/:projectId/vision-content
  blogpostUrl?: string;
  twitterThreadUrl?: string;
}

export interface CompletionData {
  // Data from /api/twitter/:projectId/completion-data
  loomVideoUrl?: string;
}

// Helper function for authenticated API requests
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = {
    ...(options.headers || {}),
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`API Error (${response.status}) for ${url}: ${errorBody}`);
    throw new Error(`Error: ${response.statusText} - ${errorBody}`);
  }

  return response.json();
}

/**
 * Fetch project data with all related information
 */
export async function fetchProjectData(privyId: string): Promise<ProjectType | null> {
  try {
    // This should ideally return the ProjectType which might already include nested Twitter data,
    // verifiedScientistsCount, and loomVideoUrl if the backend model is structured that way.
    const project = await fetchWithAuth(`${API_URL}/api/projects/privy/${privyId}`);
    // If your ProjectType from database.types.ts is comprehensive, much of the data
    // for twitter, community, and completion might already be on `project`.
    // For now, we assume it returns the basic ProjectType and other functions fetch specifics.
    return project;
  } catch (error) {
    console.error('Failed to fetch project data:', error);
    return null;
  }
}

export async function fetchSessionId(projectId: string, sessionType: string = 'coreagent') {
  try {
    return await fetchWithAuth(
      `${API_URL}/api/chat/sessions/project/${projectId}/type/${sessionType}`
    );
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return [];
  }
}

/**
 * Fetch NFT data for a project
 */
export async function fetchNFTsData(projectId: string): Promise<NFT[]> {
  try {
    return await fetchWithAuth(`${API_URL}/api/projects/${projectId}/nfts`);
  } catch (error) {
    console.error('Failed to fetch NFT data:', error);
    return [];
  }
}

/**
 * Fetch Discord metrics for a project
 */
export async function fetchDiscordMetrics(projectId: string): Promise<Discord | null> {
  try {
    const discordData = await fetchWithAuth(`${API_URL}/api/projects/${projectId}/discord`);
    // Ensure botAdded is explicitly part of the return if not always present
    // and created flag based on id.
    // Fields like memberCount, papersShared, messagesCount should come from discordData if API provides them.
    return discordData
      ? {
          ...discordData,
          botAdded: (discordData as any).botAdded || false,
          created: !!discordData.id,
        }
      : null;
  } catch (error) {
    console.error('Failed to fetch Discord metrics:', error);
    return null;
  }
}

// Fetches comprehensive Twitter data for the project
export async function fetchTwitterData(
  projectId: string,
  project?: ProjectType | null
): Promise<TwitterData | null> {
  console.log(`[API] fetchTwitterData for ${projectId}`);
  try {
    // Uses the general endpoint that should return all Twitter model fields
    return await fetchWithAuth(`${API_URL}/api/twitter/${projectId}`);
  } catch (error) {
    console.error('Failed to fetch comprehensive Twitter data:', error);
    return null;
  }
}

// Fetches community-specific stats like verified scientists and Twitter Space details
export async function fetchCommunityStats(
  projectId: string,
  project?: ProjectType | null
): Promise<CommunityStats | null> {
  console.log(`[API] fetchCommunityStats for ${projectId}`);
  try {
    // Uses the specific endpoint for community progress
    const stats = await fetchWithAuth(`${API_URL}/api/twitter/${projectId}/community-progress`);
    return {
      verifiedScientists: stats.verifiedScientists || 0,
      twitterSpaceUrl: stats.twitterSpaceUrl || null,
      twitterSpaceHosted: !!stats.twitterSpaceUrl,
    };
  } catch (error) {
    console.error('Failed to fetch community stats:', error);
    return { verifiedScientists: 0, twitterSpaceUrl: null, twitterSpaceHosted: false }; // Fallback
  }
}

// Fetches vision content URLs (blogpost, Twitter thread)
export async function fetchVisionContent(
  projectId: string,
  project?: ProjectType | null
): Promise<VisionContent | null> {
  console.log(`[API] fetchVisionContent for ${projectId}`);
  try {
    // Uses the specific endpoint for vision content
    return await fetchWithAuth(`${API_URL}/api/twitter/${projectId}/vision-content`);
  } catch (error) {
    console.error('Failed to fetch vision content:', error);
    return { blogpostUrl: undefined, twitterThreadUrl: undefined }; // Fallback
  }
}

// Fetches completion data (Loom video URL)
export async function fetchCompletionData(
  projectId: string,
  project?: ProjectType | null
): Promise<CompletionData | null> {
  console.log(`[API] fetchCompletionData for ${projectId}`);
  try {
    // Uses the specific endpoint for completion data
    return await fetchWithAuth(`${API_URL}/api/twitter/${projectId}/completion-data`);
  } catch (error) {
    console.error('Failed to fetch completion data:', error);
    return { loomVideoUrl: undefined }; // Fallback
  }
}

/**
 * Calculate project progress
 */
export function calculateProgress(
  level: number,
  discordData: Discord | null,
  nfts: NFT[],
  twitterData?: TwitterData | null,
  communityStats?: CommunityStats | null,
  completionData?: CompletionData | null
) {
  let progress: any = {};

  if (level >= 1) {
    const ideaNFT = nfts?.find((nft) => nft.type === 'idea');
    const visionNFT = nfts?.find((nft) => nft.type === 'vision');
    let nftsMinted = 0;
    if (ideaNFT) nftsMinted++;
    if (visionNFT) nftsMinted++;
    progress.nfts = {
      count: nftsMinted,
      required: 2,
      percent: Math.min(100, Math.round((nftsMinted / 2) * 100)),
      ideaMinted: !!ideaNFT,
      visionMinted: !!visionNFT,
    };
  }

  if (level >= 2) {
    const memberCount = discordData?.memberCount || 0;
    // Ensure `created` and `botAdded` are from discordData directly if they exist there.
    // Assuming Discord type in database.types.ts will have these (or they are derived).
    // For now, `discordData.id` implies creation, and `discordData.botAdded` is assumed.
    const serverCreated = !!discordData?.id;
    const botAdded = discordData?.botAdded || false;
    progress.discordSetup = {
      members: {
        count: memberCount,
        required: 4,
        percent: Math.min(100, Math.round((memberCount / 4) * 100)),
      },
      serverCreated,
      botAdded,
      completed: serverCreated && botAdded && memberCount >= 4,
    };
  }

  if (level >= 3) {
    const memberCountL3 = discordData?.memberCount || 0;
    const papersSharedL3 = discordData?.papersShared || 0;
    const messagesCountL3 = discordData?.messagesCount || 0;
    progress.discordEngagement = {
      members: {
        count: memberCountL3,
        required: 5,
        percent: Math.min(100, Math.round((memberCountL3 / 5) * 100)),
      },
      papers: {
        count: papersSharedL3,
        required: 5,
        percent: Math.min(100, Math.round((papersSharedL3 / 5) * 100)),
      },
      messages: {
        count: messagesCountL3,
        required: 50,
        percent: Math.min(100, Math.round((messagesCountL3 / 50) * 100)),
      },
      completed: memberCountL3 >= 5 && papersSharedL3 >= 5 && messagesCountL3 >= 50,
    };
  }

  if (level >= 4 && twitterData) {
    const tweetsDone = twitterData.introTweetsCount || 0;
    progress.socialFoundation = {
      twitterConnected: twitterData.connected,
      tweets: {
        count: tweetsDone,
        required: 3,
        percent: Math.min(100, Math.round((tweetsDone / 3) * 100)),
      },
      completed: twitterData.connected && tweetsDone >= 3,
    };
  }

  if (level >= 5 && twitterData && communityStats) {
    const verifiedScientists = communityStats.verifiedScientists || 0;
    const twitterSpaceHosted = communityStats.twitterSpaceHosted;
    progress.communityVerification = {
      scientists: {
        count: verifiedScientists,
        required: 10,
        percent: Math.min(100, Math.round((verifiedScientists / 10) * 100)),
      },
      twitterSpaceHosted,
      completed: verifiedScientists >= 10 && twitterSpaceHosted,
    };
  }

  if (level >= 6 && twitterData) {
    // VisionContent data is likely within twitterData
    const blogpostPublished = !!twitterData.blogpostUrl;
    const twitterThreadShared = !!twitterData.twitterThreadUrl;
    progress.visionArticulation = {
      blogpostPublished,
      twitterThreadShared,
      completed: blogpostPublished && twitterThreadShared,
    };
  }

  if (level >= 7 && twitterData) {
    // Use twitterData for loomVideoUrl
    const loomVideoSubmitted = !!twitterData.loomVideoUrl;
    progress.onboardingCompletion = {
      loomVideoSubmitted,
      completed: loomVideoSubmitted,
    };
  }

  return progress;
}
