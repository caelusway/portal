import { createClient } from '@supabase/supabase-js';

import { config } from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
config({ path: rootEnvPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey =
  process.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_SERVICE_KEY;

// Create a client for each JWT token
let supabaseInstance: ReturnType<typeof createClient> | null = null;
let currentJwt: string | null = null;

// Function to get or create Supabase client with JWT
export const getSupabase = () => {
  if (!supabaseInstance) {
    // Initialize with anon key
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseInstance;
};

// Export a convenience accessor
export const supabase = getSupabase();

// Function to set JWT token
export const setSupabaseJwt = (jwt: string | null) => {
  // Skip if trying to set the same JWT (prevents loops)
  if (jwt === currentJwt) {
    return;
  }

  // Store the current JWT
  currentJwt = jwt;

  if (jwt) {
    // Create a new client instance with the JWT in the Authorization header
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    });
  } else {
    // Reset to a clean client without auth header
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
};

// Service role client for admin operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          apikey: supabaseServiceKey,
        },
      },
    })
  : null;
