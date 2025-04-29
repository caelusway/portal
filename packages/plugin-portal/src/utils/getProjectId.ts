// Utility to extract projectId from memory.text (JSON), memory.content, or state
export function getProjectId(message: any, state: any) {
  let projectId = message.content.userId || message.content.user_id || state.values?.userId;
  return projectId;
}
