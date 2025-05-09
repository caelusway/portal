import { Profile } from '@/types/database.types';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Helper for authenticated fetch requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers = {
    ...options.headers,
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed: ${response.status}`);
  }

  return response.json();
};

export async function createOnboardingProfile(
  privyId: string,
  profileData: Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'level'>
): Promise<Profile> {
  try {
    return await fetchWithAuth(`${API_URL}/api/projects/privy/${privyId}`, {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  } catch (error) {
    console.error('Error creating onboarding profile:', error);
    throw error;
  }
}

export async function getOnboardingProfile(privyId: string): Promise<Profile | null> {
  try {
    return await fetchWithAuth(`${API_URL}/api/projects/privy/${privyId}`);
  } catch (error) {
    console.error('Error getting onboarding profile:', error);
    return null;
  }
}

export async function updateOnboardingProfile(
  id: string,
  profileData: Partial<Profile>
): Promise<Profile> {
  try {
    return await fetchWithAuth(`${API_URL}/api/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  } catch (error) {
    console.error('Error updating onboarding profile:', error);
    throw error;
  }
}
