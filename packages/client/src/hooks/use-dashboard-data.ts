import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/use-auth';
import {
  fetchProjectData,
  fetchNFTsData,
  fetchDiscordMetrics,
  calculateProgress,
  fetchSessionId,
} from '../lib/api/dashboard';
import { Project, NFT, Discord } from '../types/database.types';

interface DashboardOptions {
  /**
   * Polling interval in milliseconds for Discord metrics (0 = disabled)
   * @default 5000 (5 seconds)
   */
  discordPollingInterval?: number;
}

/**
 * Custom hook to fetch and manage all dashboard data
 */
export function useDashboardData(options: DashboardOptions = {}) {
  const { discordPollingInterval = 30000 } = options;
  const { user } = useAuth();
  const privyId = user?.id;
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [discordStats, setDiscordStats] = useState<Discord | null>(null);
  const [progress, setProgress] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Function to fetch only Discord metrics
  const fetchDiscordDataOnly = async () => {
    if (!project?.id) return;

    try {
      console.log(`[useDashboardData] Refreshing Discord stats for project: ${project.id}`);
      const discordData = await fetchDiscordMetrics(project.id);

      // Only update if there are actual changes
      if (JSON.stringify(discordData) !== JSON.stringify(discordStats)) {
        console.log(`[useDashboardData] Discord stats updated:`, discordData);
        setDiscordStats(discordData);

        // Recalculate progress with new Discord data
        const projectLevel = typeof project.level === 'number' ? project.level : 1;
        const progressData = calculateProgress(projectLevel, discordData, nfts);
        setProgress(progressData);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error refreshing Discord metrics:', err);
      // Don't set main error state for background polling errors
    }
  };

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    if (!privyId) {
      console.log('[useDashboardData] No privyId available, skipping data fetch');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch project data first
      console.log(`[useDashboardData] Fetching project data for privyId: ${privyId}`);
      const projectData = await fetchProjectData(privyId);

      if (!projectData) {
        console.error('[useDashboardData] Could not fetch project data');
        setError('Could not fetch project data');
        setIsLoading(false);
        return;
      }

      console.log(`[useDashboardData] Project data fetched:`, projectData);
      setProject(projectData);

      // Fetch NFTs
      console.log(`[useDashboardData] Fetching NFTs for project: ${projectData.id}`);
      const nftsData = await fetchNFTsData(projectData.id);
      console.log(`[useDashboardData] NFTs fetched:`, nftsData);
      setNfts(nftsData);

      // Fetch Discord stats
      console.log(`[useDashboardData] Fetching Discord stats for project: ${projectData.id}`);
      const discordData = await fetchDiscordMetrics(projectData.id);
      console.log(`[useDashboardData] Discord stats fetched:`, discordData);
      setDiscordStats(discordData);

      // Calculate progress based on level and metrics
      const projectLevel = typeof projectData.level === 'number' ? projectData.level : 1;
      console.log(`[useDashboardData] Calculating progress for level: ${projectLevel}`);
      const progressData = calculateProgress(projectLevel, discordData, nftsData);
      console.log(`[useDashboardData] Progress calculated:`, progressData);
      setProgress(progressData);

      // Fetch session ID
      console.log(`[useDashboardData] Fetching session ID for privyId: ${privyId}`);
      const sessionIdData = await fetchSessionId(projectData.id);
      console.log(`[useDashboardData] Session ID fetched:`, sessionIdData);
      setSessionId(sessionIdData[0].id);

      // Update last fetched timestamp
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Setup polling for Discord metrics
  useEffect(() => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // If polling is enabled and we have a project
    if (discordPollingInterval > 0 && project?.id) {
      console.log(
        `[useDashboardData] Setting up Discord polling every ${discordPollingInterval}ms`
      );
      pollingIntervalRef.current = setInterval(fetchDiscordDataOnly, discordPollingInterval);
    }

    // Cleanup on unmount or when deps change
    return () => {
      if (pollingIntervalRef.current) {
        console.log('[useDashboardData] Clearing Discord polling interval');
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [discordPollingInterval, project?.id]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [privyId]);

  // Ensure level is always a number
  const currentLevel = project?.level && typeof project.level === 'number' ? project.level : 1;

  return {
    project,
    nfts,
    discordStats,
    progress,
    isLoading,
    sessionId,
    error,
    refresh: fetchDashboardData,
    refreshDiscord: fetchDiscordDataOnly,
    level: currentLevel,
    lastUpdated,
  };
}
