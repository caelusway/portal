import { NFT, Discord } from '../../types/database.types';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_API_KEY || '';

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
    throw new Error(`Error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch project data with all related information
 */
export async function fetchProjectData(privyId: string) {
  try {
    return await fetchWithAuth(`${API_URL}/api/projects/privy/${privyId}`);
  } catch (error) {
    console.error('Failed to fetch project data:', error);
    return null;
  }
}

export async function fetchSessionId(projectId: string) {
  try {
    return await fetchWithAuth(`${API_URL}/api/chat/sessions/project/${projectId}`);
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
    return await fetchWithAuth(`${API_URL}/api/projects/${projectId}/discord`);
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
