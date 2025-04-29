import { useState, useEffect } from 'react';
import { useAuth } from '../lib/use-auth';
import {
  fetchProjectData,
  fetchNFTsData,
  fetchDiscordMetrics,
  calculateProgress,
  fetchSessionId,
} from '../lib/api/dashboard';
import { Project, NFT, Discord } from '../types/database.types';

/**
 * Custom hook to fetch and manage all dashboard data
 */
export function useDashboardData() {
  const { user } = useAuth();
  const privyId = user?.id;

  const [project, setProject] = useState<Project | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [discordStats, setDiscordStats] = useState<Discord | null>(null);
  const [progress, setProgress] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

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
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [privyId, project]);

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
    level: currentLevel,
  };
}
