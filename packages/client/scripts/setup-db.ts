import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
config({ path: rootEnvPath });

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables.');
  console.error('Please create a .env file in the root directory with:');
  console.error(`
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_SERVICE_KEY=your_supabase_service_key
  `);
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      apikey: supabaseServiceKey,
    },
  },
});

async function setupDatabase() {
  console.log('Setting up database schema and RLS for Custom JWT Auth Flow...');

  try {
    // --- Stage 0: Ensure exec_sql function exists ---
    console.log('\n--- Stage 0: Ensuring exec_sql function exists ---');
    const createExecSqlFunctionSql = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      GRANT EXECUTE ON FUNCTION exec_sql TO service_role;
    `;
    try {
      // Try executing a simple command using it first
      const { error: testExecError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
      if (testExecError) {
        console.log('exec_sql function not found or not working, attempting creation...');
        // Function doesn't exist or isn't callable, need to create it directly
        // Note: Directly executing DDL like this in Supabase JS client might be restricted.
        // Usually, this function creation is done via Supabase Dashboard SQL Editor or migrations.
        // We attempt it here but may need manual intervention if it fails.
        // This direct SQL execution via rpc might not work depending on Supabase version/config.
        // We are wrapping the creation logic inside another function call, which might fail.
        const { error: creationError } = await supabase.rpc('sql', {
          query: createExecSqlFunctionSql,
        }); // Example, actual method might differ
        if (creationError) {
          console.error('Failed to create exec_sql function directly via RPC:', creationError);
          console.warn(
            'Manual creation of exec_sql function might be required via Supabase SQL Editor.'
          );
        } else {
          console.log('Attempted to create exec_sql function directly.');
        }
      } else {
        console.log('exec_sql function exists and is callable.');
      }
    } catch (error) {
      console.error('Error checking/creating exec_sql function:', error);
      console.warn('Continuing setup, but subsequent steps might fail if exec_sql is unavailable.');
      // Attempting to proceed without guarantee exec_sql works
    }

    // --- Define SQL Statements ---

    // Shared function
    const sharedFunctionSql = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // User Levels - Schema
    const userLevelsSchemaSql = `
      CREATE TABLE IF NOT EXISTS user_levels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        privy_id TEXT NOT NULL UNIQUE, -- Changed from user_id
        level INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      DROP INDEX IF EXISTS idx_user_levels_user_id; -- Drop old index
      CREATE INDEX IF NOT EXISTS idx_user_levels_privy_id ON user_levels(privy_id);
      DROP TRIGGER IF EXISTS update_user_levels_updated_at ON user_levels;
      CREATE TRIGGER update_user_levels_updated_at
      BEFORE UPDATE ON user_levels
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `;

    // Requirements Definitions Schema SQL
    const requirementDefinitionsSchemaSql = `
      CREATE TABLE IF NOT EXISTS requirement_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requirement_key TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        requirement_type TEXT NOT NULL CHECK (requirement_type IN ('nft', 'discord', 'message', 'paper')),
        metric_name TEXT,
        metric_target INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      DROP TRIGGER IF EXISTS update_requirement_definitions_updated_at ON requirement_definitions;
      CREATE TRIGGER update_requirement_definitions_updated_at
      BEFORE UPDATE ON requirement_definitions
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `;

    // Level Requirements Schema SQL
    const levelRequirementsSchemaSql = `
      CREATE TABLE IF NOT EXISTS level_requirements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        level INTEGER UNIQUE NOT NULL,
        description TEXT NOT NULL,
        requirements_config JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS level_requirement_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        level_id UUID REFERENCES level_requirements(id) ON DELETE CASCADE,
        requirement_id UUID REFERENCES requirement_definitions(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(level_id, requirement_id)
      );
      
      DROP TRIGGER IF EXISTS update_level_requirements_updated_at ON level_requirements;
      CREATE TRIGGER update_level_requirements_updated_at
      BEFORE UPDATE ON level_requirements
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_level_requirement_mappings_updated_at ON level_requirement_mappings;
      CREATE TRIGGER update_level_requirement_mappings_updated_at
      BEFORE UPDATE ON level_requirement_mappings
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `;

    // Requirements Progress Schema SQL
    const requirementsProgressSchemaSql = `
      CREATE TABLE IF NOT EXISTS requirement_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        privy_id TEXT NOT NULL,
        requirement_id UUID REFERENCES requirement_definitions(id) ON DELETE CASCADE,
        level INTEGER NOT NULL,
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP WITH TIME ZONE,
        metric_value INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(privy_id, requirement_id, level)
      );
      
      DROP TRIGGER IF EXISTS update_requirement_progress_updated_at ON requirement_progress;
      CREATE TRIGGER update_requirement_progress_updated_at
      BEFORE UPDATE ON requirement_progress
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `;

    // User Levels - RLS
    const userLevelsRlsSql = `
      ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Users can read their own level" ON user_levels;
      CREATE POLICY "Users can read their own level"
      ON user_levels FOR SELECT
      USING ((request.jwt.claims ->> 'privy_id')::text = privy_id);
      
      DROP POLICY IF EXISTS "Users can insert their own level" ON user_levels;
      CREATE POLICY "Users can insert their own level"
      ON user_levels FOR INSERT
      WITH CHECK ((request.jwt.claims ->> 'privy_id')::text = privy_id);
      
      DROP POLICY IF EXISTS "Users can update their own level" ON user_levels;
      CREATE POLICY "Users can update their own level"
      ON user_levels FOR UPDATE
      USING ((request.jwt.claims ->> 'privy_id')::text = privy_id);
      
      DROP POLICY IF EXISTS "Service role can manage levels" ON user_levels;
      CREATE POLICY "Service role can manage levels"
      ON user_levels FOR ALL
      USING (current_setting('role', true) = 'service_role');
      
      GRANT SELECT, INSERT, UPDATE ON user_levels TO authenticated;
      GRANT ALL ON user_levels TO service_role;
    `;

    // Level Requirements - RLS
    const levelRequirementsRlsSql = `
      ALTER TABLE level_requirements ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Anyone can read level requirements" ON level_requirements;
      CREATE POLICY "Anyone can read level requirements"
      ON level_requirements FOR SELECT
      USING (true);
      
      DROP POLICY IF EXISTS "Service role can manage level requirements" ON level_requirements;
      CREATE POLICY "Service role can manage level requirements"
      ON level_requirements FOR ALL
      USING (current_setting('role', true) = 'service_role');
      
      GRANT SELECT ON level_requirements TO authenticated, anon;
      GRANT ALL ON level_requirements TO service_role;
    `;

    // Requirements Progress - RLS
    const requirementsProgressRlsSql = `
      ALTER TABLE requirement_progress ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Users can read their own requirements" ON requirement_progress;
      CREATE POLICY "Users can read their own requirements"
      ON requirement_progress FOR SELECT
      USING (auth.uid() = privy_id);
      
      DROP POLICY IF EXISTS "Users can insert their own requirements" ON requirement_progress;
      CREATE POLICY "Users can insert their own requirements"
      ON requirement_progress FOR INSERT
      WITH CHECK (auth.uid() = privy_id);
      
      DROP POLICY IF EXISTS "Users can update their own requirements" ON requirement_progress;
      CREATE POLICY "Users can update their own requirements"
      ON requirement_progress FOR UPDATE
      USING (auth.uid() = privy_id);
      
      DROP POLICY IF EXISTS "Service role can manage requirements" ON requirement_progress;
      CREATE POLICY "Service role can manage requirements"
      ON requirement_progress FOR ALL
      USING (current_setting('role', true) = 'service_role');
      
      GRANT SELECT, INSERT, UPDATE ON requirement_progress TO authenticated;
      GRANT ALL ON requirement_progress TO service_role;
    `;

    // Onboarding (Profiles) - Schema
    const onboardingSchemaSql = `
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        privy_id TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        project_name TEXT NOT NULL,
        project_description TEXT NOT NULL,
        project_vision TEXT NOT NULL,
        scientific_references TEXT NOT NULL,
        credential_links TEXT NOT NULL,
        team_members TEXT NOT NULL,
        motivation TEXT NOT NULL,
        progress TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      DROP INDEX IF EXISTS idx_profiles_user_id;
      CREATE INDEX IF NOT EXISTS idx_profiles_privy_id ON profiles(privy_id);
      DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
      CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `;
    // Onboarding (Profiles) - RLS
    const onboardingRlsSql = `
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
      CREATE POLICY "Users can read their own profile"
      ON profiles FOR SELECT
      USING ((request.jwt.claims ->> 'privy_id')::text = privy_id);
      DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
      CREATE POLICY "Users can insert their own profile"
      ON profiles FOR INSERT
      WITH CHECK (privy_id IS NOT NULL AND (request.jwt.claims ->> 'privy_id')::text = privy_id);
      DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
      CREATE POLICY "Users can update their own profile"
      ON profiles FOR UPDATE
      USING ((request.jwt.claims ->> 'privy_id')::text = privy_id);
      GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
      GRANT ALL ON profiles TO service_role;
    `;

    // Auth Cleanup - Schema (Drops only)
    const authCleanupSql = `
      DROP FUNCTION IF EXISTS handle_privy_user_link();
      DROP FUNCTION IF EXISTS get_privy_user(text);
      DROP FUNCTION IF EXISTS is_same_privy_user(text);
    `;

    // NFT Metadata - Schema
    const nftSchemaSql = `
      CREATE TABLE IF NOT EXISTS nft_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        privy_id TEXT NOT NULL,
        profile_id UUID NOT NULL, 
        token_id TEXT NOT NULL,
        contract_address TEXT NOT NULL,
        metadata_uri TEXT NOT NULL,
        image_uri TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('idea', 'vision')), 
        chain_id INTEGER NOT NULL DEFAULT 8453, 
        premint_uid TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'minted', 'failed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      DROP INDEX IF EXISTS idx_nft_metadata_user_id;
      CREATE INDEX IF NOT EXISTS idx_nft_metadata_privy_id ON nft_metadata(privy_id);
      CREATE INDEX IF NOT EXISTS idx_nft_metadata_profile_id ON nft_metadata(profile_id);
      CREATE INDEX IF NOT EXISTS idx_nft_metadata_premint_uid ON nft_metadata(premint_uid);
      DROP TRIGGER IF EXISTS update_nft_metadata_updated_at ON nft_metadata;
      CREATE TRIGGER update_nft_metadata_updated_at
      BEFORE UPDATE ON nft_metadata
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `;
    // NFT Metadata - RLS
    const nftRlsSql = `
      ALTER TABLE nft_metadata ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Users can view their own NFTs" ON nft_metadata;
      CREATE POLICY "Users can view their own NFTs"
      ON nft_metadata FOR SELECT
      USING ((request.jwt.claims ->> 'privy_id')::text = privy_id);
      DROP POLICY IF EXISTS "Authenticated users can create NFTs" ON nft_metadata;
      CREATE POLICY "Authenticated users can create NFTs"
      ON nft_metadata FOR INSERT
      WITH CHECK ((request.jwt.claims ->> 'privy_id')::text = privy_id);
      DROP POLICY IF EXISTS "Users can update their own NFTs" ON nft_metadata;
      CREATE POLICY "Users can update their own NFTs"
      ON nft_metadata FOR UPDATE
      USING ((request.jwt.claims ->> 'privy_id')::text = privy_id);
      GRANT ALL ON nft_metadata TO authenticated;
      GRANT ALL ON nft_metadata TO service_role;
    `;

    // *** NEW: User Discord Info - Schema ***
    const userDiscordInfoSchemaSql = `
      CREATE TABLE IF NOT EXISTS user_discord_info (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        privy_id TEXT NOT NULL UNIQUE,
        server_id TEXT NOT NULL, 
        invite_link TEXT NOT NULL,
        bot_invited BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_privy_id
          FOREIGN KEY(privy_id)
          REFERENCES profiles(privy_id)
          ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_user_discord_info_privy_id ON user_discord_info(privy_id);
      DROP TRIGGER IF EXISTS update_user_discord_info_updated_at ON user_discord_info;
      CREATE TRIGGER update_user_discord_info_updated_at
      BEFORE UPDATE ON user_discord_info
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `;

    // Helper Functions & View - Schema
    const functionsSchemaSql = `
      DROP FUNCTION IF EXISTS public.get_privy_user_id(text);
      CREATE OR REPLACE FUNCTION public.get_full_profile_by_id(profile_id uuid)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE 
        profile_data jsonb; 
        profile_privy_id text;
      BEGIN 
        -- First get the privy_id for this profile
        SELECT privy_id INTO profile_privy_id FROM profiles WHERE id = profile_id;
        
        -- Check permissions
        IF auth.uid() = profile_privy_id OR current_setting('role', true) = 'service_role' THEN
          SELECT to_jsonb(p) INTO profile_data FROM profiles p WHERE p.id = profile_id; 
          RETURN profile_data;
        ELSE
          RAISE EXCEPTION 'Permission denied: cannot access profile data for other users';
        END IF;
      END; 
      $$;
      
      DROP FUNCTION IF EXISTS public.get_full_profile(text, text);
      CREATE OR REPLACE FUNCTION public.get_full_profile(p_privy_id text)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE 
        profile_data jsonb; 
      BEGIN 
        -- Check permissions
        IF auth.uid() = p_privy_id OR current_setting('role', true) = 'service_role' THEN
          SELECT to_jsonb(p) INTO profile_data FROM profiles p WHERE p.privy_id = p_privy_id; 
          RETURN profile_data;
        ELSE
          RAISE EXCEPTION 'Permission denied: cannot access profile data for other users';
        END IF;
      END; 
      $$;
      
      -- User Level RPC Functions
      DROP FUNCTION IF EXISTS public.get_user_level(text);
      CREATE OR REPLACE FUNCTION public.get_user_level(p_privy_id text)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE 
        level_data jsonb; 
      BEGIN 
        -- First make sure the user has permission to access this record
        -- This will respect RLS policies because it doesn't use SECURITY DEFINER
        IF auth.uid() = p_privy_id OR current_setting('role', true) = 'service_role' THEN
          SELECT to_jsonb(ul) INTO level_data FROM user_levels ul WHERE ul.privy_id = p_privy_id; 
          RETURN level_data;
        ELSE
          RAISE EXCEPTION 'Permission denied: cannot access level data for other users';
        END IF;
      END; 
      $$;

      DROP FUNCTION IF EXISTS public.create_default_user_level(text);
      CREATE OR REPLACE FUNCTION public.create_default_user_level(p_privy_id text)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE 
        new_level_data jsonb;
      BEGIN
        -- First make sure the user has permission to create this record
        -- This will respect RLS policies because it doesn't use SECURITY DEFINER
        IF auth.uid() = p_privy_id OR current_setting('role', true) = 'service_role' THEN
          -- First check if level already exists
          IF EXISTS (SELECT 1 FROM user_levels WHERE privy_id = p_privy_id) THEN
            -- If exists, return it
            SELECT to_jsonb(ul) INTO new_level_data FROM user_levels ul WHERE ul.privy_id = p_privy_id;
          ELSE
            -- Create new level - this will still be subject to RLS policies
            INSERT INTO user_levels (privy_id, level, updated_at)
            VALUES (p_privy_id, 1, NOW())
            RETURNING to_jsonb(user_levels.*) INTO new_level_data;
          END IF;
          
          RETURN new_level_data;
        ELSE
          RAISE EXCEPTION 'Permission denied: cannot create level for other users';
        END IF;
      END;
      $$;
      
      CREATE OR REPLACE FUNCTION public.get_row_level_security_info()
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE result jsonb; jwt_claims jsonb; BEGIN SELECT request.jwt.claims INTO jwt_claims; SELECT jsonb_build_object('current_role', current_setting('role', true), 'jwt_claims', jwt_claims, 'jwt_privy_id', jwt_claims ->> 'privy_id', 'has_profiles_access', EXISTS (SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'), 'profile_policies', (SELECT jsonb_agg(jsonb_build_object('policy_name', polname, 'cmd', polcmd, 'permissive', polpermissive, 'qual', pg_get_expr(polqual, polrelid), 'with_check', pg_get_expr(polwithcheck, polrelid))) FROM pg_policy WHERE polrelid = 'public.profiles'::regclass), 'user_levels_policies', (SELECT jsonb_agg(jsonb_build_object('policy_name', polname, 'cmd', polcmd, 'permissive', polpermissive, 'qual', pg_get_expr(polqual, polrelid), 'with_check', pg_get_expr(polwithcheck, polrelid))) FROM pg_policy WHERE polrelid = 'public.user_levels'::regclass)) INTO result; RETURN result; END; $$;
      CREATE OR REPLACE VIEW public_profiles AS SELECT id, privy_id, created_at, updated_at FROM profiles;
      GRANT SELECT ON public_profiles TO authenticated, anon, service_role;
      GRANT EXECUTE ON FUNCTION public.get_full_profile_by_id(uuid) TO authenticated, service_role, anon;
      GRANT EXECUTE ON FUNCTION public.get_full_profile(text) TO authenticated, service_role, anon;
      GRANT EXECUTE ON FUNCTION public.get_user_level(text) TO authenticated, service_role, anon;
      GRANT EXECUTE ON FUNCTION public.create_default_user_level(text) TO authenticated, service_role, anon;
      GRANT EXECUTE ON FUNCTION public.get_row_level_security_info() TO authenticated, service_role, anon;

      -- Function to get level requirements with definitions
      CREATE OR REPLACE FUNCTION public.get_level_requirements(p_level integer)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE
        result jsonb;
        level_data jsonb;
        requirements jsonb;
      BEGIN
        -- Get the level data
        SELECT to_jsonb(lr) INTO level_data
        FROM level_requirements lr
        WHERE lr.level = p_level;
        
        IF level_data IS NULL THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Level requirements not found',
            'level', p_level
          );
        END IF;
        
        -- Get the requirements with their definitions
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', rd.id,
            'requirement_key', rd.requirement_key,
            'description', rd.description,
            'requirement_type', rd.requirement_type,
            'metric_name', rd.metric_name,
            'metric_target', rd.metric_target,
            'order_index', lrm.order_index
          ) ORDER BY lrm.order_index
        )
        INTO requirements
        FROM level_requirement_mappings lrm
        JOIN requirement_definitions rd ON rd.id = lrm.requirement_id
        WHERE lrm.level_id = (level_data->>'id')::uuid;
        
        RETURN jsonb_build_object(
          'success', true,
          'level_data', level_data,
          'requirements', COALESCE(requirements, '[]'::jsonb)
        );
      END;
      $$;

      -- Function to check if a user has completed all requirements for a level
      CREATE OR REPLACE FUNCTION public.check_level_requirements(p_privy_id text, p_level integer)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE
        result jsonb;
        level_data jsonb;
        requirements jsonb;
        completed_count integer;
        total_count integer;
        completed_requirements jsonb;
        missing_requirements jsonb;
      BEGIN
        -- Get the level requirements
        SELECT public.get_level_requirements(p_level) INTO level_data;
        
        IF NOT (level_data->>'success')::boolean THEN
          RETURN level_data;
        END IF;
        
        -- Extract requirements
        requirements := level_data->'requirements';
        
        IF requirements IS NULL OR jsonb_array_length(requirements) = 0 THEN
          -- No requirements for this level
          RETURN jsonb_build_object(
            'success', true,
            'completed', true,
            'level', p_level,
            'completed_requirements', '[]'::jsonb,
            'missing_requirements', '[]'::jsonb,
            'completed_count', 0,
            'total_count', 0
          );
        END IF;
        
        -- Count completed requirements
        SELECT 
          COUNT(*) FILTER (WHERE rp.completed = true),
          COUNT(*)
        INTO 
          completed_count,
          total_count
        FROM requirement_progress rp
        JOIN requirement_definitions rd ON rd.id = rp.requirement_id
        WHERE rp.privy_id = p_privy_id
        AND rp.level = p_level;
        
        -- Get completed requirements
        SELECT jsonb_agg(
          jsonb_build_object(
            'requirement_key', rd.requirement_key,
            'description', rd.description,
            'requirement_type', rd.requirement_type,
            'completed', rp.completed,
            'completed_at', rp.completed_at,
            'metric_value', rp.metric_value,
            'metric_target', rd.metric_target
          )
        )
        INTO completed_requirements
        FROM requirement_progress rp
        JOIN requirement_definitions rd ON rd.id = rp.requirement_id
        WHERE rp.privy_id = p_privy_id
        AND rp.level = p_level
        AND rp.completed = true;
        
        -- Get missing requirements
        SELECT jsonb_agg(
          jsonb_build_object(
            'requirement_key', rd.requirement_key,
            'description', rd.description,
            'requirement_type', rd.requirement_type,
            'completed', COALESCE(rp.completed, false),
            'completed_at', rp.completed_at,
            'metric_value', COALESCE(rp.metric_value, 0),
            'metric_target', rd.metric_target
          )
        )
        INTO missing_requirements
        FROM requirement_definitions rd
        JOIN level_requirement_mappings lrm ON lrm.requirement_id = rd.id
        JOIN level_requirements lr ON lr.id = lrm.level_id
        LEFT JOIN requirement_progress rp ON rp.requirement_id = rd.id 
          AND rp.privy_id = p_privy_id 
          AND rp.level = p_level
        WHERE lr.level = p_level
        AND (rp.completed IS NULL OR rp.completed = false);
        
        -- Build result
        result := jsonb_build_object(
          'success', true,
          'completed', completed_count = total_count AND total_count > 0,
          'level', p_level,
          'completed_requirements', COALESCE(completed_requirements, '[]'::jsonb),
          'missing_requirements', COALESCE(missing_requirements, '[]'::jsonb),
          'completed_count', completed_count,
          'total_count', total_count
        );
        
        RETURN result;
      END;
      $$;

      -- Function to mark a requirement as completed
      CREATE OR REPLACE FUNCTION public.mark_requirement_completed(
        p_privy_id text,
        p_level integer,
        p_requirement_key text,
        p_metric_value integer DEFAULT NULL,
        p_completed boolean DEFAULT true
      )
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE
        result jsonb;
        requirement_id uuid;
        existing_record jsonb;
        inserted_record jsonb;
      BEGIN
        -- Get the requirement ID from the key
        SELECT id INTO requirement_id
        FROM requirement_definitions
        WHERE requirement_key = p_requirement_key;
        
        IF requirement_id IS NULL THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Requirement not found',
            'requirement_key', p_requirement_key
          );
        END IF;
        
        -- Check if the requirement exists for the user
        SELECT to_jsonb(rp) INTO existing_record
        FROM requirement_progress rp
        WHERE rp.privy_id = p_privy_id
        AND rp.level = p_level
        AND rp.requirement_id = requirement_id;
        
        IF existing_record IS NOT NULL THEN
          -- Update existing record
          UPDATE requirement_progress
          SET 
            completed = p_completed,
            completed_at = CASE WHEN p_completed THEN NOW() ELSE NULL END,
            metric_value = COALESCE(p_metric_value, metric_value),
            updated_at = NOW()
          WHERE privy_id = p_privy_id
          AND level = p_level
          AND requirement_id = requirement_id
          RETURNING to_jsonb(requirement_progress.*) INTO inserted_record;
        ELSE
          -- Insert new record
          INSERT INTO requirement_progress (
            privy_id,
            level,
            requirement_id,
            completed,
            completed_at,
            metric_value
          )
          VALUES (
            p_privy_id,
            p_level,
            requirement_id,
            p_completed,
            CASE WHEN p_completed THEN NOW() ELSE NULL END,
            COALESCE(p_metric_value, 0)
          )
          RETURNING to_jsonb(requirement_progress.*) INTO inserted_record;
        END IF;
        
        -- Check if all requirements for the level are completed
        IF p_completed THEN
          -- Call the update_user_level_if_eligible function to check if user can level up
          SELECT public.update_user_level_if_eligible(p_privy_id) INTO result;
        ELSE
          result := jsonb_build_object(
            'success', true,
            'requirement_updated', inserted_record
          );
        END IF;
        
        RETURN result;
      END;
      $$;

      -- Function to update a requirement's metric value
      CREATE OR REPLACE FUNCTION public.update_requirement_metric(
        p_privy_id text,
        p_level integer,
        p_requirement_key text,
        p_metric_value integer
      )
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE
        result jsonb;
        requirement_id uuid;
        requirement_record record;
        existing_record jsonb;
        updated_record jsonb;
      BEGIN
        -- Get the requirement ID and details from the key
        SELECT rd.* INTO requirement_record
        FROM requirement_definitions rd
        WHERE rd.requirement_key = p_requirement_key;
        
        IF requirement_record IS NULL THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Requirement not found',
            'requirement_key', p_requirement_key
          );
        END IF;
        
        -- Check if the requirement exists for the user
        SELECT to_jsonb(rp) INTO existing_record
        FROM requirement_progress rp
        WHERE rp.privy_id = p_privy_id
        AND rp.level = p_level
        AND rp.requirement_id = requirement_record.id;
        
        IF existing_record IS NOT NULL THEN
          -- Update existing record
          UPDATE requirement_progress
          SET 
            metric_value = p_metric_value,
            -- Auto-complete if metric target is met
            completed = CASE 
              WHEN requirement_record.metric_target IS NOT NULL 
              AND p_metric_value >= requirement_record.metric_target 
              THEN true 
              ELSE completed 
            END,
            completed_at = CASE 
              WHEN requirement_record.metric_target IS NOT NULL 
              AND p_metric_value >= requirement_record.metric_target 
              AND NOT completed 
              THEN NOW() 
              ELSE completed_at 
            END,
            updated_at = NOW()
          WHERE privy_id = p_privy_id
          AND level = p_level
          AND requirement_id = requirement_record.id
          RETURNING to_jsonb(requirement_progress.*) INTO updated_record;
        ELSE
          -- Insert new record
          INSERT INTO requirement_progress (
            privy_id,
            level,
            requirement_id,
            metric_value,
            completed,
            completed_at
          )
          VALUES (
            p_privy_id,
            p_level,
            requirement_record.id,
            p_metric_value,
            CASE 
              WHEN requirement_record.metric_target IS NOT NULL 
              AND p_metric_value >= requirement_record.metric_target 
              THEN true 
              ELSE false 
            END,
            CASE 
              WHEN requirement_record.metric_target IS NOT NULL 
              AND p_metric_value >= requirement_record.metric_target 
              THEN NOW() 
              ELSE NULL 
            END
          )
          RETURNING to_jsonb(requirement_progress.*) INTO updated_record;
        END IF;
        
        -- Check if requirement was completed and if user can level up
        IF (updated_record->>'completed')::boolean THEN
          SELECT public.update_user_level_if_eligible(p_privy_id) INTO result;
        ELSE
          result := jsonb_build_object(
            'success', true,
            'requirement_updated', updated_record
          );
        END IF;
        
        RETURN result;
      END;
      $$;

      -- Grant execute permissions for new functions
      GRANT EXECUTE ON FUNCTION public.update_requirement_metric(text, integer, text, integer) TO authenticated, service_role, anon;
    `;

    // Helper function to check level requirements
    const levelRequirementsHelperSql = `
      -- Function to check if a user has completed all requirements for a level
      CREATE OR REPLACE FUNCTION public.check_level_requirements(p_privy_id text, p_level integer)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE
        result jsonb;
        level_config jsonb;
        requirements jsonb;
        completed_count integer;
        total_count integer;
        completed_requirements jsonb;
        missing_requirements jsonb;
      BEGIN
        -- Get the level requirements
        SELECT requirements_config INTO level_config
        FROM level_requirements
        WHERE level = p_level;
        
        IF level_config IS NULL THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Level requirements not found',
            'level', p_level
          );
        END IF;
        
        -- Extract requirements from the config
        requirements := level_config->'levelupRequirements';
        
        IF requirements IS NULL OR jsonb_array_length(requirements) = 0 THEN
          -- No requirements for this level
          RETURN jsonb_build_object(
            'success', true,
            'completed', true,
            'level', p_level,
            'completed_requirements', '[]'::jsonb,
            'missing_requirements', '[]'::jsonb,
            'completed_count', 0,
            'total_count', 0
          );
        END IF;
        
        -- Count completed requirements
        SELECT 
          COUNT(*) FILTER (WHERE completed = true),
          COUNT(*)
        INTO 
          completed_count,
          total_count
        FROM requirement_progress
        WHERE privy_id = p_privy_id
        AND level = p_level;
        
        -- Get completed requirements
        SELECT jsonb_agg(jsonb_build_object(
          'requirement', requirement,
          'completed', completed,
          'completed_at', completed_at
        ))
        INTO completed_requirements
        FROM requirement_progress
        WHERE privy_id = p_privy_id
        AND level = p_level
        AND completed = true;
        
        -- Get missing requirements
        SELECT jsonb_agg(jsonb_build_object(
          'requirement', requirement,
          'completed', completed,
          'completed_at', completed_at
        ))
        INTO missing_requirements
        FROM requirement_progress
        WHERE privy_id = p_privy_id
        AND level = p_level
        AND completed = false;
        
        -- Build result
        result := jsonb_build_object(
          'success', true,
          'completed', completed_count = total_count AND total_count > 0,
          'level', p_level,
          'completed_requirements', COALESCE(completed_requirements, '[]'::jsonb),
          'missing_requirements', COALESCE(missing_requirements, '[]'::jsonb),
          'completed_count', completed_count,
          'total_count', total_count
        );
        
        RETURN result;
      END;
      $$;
      
      -- Function to update a user's level if all requirements are met
      CREATE OR REPLACE FUNCTION public.update_user_level_if_eligible(p_privy_id text)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE
        current_level integer;
        next_level integer;
        check_result jsonb;
        update_result jsonb;
      BEGIN
        -- Get current level
        SELECT level INTO current_level
        FROM user_levels
        WHERE privy_id = p_privy_id;
        
        IF current_level IS NULL THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'User level not found',
            'privy_id', p_privy_id
          );
        END IF;
        
        -- Check if user has completed all requirements for current level
        SELECT public.check_level_requirements(p_privy_id, current_level) INTO check_result;
        
        IF check_result->>'completed' = 'true' THEN
          -- User has completed all requirements for current level
          -- Check if there's a next level
          SELECT MIN(level) INTO next_level
          FROM level_requirements
          WHERE level > current_level;
          
          IF next_level IS NOT NULL THEN
            -- Update user level
            UPDATE user_levels
            SET level = next_level,
                updated_at = NOW()
            WHERE privy_id = p_privy_id
            RETURNING to_jsonb(user_levels.*) INTO update_result;
            
            RETURN jsonb_build_object(
              'success', true,
              'level_up', true,
              'old_level', current_level,
              'new_level', next_level,
              'user_level', update_result
            );
          ELSE
            -- User is at max level
            RETURN jsonb_build_object(
              'success', true,
              'level_up', false,
              'message', 'User is at maximum level',
              'level', current_level
            );
          END IF;
        ELSE
          -- User has not completed all requirements
          RETURN jsonb_build_object(
            'success', true,
            'level_up', false,
            'message', 'User has not completed all requirements for current level',
            'level', current_level,
            'check_result', check_result
          );
        END IF;
      END;
      $$;
      
      -- Grant execute permissions
      GRANT EXECUTE ON FUNCTION public.check_level_requirements(text, integer) TO authenticated, service_role, anon;
      GRANT EXECUTE ON FUNCTION public.update_user_level_if_eligible(text) TO authenticated, service_role, anon;
    `;

    // Function to mark a requirement as completed
    const markRequirementCompletedSql = `
      -- Function to mark a requirement as completed for a user
      CREATE OR REPLACE FUNCTION public.mark_requirement_completed(
        p_privy_id text,
        p_level integer,
        p_requirement text,
        p_completed boolean DEFAULT true
      )
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE
        result jsonb;
        existing_record jsonb;
        inserted_record jsonb;
      BEGIN
        -- Check if the requirement exists for the user
        SELECT to_jsonb(rp) INTO existing_record
        FROM requirement_progress rp
        WHERE rp.privy_id = p_privy_id
        AND rp.level = p_level
        AND rp.requirement = p_requirement;
        
        IF existing_record IS NOT NULL THEN
          -- Update existing record
          UPDATE requirement_progress
          SET 
            completed = p_completed,
            completed_at = CASE WHEN p_completed THEN NOW() ELSE NULL END,
            updated_at = NOW()
          WHERE privy_id = p_privy_id
          AND level = p_level
          AND requirement = p_requirement
          RETURNING to_jsonb(requirement_progress.*) INTO inserted_record;
        ELSE
          -- Insert new record
          INSERT INTO requirement_progress (
            privy_id,
            level,
            requirement,
            completed,
            completed_at
          )
          VALUES (
            p_privy_id,
            p_level,
            p_requirement,
            p_completed,
            CASE WHEN p_completed THEN NOW() ELSE NULL END
          )
          RETURNING to_jsonb(requirement_progress.*) INTO inserted_record;
        END IF;
        
        -- Check if all requirements for the level are completed
        IF p_completed THEN
          -- Call the update_user_level_if_eligible function to check if user can level up
          SELECT public.update_user_level_if_eligible(p_privy_id) INTO result;
        ELSE
          result := jsonb_build_object(
            'success', true,
            'requirement_updated', inserted_record
          );
        END IF;
        
        RETURN result;
      END;
      $$;
      
      -- Grant execute permissions
      GRANT EXECUTE ON FUNCTION public.mark_requirement_completed(text, integer, text, boolean) TO authenticated, service_role, anon;
    `;

    // Function to get level requirements
    const getLevelRequirementsSql = `
      -- Function to get level requirements for a specific level
      CREATE OR REPLACE FUNCTION public.get_level_requirements(p_level integer)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE
        result jsonb;
      BEGIN
        -- Get the level requirements
        SELECT to_jsonb(lr) INTO result
        FROM level_requirements lr
        WHERE lr.level = p_level;
        
        IF result IS NULL THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Level requirements not found',
            'level', p_level
          );
        END IF;
        
        RETURN jsonb_build_object(
          'success', true,
          'level_requirements', result
        );
      END;
      $$;
      
      -- Function to get next level requirements
      CREATE OR REPLACE FUNCTION public.get_next_level_requirements(p_privy_id text)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE
        result jsonb;
        current_level integer;
        next_level integer;
        next_level_requirements jsonb;
      BEGIN
        -- Get current level
        SELECT level INTO current_level
        FROM user_levels
        WHERE privy_id = p_privy_id;
        
        IF current_level IS NULL THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'User level not found',
            'privy_id', p_privy_id
          );
        END IF;
        
        -- Get next level
        SELECT MIN(level) INTO next_level
        FROM level_requirements
        WHERE level > current_level;
        
        IF next_level IS NULL THEN
          RETURN jsonb_build_object(
            'success', true,
            'message', 'User is at maximum level',
            'current_level', current_level,
            'next_level', NULL
          );
        END IF;
        
        -- Get next level requirements
        SELECT to_jsonb(lr) INTO next_level_requirements
        FROM level_requirements lr
        WHERE lr.level = next_level;
        
        RETURN jsonb_build_object(
          'success', true,
          'current_level', current_level,
          'next_level', next_level,
          'next_level_requirements', next_level_requirements
        );
      END;
      $$;
      
      -- Grant execute permissions
      GRANT EXECUTE ON FUNCTION public.get_level_requirements(integer) TO authenticated, service_role, anon;
      GRANT EXECUTE ON FUNCTION public.get_next_level_requirements(text) TO authenticated, service_role, anon;
    `;

    // After other SQL definitions, add a new SQL function to verify RLS status
    let verifyRlsSetupSql = `
      -- Create a function to check RLS status on tables
      CREATE OR REPLACE FUNCTION check_rls_status()
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE
        result jsonb;
      BEGIN
        SELECT jsonb_build_object(
          'profiles_table_exists', EXISTS(SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'),
          'user_levels_table_exists', EXISTS(SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'user_levels'),
          'level_requirements_table_exists', EXISTS(SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'level_requirements'),
          'requirement_definitions_table_exists', EXISTS(SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'requirement_definitions'),
          'level_requirement_mappings_table_exists', EXISTS(SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'level_requirement_mappings'),
          'user_discord_info_table_exists', EXISTS(SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'user_discord_info'),
          'profiles_rls_enabled', EXISTS(
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'profiles' AND rowsecurity = true
          ),
          'user_levels_rls_enabled', EXISTS(
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'user_levels' AND rowsecurity = true
          ),
          'level_requirements_rls_enabled', EXISTS(
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'level_requirements' AND rowsecurity = true
          ),
          'requirement_definitions_rls_enabled', EXISTS(
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'requirement_definitions' AND rowsecurity = true
          ),
          'level_requirement_mappings_rls_enabled', EXISTS(
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'level_requirement_mappings' AND rowsecurity = true
          ),
          'user_discord_info_rls_enabled', EXISTS(
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'user_discord_info' AND rowsecurity = true
          ),
          'auth_uid_function_exists', EXISTS(
            SELECT 1 FROM pg_proc 
            WHERE proname = 'uid' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
          ),
          'profiles_policies', (SELECT jsonb_agg(jsonb_build_object('name', polname,'cmd', polcmd,'qual', pg_get_expr(polqual, polrelid, true),'with_check', pg_get_expr(polwithcheck, polrelid, true))) FROM pg_policy WHERE polrelid = 'public.profiles'::regclass),
          'user_levels_policies', (SELECT jsonb_agg(jsonb_build_object('name', polname,'cmd', polcmd,'qual', pg_get_expr(polqual, polrelid, true),'with_check', pg_get_expr(polwithcheck, polrelid, true))) FROM pg_policy WHERE polrelid = 'public.user_levels'::regclass),
          'level_requirements_policies', (SELECT jsonb_agg(jsonb_build_object('name', polname,'cmd', polcmd,'qual', pg_get_expr(polqual, polrelid, true),'with_check', pg_get_expr(polwithcheck, polrelid, true))) FROM pg_policy WHERE polrelid = 'public.level_requirements'::regclass),
          'requirement_definitions_policies', (SELECT jsonb_agg(jsonb_build_object('name', polname,'cmd', polcmd,'qual', pg_get_expr(polqual, polrelid, true),'with_check', pg_get_expr(polwithcheck, polrelid, true))) FROM pg_policy WHERE polrelid = 'public.requirement_definitions'::regclass),
          'level_requirement_mappings_policies', (SELECT jsonb_agg(jsonb_build_object('name', polname,'cmd', polcmd,'qual', pg_get_expr(polqual, polrelid, true),'with_check', pg_get_expr(polwithcheck, polrelid, true))) FROM pg_policy WHERE polrelid = 'public.level_requirement_mappings'::regclass),
          'user_discord_info_policies', (SELECT jsonb_agg(jsonb_build_object('name', polname,'cmd', polcmd,'qual', pg_get_expr(polqual, polrelid, true),'with_check', pg_get_expr(polwithcheck, polrelid, true))) FROM pg_policy WHERE polrelid = 'public.user_discord_info'::regclass)
        ) INTO result;
        
        RETURN result;
      END;
      $$;

      GRANT EXECUTE ON FUNCTION check_rls_status() TO authenticated, anon, service_role;
    `;

    // Add a new SQL script to configure Supabase JWT settings
    const setupJwtConfigSql = `
      -- Set up JWT verification settings for Privy
      -- This assumes you've configured JWT settings in Supabase Dashboard
      
      -- Create auth schema if not exists
      CREATE SCHEMA IF NOT EXISTS auth;
      
      -- Make sure the 'authenticated' role is correctly defined
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
        
        GRANT usage ON SCHEMA public TO authenticated;
      END
      $$;
      
      -- Drop existing auth functions to avoid return type conflicts
      DROP FUNCTION IF EXISTS auth.uid();
      DROP FUNCTION IF EXISTS auth.check_privy_id();
      
      -- Create auth.uid() function to extract privy_id from JWT claims
      CREATE OR REPLACE FUNCTION auth.uid() 
      RETURNS text AS $$
      DECLARE
        privy_id text;
      BEGIN
        privy_id := nullif(current_setting('request.jwt.claims', true)::json->>'privy_id', '');
        RETURN privy_id;
      EXCEPTION WHEN others THEN
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql STABLE;
      
      -- Function to validate privy_id in JWT
      CREATE OR REPLACE FUNCTION auth.check_privy_id() 
      RETURNS boolean AS $$
      BEGIN
        RETURN auth.uid() IS NOT NULL;
      END;
      $$ LANGUAGE plpgsql STABLE;
      
      -- Grant access to JWT checking functions
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
      GRANT EXECUTE ON FUNCTION auth.check_privy_id() TO authenticated, anon, service_role;
    `;

    // Enable RLS statements
    const enableRlsStmts = [
      {
        name: 'Enable RLS on profiles',
        sql: 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;',
      },
      {
        name: 'Enable RLS on user_levels',
        sql: 'ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;',
      },
      {
        name: 'Enable RLS on nft_metadata',
        sql: 'ALTER TABLE nft_metadata ENABLE ROW LEVEL SECURITY;',
      },
      {
        name: 'Enable RLS on requirement_progress',
        sql: 'ALTER TABLE requirement_progress ENABLE ROW LEVEL SECURITY;',
      },
      {
        name: 'Enable RLS on level_requirements',
        sql: 'ALTER TABLE level_requirements ENABLE ROW LEVEL SECURITY;',
      },
      {
        name: 'Enable RLS on requirement_definitions',
        sql: 'ALTER TABLE requirement_definitions ENABLE ROW LEVEL SECURITY;',
      },
      {
        name: 'Enable RLS on level_requirement_mappings',
        sql: 'ALTER TABLE level_requirement_mappings ENABLE ROW LEVEL SECURITY;',
      },
      {
        name: 'Enable RLS on user_discord_info',
        sql: 'ALTER TABLE user_discord_info ENABLE ROW LEVEL SECURITY;',
      },
    ];

    // Profiles RLS policies
    const profilePoliciesStmts = [
      {
        name: 'Profiles SELECT policy',
        sql: `
          DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
          CREATE POLICY "Users can read their own profile"
          ON profiles FOR SELECT
          USING (auth.uid() = privy_id);
        `,
      },
      {
        name: 'Profiles INSERT policy',
        sql: `
          DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
          CREATE POLICY "Users can insert their own profile"
          ON profiles FOR INSERT
          WITH CHECK (privy_id IS NOT NULL AND auth.uid() = privy_id);
        `,
      },
      {
        name: 'Profiles UPDATE policy',
        sql: `
          DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
          CREATE POLICY "Users can update their own profile"
          ON profiles FOR UPDATE
          USING (auth.uid() = privy_id);
        `,
      },
    ];

    // User levels RLS policies
    const userLevelsPoliciesStmts = [
      {
        name: 'User levels SELECT policy',
        sql: `
          DROP POLICY IF EXISTS "Users can read their own level" ON user_levels;
          CREATE POLICY "Users can read their own level"
          ON user_levels FOR SELECT
          USING (auth.uid() = privy_id OR current_setting('role', true) = 'service_role');
        `,
      },
      {
        name: 'User levels INSERT policy',
        sql: `
          DROP POLICY IF EXISTS "Users can insert their own level" ON user_levels;
          CREATE POLICY "Users can insert their own level"
          ON user_levels FOR INSERT
          WITH CHECK (auth.uid() = privy_id);
          
          DROP POLICY IF EXISTS "Service role can manage levels" ON user_levels;
          CREATE POLICY "Service role can manage levels"
          ON user_levels FOR ALL
          USING (current_setting('role', true) = 'service_role');
        `,
      },
      {
        name: 'User levels UPDATE policy',
        sql: `
          DROP POLICY IF EXISTS "Users can update their own level" ON user_levels;
          CREATE POLICY "Users can update their own level"
          ON user_levels FOR UPDATE
          USING (auth.uid() = privy_id);
        `,
      },
    ];

    // NFT metadata RLS policies
    const nftPoliciesStmts = [
      {
        name: 'NFT SELECT policy',
        sql: `
          DROP POLICY IF EXISTS "Users can view their own NFTs" ON nft_metadata;
          CREATE POLICY "Users can view their own NFTs"
          ON nft_metadata FOR SELECT
          USING (auth.uid() = privy_id);
        `,
      },
      {
        name: 'NFT INSERT policy',
        sql: `
          DROP POLICY IF EXISTS "Authenticated users can create NFTs" ON nft_metadata;
          CREATE POLICY "Authenticated users can create NFTs"
          ON nft_metadata FOR INSERT
          WITH CHECK (auth.uid() = privy_id);
        `,
      },
      {
        name: 'NFT UPDATE policy',
        sql: `
          DROP POLICY IF EXISTS "Users can update their own NFTs" ON nft_metadata;
          CREATE POLICY "Users can update their own NFTs"
          ON nft_metadata FOR UPDATE
          USING (auth.uid() = privy_id);
        `,
      },
    ];

    // Requirements Progress RLS policies
    const requirementProgressPoliciesStmts = [
      {
        name: 'Requirement Progress SELECT policy',
        sql: `
          DROP POLICY IF EXISTS "Users can read their own requirements" ON requirement_progress;
          CREATE POLICY "Users can read their own requirements"
          ON requirement_progress FOR SELECT
          USING (auth.uid() = privy_id);
        `,
      },
      {
        name: 'Requirement Progress INSERT policy',
        sql: `
          DROP POLICY IF EXISTS "Users can insert their own requirements" ON requirement_progress;
          CREATE POLICY "Users can insert their own requirements"
          ON requirement_progress FOR INSERT
          WITH CHECK (auth.uid() = privy_id);
        `,
      },
      {
        name: 'Requirement Progress UPDATE policy',
        sql: `
          DROP POLICY IF EXISTS "Users can update their own requirements" ON requirement_progress;
          CREATE POLICY "Users can update their own requirements"
          ON requirement_progress FOR UPDATE
          USING (auth.uid() = privy_id);
        `,
      },
      {
        name: 'Requirement Progress Service Role policy',
        sql: `
          DROP POLICY IF EXISTS "Service role can manage requirements" ON requirement_progress;
          CREATE POLICY "Service role can manage requirements"
          ON requirement_progress FOR ALL
          USING (current_setting('role', true) = 'service_role');
        `,
      },
    ];

    // Level Requirements RLS policies
    const levelRequirementsPoliciesStmts = [
      {
        name: 'Level Requirements SELECT policy',
        sql: `
          DROP POLICY IF EXISTS "Anyone can read level requirements" ON level_requirements;
          CREATE POLICY "Anyone can read level requirements"
          ON level_requirements FOR SELECT
          USING (true);
        `,
      },
      {
        name: 'Level Requirements Service Role policy',
        sql: `
          DROP POLICY IF EXISTS "Service role can manage level requirements" ON level_requirements;
          CREATE POLICY "Service role can manage level requirements"
          ON level_requirements FOR ALL
          USING (current_setting('role', true) = 'service_role');
        `,
      },
    ];

    // User Discord Info RLS policies
    const userDiscordInfoPoliciesStmts = [
      {
        name: 'User Discord Info SELECT policy',
        sql: `
          DROP POLICY IF EXISTS "Users can read their own discord info" ON user_discord_info;
          CREATE POLICY "Users can read their own discord info"
          ON user_discord_info FOR SELECT
          USING (auth.uid() = privy_id);
        `,
      },
      {
        name: 'User Discord Info INSERT policy',
        sql: `
          DROP POLICY IF EXISTS "Users can insert their own discord info" ON user_discord_info;
          CREATE POLICY "Users can insert their own discord info"
          ON user_discord_info FOR INSERT
          WITH CHECK (privy_id IS NOT NULL AND auth.uid() = privy_id);
        `,
      },
      {
        name: 'User Discord Info UPDATE policy',
        sql: `
          DROP POLICY IF EXISTS "Users can update their own discord info" ON user_discord_info;
          CREATE POLICY "Users can update their own discord info"
          ON user_discord_info FOR UPDATE
          USING (auth.uid() = privy_id);
        `,
      },
      {
        name: 'User Discord Info Service Role policy',
        sql: `
          DROP POLICY IF EXISTS "Service role can manage discord info" ON user_discord_info;
          CREATE POLICY "Service role can manage discord info"
          ON user_discord_info FOR ALL
          USING (current_setting('role', true) = 'service_role');
        `,
      },
    ];

    // Add RLS policies for new tables
    const requirementDefinitionsPoliciesStmts = [
      {
        name: 'Requirement Definitions SELECT policy',
        sql: `
          DROP POLICY IF EXISTS "Anyone can read requirement definitions" ON requirement_definitions;
          CREATE POLICY "Anyone can read requirement definitions"
          ON requirement_definitions FOR SELECT
          USING (true);
        `,
      },
      {
        name: 'Requirement Definitions Service Role policy',
        sql: `
          DROP POLICY IF EXISTS "Service role can manage requirement definitions" ON requirement_definitions;
          CREATE POLICY "Service role can manage requirement definitions"
          ON requirement_definitions FOR ALL
          USING (current_setting('role', true) = 'service_role');
        `,
      },
    ];

    const levelRequirementMappingsPoliciesStmts = [
      {
        name: 'Level Requirement Mappings SELECT policy',
        sql: `
          DROP POLICY IF EXISTS "Anyone can read level requirement mappings" ON level_requirement_mappings;
          CREATE POLICY "Anyone can read level requirement mappings"
          ON level_requirement_mappings FOR SELECT
          USING (true);
        `,
      },
      {
        name: 'Level Requirement Mappings Service Role policy',
        sql: `
          DROP POLICY IF EXISTS "Service role can manage level requirement mappings" ON level_requirement_mappings;
          CREATE POLICY "Service role can manage level requirement mappings"
          ON level_requirement_mappings FOR ALL
          USING (current_setting('role', true) = 'service_role');
        `,
      },
    ];

    // Grant permissions
    const grantStmts = [
      {
        name: 'Grant profiles permissions',
        sql: `
          GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
          GRANT ALL ON profiles TO service_role;
        `,
      },
      {
        name: 'Grant user_levels permissions',
        sql: `
          GRANT SELECT, INSERT, UPDATE ON user_levels TO authenticated;
          GRANT ALL ON user_levels TO service_role;
        `,
      },
      {
        name: 'Grant nft_metadata permissions',
        sql: `
          GRANT ALL ON nft_metadata TO authenticated;
          GRANT ALL ON nft_metadata TO service_role;
        `,
      },
      {
        name: 'Grant requirement_progress permissions',
        sql: `
          GRANT SELECT, INSERT, UPDATE ON requirement_progress TO authenticated;
          GRANT ALL ON requirement_progress TO service_role;
        `,
      },
      {
        name: 'Grant level_requirements permissions',
        sql: `
          GRANT SELECT ON level_requirements TO authenticated, anon;
          GRANT ALL ON level_requirements TO service_role;
        `,
      },
      {
        name: 'Grant requirement_definitions permissions',
        sql: `
          GRANT SELECT ON requirement_definitions TO authenticated, anon;
          GRANT ALL ON requirement_definitions TO service_role;
        `,
      },
      {
        name: 'Grant level_requirement_mappings permissions',
        sql: `
          GRANT SELECT ON level_requirement_mappings TO authenticated, anon;
          GRANT ALL ON level_requirement_mappings TO service_role;
        `,
      },
      {
        name: 'Grant user_discord_info permissions',
        sql: `
          GRANT SELECT, INSERT, UPDATE ON user_discord_info TO authenticated;
          GRANT ALL ON user_discord_info TO service_role;
        `,
      },
    ];

    // --- Group Statements ---
    const schemaStatements = [
      { name: 'Shared Function SQL', sql: sharedFunctionSql },
      { name: 'Requirement Definitions Schema SQL', sql: requirementDefinitionsSchemaSql },
      { name: 'User Levels Schema SQL', sql: userLevelsSchemaSql },
      { name: 'Requirements Progress Schema SQL', sql: requirementsProgressSchemaSql },
      { name: 'Level Requirements Schema SQL', sql: levelRequirementsSchemaSql },
      { name: 'Onboarding Schema SQL', sql: onboardingSchemaSql },
      { name: 'Auth Cleanup SQL', sql: authCleanupSql },
      { name: 'NFT Schema SQL', sql: nftSchemaSql },
      { name: 'User Discord Info Schema SQL', sql: userDiscordInfoSchemaSql },
      { name: 'Functions Schema SQL', sql: functionsSchemaSql },
      { name: 'Level Requirements Helper SQL', sql: levelRequirementsHelperSql },
      { name: 'Mark Requirement Completed SQL', sql: markRequirementCompletedSql },
      { name: 'Get Level Requirements SQL', sql: getLevelRequirementsSql },
      { name: 'Verification Functions SQL', sql: verifyRlsSetupSql },
      { name: 'JWT Configuration', sql: setupJwtConfigSql },
    ];

    const rlsStatements = [
      ...enableRlsStmts,
      ...profilePoliciesStmts,
      ...userLevelsPoliciesStmts,
      ...nftPoliciesStmts,
      ...requirementProgressPoliciesStmts,
      ...levelRequirementsPoliciesStmts,
      ...requirementDefinitionsPoliciesStmts,
      ...levelRequirementMappingsPoliciesStmts,
      ...userDiscordInfoPoliciesStmts,
      ...grantStmts,
    ];

    // --- Stage 1: Execute Schema Statements ---
    console.log('\n--- Stage 1: Applying Schema and Functions ---');
    for (const { name, sql } of schemaStatements) {
      console.log(`Executing ${name}...`);
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error(`Error executing ${name}:`, error.message);

        // Special handling for JWT Configuration errors
        if (
          name === 'JWT Configuration' &&
          error.message.includes('cannot drop function auth.uid()')
        ) {
          console.warn('JWT Configuration already exists. Skipping this step.');
          console.warn('This is normal if the auth.uid() function is already in use.');
        } else {
          // For other errors, stop execution
          console.error('Stopping script due to schema error.');
          process.exit(1);
        }
      } else {
        console.log(`${name} executed successfully.`);
      }
    }
    console.log('✅ Schema and functions setup complete.');

    // --- Stage 2: Execute RLS Statements ---
    console.log(
      '\n--- Stage 2: Applying RLS Policies (Expect potential warnings if JWT context is missing) ---'
    );
    let anyRlsErrors = false;

    for (const { name, sql } of rlsStatements) {
      console.log(`Executing ${name}...`);
      try {
        // For RLS, let's try direct execution if possible - more reliable for policy creation
        const { error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
          // There are expected errors with JWT context, but let's distinguish them from other errors
          if (error.message.includes('jwt') || error.message.includes('request.jwt.claims')) {
            console.warn(`⚠️ Expected JWT-related warning in ${name}:`, error.message);
            console.warn(`   This is normal when running setup without an actual JWT.`);
            console.warn(`   Policies are likely still created correctly.`);
          } else {
            console.error(`❌ Unexpected error in ${name}:`, error.message);
            anyRlsErrors = true;
          }
        } else {
          console.log(`✅ ${name} executed successfully.`);
        }
      } catch (directError) {
        console.error(`❌ Failed to execute ${name}:`, directError);
        anyRlsErrors = true;
      }
    }

    if (anyRlsErrors) {
      console.warn(
        '⚠️ There were non-JWT related errors during RLS policy setup. Some policies may not be applied correctly.'
      );
    } else {
      console.log('✅ RLS policy application complete - JWT warnings are expected and normal.');
    }

    // --- Stage 3: Verify Everything Was Set Up Correctly ---
    console.log('\n--- Stage 3: Verifying Setup ---');
    try {
      // Check for RLS status function using a simpler approach
      const { data: statusCheck, error: statusCheckError } = await supabase.rpc('check_rls_status');

      if (statusCheckError) {
        console.log('⚠️ RLS status check function not available: ', statusCheckError.message);
        console.log(
          'This is normal on first run. Run the setup script again to create this function.'
        );

        // Continue to check tables directly
        const { data: tableCheck, error: tableCheckError } = await supabase
          .from('pg_tables')
          .select('tablename, rowsecurity')
          .in('tablename', [
            'profiles',
            'user_levels',
            'level_requirements',
            'requirement_definitions',
            'level_requirement_mappings',
            'user_discord_info',
          ])
          .eq('schemaname', 'public');

        if (tableCheckError) {
          console.error('❌ Could not check tables:', tableCheckError.message);
        } else if (tableCheck) {
          console.log('Manual table check:');
          const profilesTable = tableCheck.find((t) => t.tablename === 'profiles');
          const userLevelsTable = tableCheck.find((t) => t.tablename === 'user_levels');
          const levelRequirementsTable = tableCheck.find(
            (t) => t.tablename === 'level_requirements'
          );
          const requirementDefinitionsTable = tableCheck.find(
            (t) => t.tablename === 'requirement_definitions'
          );
          const levelRequirementMappingsTable = tableCheck.find(
            (t) => t.tablename === 'level_requirement_mappings'
          );
          const userDiscordInfoTable = tableCheck.find((t) => t.tablename === 'user_discord_info');

          console.log(`   Profiles table exists: ${profilesTable ? 'Yes ✓' : 'No ❌'}`);
          console.log(`   User levels table exists: ${userLevelsTable ? 'Yes ✓' : 'No ❌'}`);
          console.log(
            `   Level requirements table exists: ${levelRequirementsTable ? 'Yes ✓' : 'No ❌'}`
          );
          console.log(
            `   Requirement definitions table exists: ${requirementDefinitionsTable ? 'Yes ✓' : 'No ❌'}`
          );
          console.log(
            `   Level requirement mappings table exists: ${levelRequirementMappingsTable ? 'Yes ✓' : 'No ❌'}`
          );
          console.log(
            `   User Discord Info table exists: ${userDiscordInfoTable ? 'Yes ✓' : 'No ❌'}`
          );

          if (profilesTable) {
            console.log(
              `   Profiles RLS enabled: ${profilesTable.rowsecurity ? 'Yes ✓' : 'No ❌'}`
            );
          }

          if (userLevelsTable) {
            console.log(
              `   User levels RLS enabled: ${userLevelsTable.rowsecurity ? 'Yes ✓' : 'No ❌'}`
            );
          }

          if (levelRequirementsTable) {
            console.log(
              `   Level requirements RLS enabled: ${levelRequirementsTable.rowsecurity ? 'Yes ✓' : 'No ❌'}`
            );
          }

          if (requirementDefinitionsTable) {
            console.log(
              `   Requirement definitions RLS enabled: ${requirementDefinitionsTable.rowsecurity ? 'Yes ✓' : 'No ❌'}`
            );
          }

          if (levelRequirementMappingsTable) {
            console.log(
              `   Level requirement mappings RLS enabled: ${levelRequirementMappingsTable.rowsecurity ? 'Yes ✓' : 'No ❌'}`
            );
          }

          if (userDiscordInfoTable) {
            console.log(
              `   User Discord Info RLS enabled: ${userDiscordInfoTable.rowsecurity ? 'Yes ✓' : 'No ❌'}`
            );
          }
        }

        // Check if auth.uid() function exists
        try {
          const { error: authFnCheckError } = await supabase.rpc('exec_sql', {
            sql: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'uid' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth'))",
          });

          if (authFnCheckError) {
            console.log(
              `   auth.uid() function exists: Unknown ❓ (error checking: ${authFnCheckError.message})`
            );
          } else {
            console.log(`   auth.uid() function check: Success ✓`);
          }
        } catch (err) {
          console.log(`   auth.uid() function check: Error ❌ (${err})`);
        }
      } else if (statusCheck) {
        // Function exists, show detailed output
        console.log('✅ Tables and RLS Status:');
        console.log(
          `   Profiles table exists: ${statusCheck.profiles_table_exists ? 'Yes ✓' : 'No ❌'}`
        );
        console.log(
          `   User levels table exists: ${statusCheck.user_levels_table_exists ? 'Yes ✓' : 'No ❌'}`
        );
        console.log(
          `   Level requirements table exists: ${statusCheck.level_requirements_table_exists ? 'Yes ✓' : 'No ❌'}`
        );
        console.log(
          `   Requirement definitions table exists: ${statusCheck.requirement_definitions_table_exists ? 'Yes ✓' : 'No ❌'}`
        );
        console.log(
          `   Level requirement mappings table exists: ${statusCheck.level_requirement_mappings_table_exists ? 'Yes ✓' : 'No ❌'}`
        );
        console.log(
          `   User Discord Info table exists: ${statusCheck.user_discord_info_table_exists ? 'Yes ✓' : 'No ❌'}`
        );
        console.log(
          `   Profiles RLS enabled: ${statusCheck.profiles_rls_enabled ? 'Yes ✓' : 'No ❌'}`
        );
        console.log(
          `   User levels RLS enabled: ${statusCheck.user_levels_rls_enabled ? 'Yes ✓' : 'No ❌'}`
        );
        console.log(
          `   Level requirements RLS enabled: ${statusCheck.level_requirements_rls_enabled ? 'Yes ✓' : 'No ❌'}`
        );
        console.log(
          `   Requirement definitions RLS enabled: ${statusCheck.requirement_definitions_rls_enabled ? 'Yes ✓' : 'No ❌'}`
        );
        console.log(
          `   Level requirement mappings RLS enabled: ${statusCheck.level_requirement_mappings_rls_enabled ? 'Yes ✓' : 'No ❌'}`
        );
        console.log(
          `   User Discord Info RLS enabled: ${statusCheck.user_discord_info_rls_enabled ? 'Yes ✓' : 'No ❌'}`
        );

        // Check policy counts
        const profilePolicies = statusCheck.profiles_policies || [];
        const userLevelsPolicies = statusCheck.user_levels_policies || [];
        const levelRequirementsPolicies = statusCheck.level_requirements_policies || [];
        const requirementDefinitionsPolicies = statusCheck.requirement_definitions_policies || [];
        const levelRequirementMappingsPolicies =
          statusCheck.level_requirement_mappings_policies || [];
        const userDiscordInfoPolicies = statusCheck.user_discord_info_policies || [];

        console.log(
          `   Profiles has ${profilePolicies.length} policies: ${profilePolicies.length >= 3 ? 'Good ✓' : 'Not enough ❌'}`
        );
        console.log(
          `   User levels has ${userLevelsPolicies.length} policies: ${userLevelsPolicies.length >= 4 ? 'Good ✓' : 'Not enough ❌'}`
        );
        console.log(
          `   Level requirements has ${levelRequirementsPolicies.length} policies: ${levelRequirementsPolicies.length >= 2 ? 'Good ✓' : 'Not enough ❌'}`
        );
        console.log(
          `   Requirement definitions has ${requirementDefinitionsPolicies.length} policies: ${requirementDefinitionsPolicies.length >= 2 ? 'Good ✓' : 'Not enough ❌'}`
        );
        console.log(
          `   Level requirement mappings has ${levelRequirementMappingsPolicies.length} policies: ${levelRequirementMappingsPolicies.length >= 2 ? 'Good ✓' : 'Not enough ❌'}`
        );
        console.log(
          `   User Discord Info has ${userDiscordInfoPolicies.length} policies: ${userDiscordInfoPolicies.length >= 4 ? 'Good ✓' : 'Not enough ❌'}`
        );

        // Determine overall status
        const hasAllTables =
          statusCheck.profiles_table_exists &&
          statusCheck.user_levels_table_exists &&
          statusCheck.level_requirements_table_exists &&
          statusCheck.requirement_definitions_table_exists &&
          statusCheck.level_requirement_mappings_table_exists &&
          statusCheck.user_discord_info_table_exists;
        const hasRlsEnabled =
          statusCheck.profiles_rls_enabled &&
          statusCheck.user_levels_rls_enabled &&
          statusCheck.level_requirements_rls_enabled &&
          statusCheck.requirement_definitions_rls_enabled &&
          statusCheck.level_requirement_mappings_rls_enabled &&
          statusCheck.user_discord_info_rls_enabled;
        const hasEnoughPolicies =
          profilePolicies.length >= 3 &&
          userLevelsPolicies.length >= 4 &&
          levelRequirementsPolicies.length >= 2 &&
          requirementDefinitionsPolicies.length >= 2 &&
          levelRequirementMappingsPolicies.length >= 2 &&
          userDiscordInfoPolicies.length >= 4;
        const hasAuthFunction = statusCheck.auth_uid_function_exists;

        if (hasAllTables && hasRlsEnabled && hasEnoughPolicies && hasAuthFunction) {
          console.log(
            '\n✅ SETUP SUCCESSFUL: Database schema and RLS appear to be correctly configured.'
          );
          console.log('   Run the test-jwt-auth.ts script to verify everything works together.');
        } else {
          console.log(
            '\n⚠️ SETUP INCOMPLETE: Some aspects of the setup may not be correctly configured.'
          );
          console.log('   Review the issues above and fix them before running tests.');
          console.log('   Consider running setup-db.ts again to fix any missing components.');
        }
      }
    } catch (error) {
      console.error('❌ Error during verification:', error);
    }

    // Check JWT Config (This should always run)
    console.log('\n✅ JWT Configuration:');
    console.log('   JWT checking was configured - validation happens in Supabase');
    console.log(
      '   IMPORTANT: Ensure SUPABASE_JWT_SECRET in .env matches JWT Secret in Supabase Dashboard > Settings > API'
    );
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
