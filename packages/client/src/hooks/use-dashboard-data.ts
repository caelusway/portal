import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../lib/use-auth';
import {
  fetchProjectData,
  fetchNFTsData,
  fetchDiscordMetrics,
  calculateProgress,
  fetchSessionId,
  fetchTwitterData,
  fetchCommunityStats,
  fetchVisionContent,
  fetchCompletionData,
  TwitterData,
  CommunityStats,
  VisionContent,
  CompletionData,
} from '../lib/api/dashboard';
import { Project, NFT, Discord } from '../types/database.types';

interface DashboardOptions {
  /**
   * Polling interval in milliseconds for Discord metrics (0 = disabled)
   * @default 5000 (5 seconds)
   */
  discordPollingInterval?: number;
  /**
   * Session type for chat sessions
   * @default "coreagent"
   */
  sessionType?: string;
}

/**
 * Custom hook to fetch and manage all dashboard data
 */
export function useDashboardData(options: DashboardOptions = {}) {
  const { discordPollingInterval = 5000, sessionType = 'coreagent' } = options;
  const { user } = useAuth();
  const privyId = user?.id;
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [discordStats, setDiscordStats] = useState<Discord | null>(null);
  const [twitterInfo, setTwitterInfo] = useState<TwitterData | null>(null);
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [visionContent, setVisionContent] = useState<VisionContent | null>(null);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [progress, setProgress] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const recalculateProgress = useCallback(() => {
    if (project) {
      const projectLevel = typeof project.level === 'number' ? project.level : 1;
      const progressData = calculateProgress(
        projectLevel,
        discordStats,
        nfts,
        twitterInfo,
        communityStats,
        completionData
      );
      setProgress(progressData);
    }
  }, [project, discordStats, nfts, twitterInfo, communityStats, completionData]);

  const fetchDiscordDataOnly = useCallback(async () => {
    if (!project?.id) return;

    try {
      console.log(`[useDashboardData] Refreshing Discord stats for project: ${project.id}`);
      const newDiscordData = await fetchDiscordMetrics(project.id);

      if (JSON.stringify(newDiscordData) !== JSON.stringify(discordStats)) {
        console.log(`[useDashboardData] Discord stats updated:`, newDiscordData);
        setDiscordStats(newDiscordData);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error refreshing Discord metrics:', err);
    }
  }, [project?.id, discordStats]);

  const fetchDashboardData = useCallback(async () => {
    if (!privyId) {
      console.log('[useDashboardData] No privyId available, skipping data fetch');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useDashboardData] Fetching project data for privyId: ${privyId}`);
      const projectData = await fetchProjectData(privyId);
      setProject(projectData);

      if (!projectData) {
        console.error('[useDashboardData] Could not fetch project data');
        setError('Could not fetch project data');
        setIsLoading(false);
        return;
      }
      console.log(`[useDashboardData] Project data fetched:`, projectData);

      const [
        nftsData,
        discordData,
        twitterDataResult,
        communityStatsResult,
        visionContentResult,
        completionDataResult,
        sessionIdData,
      ] = await Promise.all([
        fetchNFTsData(projectData.id),
        fetchDiscordMetrics(projectData.id),
        fetchTwitterData(projectData.id),
        fetchCommunityStats(projectData.id),
        fetchVisionContent(projectData.id),
        fetchCompletionData(projectData.id),
        fetchSessionId(projectData.id, sessionType),
      ]);

      console.log(`[useDashboardData] NFTs fetched:`, nftsData);
      setNfts(nftsData);
      console.log(`[useDashboardData] Discord stats fetched:`, discordData);
      setDiscordStats(discordData);
      console.log(`[useDashboardData] Twitter info fetched:`, twitterDataResult);
      setTwitterInfo(twitterDataResult);
      console.log(`[useDashboardData] Community stats fetched:`, communityStatsResult);
      setCommunityStats(communityStatsResult);
      console.log(`[useDashboardData] Vision content fetched:`, visionContentResult);
      setVisionContent(visionContentResult);
      console.log(`[useDashboardData] Completion data fetched:`, completionDataResult);
      setCompletionData(completionDataResult);

      // Log all sessions to help debugging
      console.log(`[useDashboardData] Session data for ${sessionType} fetched:`, sessionIdData);

      if (sessionIdData && Array.isArray(sessionIdData) && sessionIdData.length > 0) {
        // Filter sessions by the current session type
        const typedSessions = sessionIdData.filter(
          (session) =>
            session.sessionType === sessionType ||
            // Fallback for backward compatibility with sessions that might not have sessionType
            (session.sessionType === undefined && sessionType === 'coreagent')
        );

        if (typedSessions.length > 0) {
          // Use the most recently updated session of the correct type
          const sortedSessions = [...typedSessions].sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.startedAt).getTime();
            const dateB = new Date(b.updatedAt || b.startedAt).getTime();
            return dateB - dateA; // Sort descending (newest first)
          });

          setSessionId(sortedSessions[0].id);
          console.log(`[useDashboardData] Selected ${sessionType} session:`, sortedSessions[0]);
        } else {
          // No sessions of the required type, will need to create one
          console.log(`[useDashboardData] No sessions found for type: ${sessionType}`);
          setSessionId(null);
        }
      } else {
        // No sessions at all
        console.log(`[useDashboardData] No sessions found for project`);
        setSessionId(null);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [privyId, sessionType]);

  useEffect(() => {
    if (!isLoading) {
      recalculateProgress();
    }
  }, [
    project,
    discordStats,
    nfts,
    twitterInfo,
    communityStats,
    completionData,
    isLoading,
    recalculateProgress,
  ]);

  useEffect(() => {
    if (discordPollingInterval > 0 && project?.id) {
      console.log(
        `[useDashboardData] Setting up Discord polling every ${discordPollingInterval}ms`
      );
      pollingIntervalRef.current = setInterval(fetchDiscordDataOnly, discordPollingInterval);
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
    return () => {
      if (pollingIntervalRef.current) {
        console.log('[useDashboardData] Clearing Discord polling interval');
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [discordPollingInterval, project?.id, fetchDiscordDataOnly]);

  useEffect(() => {
    fetchDashboardData();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [privyId, fetchDashboardData]);

  const currentLevel = project?.level && typeof project.level === 'number' ? project.level : 1;

  return {
    project,
    nfts,
    discordStats,
    twitterInfo,
    communityStats,
    visionContent,
    completionData,
    progress,
    isLoading,
    sessionId,
    error,
    refresh: fetchDashboardData,
    refreshDiscord: fetchDiscordDataOnly,
    level: currentLevel,
    lastUpdated,
    sessionType,
  };
}
