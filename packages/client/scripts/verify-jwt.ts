import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import * as jose from 'jose';

// Load environment variables from root .env file
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
config({ path: rootEnvPath });

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const jwtSecret = process.env.VITE_SUPABASE_JWT_SECRET;

// Check if we have all required environment variables
if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey || !jwtSecret) {
  console.error('Error: Missing Supabase environment variables.');
  console.error(
    'Please ensure VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_KEY, VITE_SUPABASE_ANON_KEY, and SUPABASE_JWT_SECRET are set in the root .env file.'
  );
  process.exit(1);
}

// Admin client for setup operations (uses service key)
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

// Color constants for nice output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bright: '\x1b[1m',
};

async function createMockJwt(claims: any) {
  const secret = new TextEncoder().encode(jwtSecret);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60; // 1 hour

  const jwt = await new jose.SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setAudience('authenticated')
    .sign(secret);

  return jwt;
}

async function main() {
  console.log(
    `${colors.bright}${colors.blue}Verifying JWT Authentication & RLS Policies${colors.reset}`
  );
  console.log(`Supabase URL: ${supabaseUrl}`);

  // Verify keys are different
  if (supabaseServiceKey === supabaseAnonKey) {
    console.error(`${colors.red}ERROR: Service key and anon key are identical!${colors.reset}`);
    console.error(`RLS tests will fail because the anon key will bypass RLS policies.`);
    process.exit(1);
  }

  console.log(`Service key and anon key are different: ${colors.green}✓${colors.reset}`);

  // Generate a test JWT for a fictional user
  const testId = `test-privy-id-${Date.now()}`;
  console.log(`\nGenerating test JWT for privy_id: ${testId}`);

  const jwt = await createMockJwt({
    privy_id: testId,
    role: 'authenticated',
  });

  console.log(`JWT: ${jwt.substring(0, 20)}...`);
  console.log(`JWT Secret: ${jwtSecret}`);

  // Create test client with JWT
  const testClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
  });

  // TEST 1: Check if RLS is enabled
  console.log(`\n${colors.bright}TEST 1: Verifying RLS Status${colors.reset}`);

  try {
    const { data: status, error } = await adminClient.rpc('check_rls_status');

    if (error) {
      console.error(`${colors.red}Error checking RLS status: ${error.message}${colors.reset}`);
    } else {
      const profiles_enabled = status?.profiles_rls_enabled;
      const user_levels_enabled = status?.user_levels_rls_enabled;

      console.log(
        `Profiles RLS: ${profiles_enabled ? colors.green + '✓ Enabled' : colors.red + '✗ Disabled'}${colors.reset}`
      );
      console.log(
        `User Levels RLS: ${user_levels_enabled ? colors.green + '✓ Enabled' : colors.red + '✗ Disabled'}${colors.reset}`
      );

      if (!profiles_enabled || !user_levels_enabled) {
        console.error(
          `${colors.red}ERROR: RLS is not enabled on all tables. Run setup-db.ts again.${colors.reset}`
        );
      }
    }
  } catch (e) {
    console.error(`${colors.red}Error: ${e}${colors.reset}`);
  }

  // TEST 2: Create test data for ourselves (should succeed)
  console.log(
    `\n${colors.bright}TEST 2: Creating profile for our privy_id (should succeed)${colors.reset}`
  );

  try {
    const { data: insertData, error: insertError } = await testClient
      .from('profiles')
      .insert({
        privy_id: testId,
        full_name: 'JWT Test User',
        email: 'test@example.com',
        project_name: 'JWT Test',
        project_description: 'Test Description',
        project_vision: 'Test Vision',
        scientific_references: 'Test References',
        credential_links: 'Test Links',
        team_members: 'Test Team',
        motivation: 'Test Motivation',
        progress: 'Test Progress',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(
        `${colors.red}Failed to insert own profile: ${insertError.message}${colors.reset}`
      );
      if (insertError.message.includes('violates unique constraint')) {
        console.log(
          `${colors.yellow}This might be due to a previous test. Try with a different privy_id.${colors.reset}`
        );
      }
    } else {
      console.log(`${colors.green}Successfully created profile: ${insertData.id}${colors.reset}`);
    }
  } catch (e) {
    console.error(`${colors.red}Error: ${e}${colors.reset}`);
  }

  // TEST 3: Create test data for someone else (should fail)
  console.log(
    `\n${colors.bright}TEST 3: Creating profile for different privy_id (should fail)${colors.reset}`
  );

  try {
    const otherTestId = `test-privy-id-other-${Date.now()}`;
    const { data: insertOtherData, error: insertOtherError } = await testClient
      .from('profiles')
      .insert({
        privy_id: otherTestId, // Different from our JWT
        full_name: 'Other Test User',
        email: 'other@example.com',
        project_name: 'Other Test',
        project_description: 'Other Description',
        project_vision: 'Other Vision',
        scientific_references: 'Other References',
        credential_links: 'Other Links',
        team_members: 'Other Team',
        motivation: 'Other Motivation',
        progress: 'Other Progress',
      });

    if (insertOtherError) {
      console.log(
        `${colors.green}RLS correctly blocked insert for different privy_id: ${insertOtherError.message}${colors.reset}`
      );
    } else {
      console.error(
        `${colors.red}ERROR: RLS failed - was able to insert profile for different privy_id!${colors.reset}`
      );
      console.error(`This indicates that RLS policies are not correctly enforced.`);
    }
  } catch (e) {
    console.error(`${colors.red}Error: ${e}${colors.reset}`);
  }

  // Cleanup
  console.log(`\n${colors.bright}Cleaning up test data${colors.reset}`);
  try {
    await adminClient.from('profiles').delete().eq('privy_id', testId);
    console.log(`${colors.green}Test data cleanup complete${colors.reset}`);
  } catch (e) {
    console.error(`${colors.red}Cleanup error: ${e}${colors.reset}`);
  }

  console.log(`\n${colors.bright}${colors.blue}Verification Complete${colors.reset}`);
}

// Execute the main function
main().catch((error) => {
  console.error(`${colors.red}Unhandled error: ${error}${colors.reset}`);
  process.exit(1);
});
