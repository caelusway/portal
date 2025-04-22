import { DiscordStats } from '../../types/database.types';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Response shape from the Discord API endpoint
 */
interface DiscordStatsResponse {
  success: boolean;
  discord: {
    serverId: string;
    serverName: string;
    memberCount: number;
    messagesCount: number;
    papersShared: number;
    botAdded: boolean;
    verified: boolean;
  };
  level: {
    current: number;
    requirements: string[];
    progress: Record<
      string,
      {
        current: number;
        required: number;
        percent: number;
      }
    >;
  };
  botStatus: {
    installed: boolean;
    installationLink: string | null;
  };
  error?: string;
  message?: string;
}

/**
 * Fetches Discord statistics for a project
 * @param projectId The ID of the project
 * @returns The Discord statistics with progress data or null if no server is connected
 */
export async function fetchDiscordStats(projectId: string): Promise<DiscordStats | null> {
  try {
    const response = await fetch(`${API_URL}/api/discord/${projectId}`);

    if (!response.ok) {
      if (response.status === 404) {
        // No Discord server connected
        return null;
      }
      throw new Error(`Failed to fetch Discord stats: ${response.statusText}`);
    }

    const data = (await response.json()) as DiscordStatsResponse;

    if (!data.success || !data.discord) {
      return null;
    }

    return {
      serverId: data.discord.serverId,
      serverName: data.discord.serverName || 'Unknown Server',
      memberCount: data.discord.memberCount || 0,
      messagesCount: data.discord.messagesCount || 0,
      papersShared: data.discord.papersShared || 0,
      verified: data.discord.verified || false,
      botAdded: data.discord.botAdded || false,
    };
  } catch (error) {
    console.error('Error fetching Discord stats:', error);
    return null;
  }
}

/**
 * Fetches detailed Discord stats including level progress information
 * @param projectId The ID of the project
 * @returns The full Discord response including progress and level requirements
 */
export async function fetchDetailedDiscordStats(
  projectId: string
): Promise<DiscordStatsResponse | null> {
  try {
    const response = await fetch(`${API_URL}/api/discord/${projectId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch Discord stats: ${response.statusText}`);
    }

    return (await response.json()) as DiscordStatsResponse;
  } catch (error) {
    console.error('Error fetching detailed Discord stats:', error);
    return null;
  }
}

/**
 * Checks if a Discord server is connected to the project
 * @param projectId The ID of the project
 * @returns True if a Discord server is connected, false otherwise
 */
export async function isDiscordConnected(projectId: string): Promise<boolean> {
  const stats = await fetchDiscordStats(projectId);
  return stats !== null;
}

/**
 * Gets the progress of Discord metrics for level requirements
 * @param stats The Discord statistics
 * @returns An object containing the progress percentages for members, messages, and papers
 */
export function getDiscordProgress(stats: DiscordStats | null) {
  if (!stats) {
    return {
      memberProgress: 0,
      messageProgress: 0,
      paperProgress: 0,
    };
  }

  // Calculate progress percentages (capped at 100%)
  const memberProgress = Math.min(Math.floor((stats.memberCount / 10) * 100), 100);
  const messageProgress = Math.min(Math.floor((stats.messagesCount / 100) * 100), 100);
  const paperProgress = Math.min(Math.floor((stats.papersShared / 25) * 100), 100);

  return {
    memberProgress,
    messageProgress,
    paperProgress,
  };
}
