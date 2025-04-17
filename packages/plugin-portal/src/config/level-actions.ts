// Defines actions relevant or available at each level.
// The agent should use this information, combined with level requirements,
// to guide the user and suggest appropriate next steps.

export const LEVEL_ACTIONS: Record<number, string[]> = {
  1: [
    'nft_minting', // Action needed to progress FROM level 1 TO level 2
    'query_project_status',
    'general_help',
  ],
  2: [
    'discord_creation', // Action needed to progress FROM level 2 TO level 3
    'query_project_status',
    'query_nft_status',
    'general_help',
  ],
  3: [
    'query_discord_stats', // Actions available AT level 3 to progress TO level 4
    'share_paper_analysis', // Example action
    'query_project_status',
    'general_help',
  ],
  4: [
    // Actions available AT level 4 (potentially end-game or further growth)
    'propose_community_vote', // Example
    'query_discord_stats',
    'query_project_status',
    'general_help',
  ],
  // Add more levels and their associated actions as needed
};

/**
 * Gets the relevant actions for a given user level.
 * Currently returns actions for the user's *current* level.
 * Could be expanded to include actions for the next level if needed.
 */
export function getAllowedActionsForLevel(level: number): string[] {
  return LEVEL_ACTIONS[level] || LEVEL_ACTIONS[1] || []; // Default to level 1 or empty if level not defined
}
