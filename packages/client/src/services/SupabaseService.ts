import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase-client';
export interface UserLevel {
  id: string;
  privy_id: string;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface RequirementProgress {
  id: string;
  user_id: string;
  level: number;
  requirement: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LevelRequirement {
  id: string;
  level: number;
  description: string;
  requirements_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class SupabaseService {
  private static instance: SupabaseService;
  public client: SupabaseClient;

  private constructor() {
    this.client = supabase;
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  async getUserLevel(privyId: string): Promise<UserLevel | null> {
    const { data, error } = await this.client
      .from('user_levels')
      .select('*')
      .eq('privy_id', privyId)
      .single();

    if (error) throw error;
    return data;
  }

  async createUserLevel(privyId: string, level: number = 1): Promise<UserLevel> {
    const { data, error } = await this.client
      .from('user_levels')
      .insert([{ privy_id: privyId, level }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateUserLevel(privyId: string, level: number): Promise<UserLevel> {
    const { data, error } = await this.client
      .from('user_levels')
      .update({ level })
      .eq('privy_id', privyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRequirementProgress(userId: string, level: number): Promise<RequirementProgress[]> {
    const { data, error } = await this.client
      .from('requirement_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('level', level);

    if (error) throw error;
    return data || [];
  }

  async updateRequirementProgress(
    userId: string,
    level: number,
    requirement: string,
    completed: boolean
  ): Promise<RequirementProgress> {
    const { data, error } = await this.client
      .from('requirement_progress')
      .upsert({
        user_id: userId,
        level,
        requirement,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getLevelRequirements(level: number): Promise<LevelRequirement | null> {
    const { data, error } = await this.client
      .from('level_requirements')
      .select('*')
      .eq('level', level)
      .single();

    if (error) throw error;
    return data;
  }

  async getAllLevelRequirements(): Promise<LevelRequirement[]> {
    const { data, error } = await this.client
      .from('level_requirements')
      .select('*')
      .order('level', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async checkRequirementsCompletion(privyId: string, level: number): Promise<boolean> {
    try {
      // Get the level requirements
      const requirements = await this.getLevelRequirements(level);
      if (!requirements) {
        console.warn(`No requirements found for level ${level}`);
        return false;
      }

      // Get the user's progress for this level
      const progress = await this.getRequirementProgress(privyId, level);

      // Count completed requirements
      const completedCount = progress.filter((p) => p.completed).length;

      // Get total requirements count
      const totalRequirements = Object.keys(requirements.requirements_config).length;

      // Check if all requirements are completed
      return completedCount >= totalRequirements;
    } catch (error) {
      console.error('Error checking requirements completion:', error);
      return false;
    }
  }
}
