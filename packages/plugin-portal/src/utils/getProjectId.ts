// Utility to extract projectId from memory.text (JSON), memory.content, or state
export function getProjectId(message: any, state: any): string | null {
  let projectId = message.content?.userId || message.content?.user_id || state?.values?.userId;

  // Fallback to other possible sources
  if (!projectId) {
    projectId = message.content?.projectId || message.userId || message.roomId || state?.projectId;
  }

  return projectId || null;
}

export function getUserId(message: any, state?: any): string {
  let userId = message.content?.userId || message.content?.user_id || state?.values?.userId;

  // Fallback to other possible sources
  if (!userId) {
    userId = message.userId || message.roomId || message.agentId;
  }

  return userId || 'unknown';
}
