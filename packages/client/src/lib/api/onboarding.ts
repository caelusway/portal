import { Profile } from '../../types/database.types';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Get profile by privy_id
 */
export const getOnboardingProfile = async (privyId: string): Promise<Profile | null> => {
  try {
    const response = await fetch(`${API_URL}/api/projects/privy/${privyId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Error fetching profile: ${response.statusText}`);
    }

    const project = await response.json();
    return mapProjectToProfile(project);
  } catch (error) {
    console.error('Failed to fetch onboarding profile:', error);
    return null;
  }
};

/**
 * Create or update a profile using privyId
 */
export const createOnboardingProfile = async (
  profile: Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'level'> & {
    privy_id: string;
    wallet_address?: string;
  }
): Promise<Profile> => {
  try {
    // Ensure wallet is defined
    if (!profile.wallet_address) {
      throw new Error('Wallet address is required to create a profile');
    }

    const response = await fetch(`${API_URL}/api/projects/privy/${profile.privy_id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: profile.full_name,
        email: profile.email,
        projectName: profile.project_name,
        projectDescription: profile.project_description,
        projectVision: profile.project_vision,
        scientificReferences: profile.scientific_references,
        credentialLinks: profile.credential_links,
        teamMembers: profile.team_members,
        motivation: profile.motivation,
        progress: profile.progress,
        wallet: profile.wallet_address,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error creating profile: ${response.statusText}`);
    }

    const project = await response.json();
    return mapProjectToProfile(project);
  } catch (error) {
    console.error('Failed to create onboarding profile:', error);
    throw error;
  }
};

/**
 * Update an existing profile using privy_id
 */
export async function updateOnboardingProfile(
  privyId: string,
  updates: Partial<Omit<Profile, 'id' | 'privy_id' | 'created_at' | 'updated_at'>>
): Promise<Profile> {
  console.log('Updating profile with Portal API:', { privyId, updates });

  try {
    // First get the existing project
    const project = await getOnboardingProfile(privyId);
    if (!project) {
      throw new Error('Profile not found');
    }

    // Then update it with the new values
    const response = await fetch(`${API_URL}/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: updates.full_name,
        email: updates.email,
        projectName: updates.project_name,
        projectDescription: updates.project_description,
        projectVision: updates.project_vision,
        scientificReferences: updates.scientific_references,
        credentialLinks: updates.credential_links,
        teamMembers: updates.team_members,
        motivation: updates.motivation,
        progress: updates.progress,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update profile: ${response.statusText}`);
    }

    const data = await response.json();
    return mapProjectToProfile(data);
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error(
      `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete a profile using privy_id
 */
export async function deleteOnboardingProfile(privyId: string): Promise<void> {
  console.log('Deleting profile with Portal API:', { privyId });

  try {
    // First get the project ID
    const project = await getOnboardingProfile(privyId);
    if (!project) {
      console.warn('No profile found to delete for privyId:', privyId);
      return;
    }

    const response = await fetch(`${API_URL}/api/projects/${project.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete profile: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting profile:', error);
    throw new Error(
      `Failed to delete profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Helper function to map from Project schema to Profile schema
 */
function mapProjectToProfile(project: any): Profile {
  return {
    id: project.id,
    privy_id: project.privyId,
    full_name: project.fullName,
    email: project.email,
    username: project.username,
    project_name: project.projectName,
    project_description: project.projectDescription,
    project_vision: project.projectVision,
    scientific_references: project.scientificReferences,
    credential_links: project.credentialLinks,
    team_members: project.teamMembers,
    motivation: project.motivation,
    progress: project.progress,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    level: project.level || 1,
  };
}
