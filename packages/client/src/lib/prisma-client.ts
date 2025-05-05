// API client for database operations
// This is a frontend client that communicates with the backend API
// instead of using Prisma directly in the browser

const API_BASE_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';

// Utility function for API calls
async function apiCall<T>(endpoint: string, method: string = 'GET', data?: any): Promise<T> {
  console.log(`Making API call: ${method} ${endpoint}`);

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        // If JSON parsing fails, use the raw text
        errorData = { message: errorText };
      }

      const error = new Error(errorData.message || `API error: ${response.status}`);
      console.error(`API error (${response.status}):`, errorData);
      throw error;
    }

    const result = await response.json();
    console.log(`API call success: ${method} ${endpoint}`, {
      resultSize: JSON.stringify(result).length,
    });
    return result;
  } catch (error) {
    console.error(`API call failed: ${method} ${endpoint}`, error);
    throw error;
  }
}

/**
 * Get project by ID
 */
export async function getProjectById(id: string) {
  return apiCall(`/api/projects/${id}`);
}

/**
 * Get project by wallet address
 */
export async function getProjectByWallet(wallet: string) {
  return apiCall(`/api/projects/wallet/${wallet}`);
}

/**
 * Get project by Privy ID
 */
export async function getProjectByPrivyId(privyId: string) {
  return apiCall(`/api/projects/privy/${privyId}`);
}

/**
 * Create or update a project
 */
export async function upsertProject(data: {
  wallet: string;
  privyId?: string;
  level?: number;
  fullName?: string;
  email?: string;
  projectName?: string;
  projectDescription?: string;
  projectLinks?: string;
  referralSource?: string;
  projectVision?: string;
  scientificReferences?: string;
  credentialLinks?: string;
  teamMembers?: string;
  motivation?: string;
  progress?: string;
}) {
  return apiCall('/api/projects', 'POST', data);
}

/**
 * Get NFTs for a project
 */
export async function getNFTsByProjectId(projectId: string) {
  return apiCall(`/api/projects/${projectId}/nfts`);
}

/**
 * Get Discord info for a project
 */
export async function getDiscordByProjectId(projectId: string) {
  return apiCall(`/api/projects/${projectId}/discord`);
}

/**
 * Get chat sessions for a project
 */
export async function getChatSessionsByProjectId(projectId: string) {
  return apiCall(`/api/projects/${projectId}/chat-sessions`);
}

/**
 * Get chat messages for a session
 */
export async function getChatMessagesBySessionId(sessionId: string) {
  return apiCall(`/api/chat-sessions/${sessionId}/messages`);
}

/**
 * Create a new chat message
 */
export async function createChatMessage(data: {
  sessionId: string;
  content: string;
  isFromAgent: boolean;
  actionTaken?: string;
  actionSuccess?: boolean;
}) {
  return apiCall('/api/chat-messages', 'POST', data);
}

/**
 * Create or get a chat session for a project
 */
export async function getOrCreateChatSession(projectId: string) {
  return apiCall(`/api/projects/${projectId}/chat-session`, 'POST');
}
