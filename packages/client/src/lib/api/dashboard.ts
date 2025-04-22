import { NFT, Discord } from '../../types/database.types';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Fetch project data with all related information
 */
export async function fetchProjectData(privyId: string) {
  try {
    const response = await fetch(`${API_URL}/api/projects/privy/${privyId}`);

    if (!response.ok) {
      throw new Error(`Error fetching project: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch project data:', error);
    return null;
  }
}

/**
 * Fetch NFT data for a project
 */
export async function fetchNFTsData(projectId: string): Promise<NFT[]> {
  try {
    const response = await fetch(`${API_URL}/api/projects/${projectId}/nfts`);

    if (!response.ok) {
      throw new Error(`Error fetching NFTs: ${response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(`${API_URL}/api/projects/${projectId}/discord`);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch Discord metrics:', error);
    return null;
  }
}

/**
 * Calculate project progress
 */
export function calculateProgress(level: number, discordData: Discord | null, nfts: NFT[]) {
  // Level 1: NFT minting progress
  if (level === 1) {
    const nftCount = nfts?.length || 0;
    return {
      nfts: {
        count: nftCount,
        required: 2,
        percent: Math.min(100, Math.round((nftCount / 2) * 100)),
      },
    };
  }

  // Level 2: Discord setup and initial members
  if (level === 2) {
    const memberCount = discordData?.memberCount || 0;
    return {
      members: {
        count: memberCount,
        required: 4,
        percent: Math.min(100, Math.round((memberCount / 4) * 100)),
      },
    };
  }

  // Level 3: Growing community metrics
  if (level === 3) {
    const memberCount = discordData?.memberCount || 0;
    const papersShared = discordData?.papersShared || 0;
    const messagesCount = discordData?.messagesCount || 0;

    return {
      members: {
        count: memberCount,
        required: 10,
        percent: Math.min(100, Math.round((memberCount / 10) * 100)),
      },
      papers: {
        count: papersShared,
        required: 25,
        percent: Math.min(100, Math.round((papersShared / 25) * 100)),
      },
      messages: {
        count: messagesCount,
        required: 100,
        percent: Math.min(100, Math.round((messagesCount / 100) * 100)),
      },
    };
  }

  // Level 4 has no further metrics to track
  return {};
}
