import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import * as jose from 'jose'; // Using jose for JWT generation

// Log utilities with colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// Log utilities
const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ️ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg: string) =>
    console.log(`\n${colors.bgBlue}${colors.white}${colors.bright} ${msg} ${colors.reset}\n`),
  section: (msg: string) =>
    console.log(`\n${colors.magenta}${colors.bright}🔷 ${msg}${colors.reset}`),
  detail: (msg: string) => console.log(`  ${colors.dim}${msg}${colors.reset}`),
  jsonDetail: (label: string, obj: any) =>
    console.log(
      `  ${colors.yellow}${label}:${colors.reset} ${colors.dim}${JSON.stringify(obj, null, 2).replace(/\n/g, '\n  ')}${colors.reset}`
    ),
};

// Load environment variables from root .env file
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
config({ path: rootEnvPath });

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const jwtSecret = process.env.VITE_SUPABASE_JWT_SECRET; // IMPORTANT: Add this to your root .env

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey || !jwtSecret) {
  log.error('Missing Supabase environment variables.');
  log.error(
    'Please ensure VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_KEY, VITE_SUPABASE_ANON_KEY, and VITE_SUPABASE_JWT_SECRET are set in the root .env file.'
  );
  process.exit(1);
}

// Validate keys are different
if (supabaseServiceKey === supabaseAnonKey) {
  log.error('⛔ SECURITY ISSUE: Service key and Anon key are identical!');
  log.error('These should be different keys - RLS tests will fail otherwise.');
  log.warning('Continuing tests, but expect failures in RLS policy tests...');
}

// --- Mock JWT Generation ---
async function createMockJwt(
  privyId: string,
  role: string = 'authenticated',
  expMinutes: number = 60
): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expMinutes * 60;

  const claims = {
    privy_id: privyId,
    role: role,
    aud: 'authenticated',
    sub: privyId, // Adding standard sub claim which Supabase often expects
    exp: exp,
    // Add any other claims your RLS might depend on
  };

  log.detail(`Creating JWT with claims: ${JSON.stringify(claims)}`);

  const jwt = await new jose.SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setAudience('authenticated') // Standard Supabase audience
    .sign(secret);

  return jwt;
}

// --- Supabase Client Initialization ---
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function getSupabaseClientWithJwt(privyId: string): Promise<SupabaseClient> {
  const jwt = await createMockJwt(privyId);
  log.detail(`JWT generated for privy_id: ${privyId} (first 20 chars: ${jwt.substring(0, 20)}...)`);

  // Validate we're using anon key
  if (supabaseAnonKey === supabaseServiceKey) {
    log.warning(`⚠️ Creating client for ${privyId} with service key because anon key is the same!`);
  } else {
    log.detail(`Creating Supabase client for ${privyId} with anon key`);
  }

  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
  });
}

// --- Test Utilities ---
async function cleanupTestData(adminClient: SupabaseClient, privyId1: string, privyId2: string) {
  log.section(`Cleaning up test data for ${privyId1} and ${privyId2}...`);

  const deleteAndLog = async (table: string, privyId: string) => {
    const { error } = await adminClient.from(table).delete().eq('privy_id', privyId);
    if (error) {
      log.error(`Failed to delete ${table} data for ${privyId}: ${error.message}`);
      return false;
    }
    log.detail(`Deleted ${table} data for ${privyId}`);
    return true;
  };

  const tables = ['profiles', 'user_levels'];
  const privyIds = [privyId1, privyId2];

  let success = true;
  for (const table of tables) {
    for (const privyId of privyIds) {
      success = (await deleteAndLog(table, privyId)) && success;
    }
  }

  if (success) {
    log.success('Cleanup completed successfully');
  } else {
    log.warning('Cleanup completed with some errors (see above)');
  }
}

async function runTest(description: string, testFn: () => Promise<boolean>) {
  process.stdout.write(`${colors.cyan}🧪 Testing:${colors.reset} ${description}... `);

  const startTime = Date.now();
  try {
    const success = await testFn();
    const duration = Date.now() - startTime;

    if (success) {
      console.log(
        `${colors.green}✅ PASSED${colors.reset} ${colors.dim}(${duration}ms)${colors.reset}`
      );
    } else {
      console.log(
        `${colors.red}❌ FAILED${colors.reset} ${colors.dim}(${duration}ms)${colors.reset}`
      );
    }
    return success;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(
      `${colors.red}❌ FAILED${colors.reset} ${colors.dim}(${duration}ms)${colors.reset}`
    );
    console.log(`  ${colors.red}Error: ${error.message || error}${colors.reset}`);

    // If it's a Supabase error, show more details
    if (error.code || error.details || error.hint) {
      log.jsonDetail('Error Details', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      });
    }

    return false;
  }
}

// --- Test Suite ---
async function runTests() {
  const testPrivyId1 = `test-privy-id-${Date.now()}`;
  const testPrivyId2 = `test-privy-id-${Date.now() + 1}`;
  let overallSuccess = true;

  log.header('JWT Auth RLS Test Suite');

  log.section('Configuration');
  log.detail(`User 1: ${testPrivyId1}`);
  log.detail(`User 2: ${testPrivyId2}`);
  log.detail(`Supabase URL: ${supabaseUrl}`);

  // Key security check - show only first/last few chars
  const maskKey = (key: string | undefined) => {
    if (!key) return 'undefined';
    if (key.length <= 10) return 'too_short_to_mask';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  log.detail(`Supabase Anon Key: ${maskKey(supabaseAnonKey)}`);
  log.detail(`Supabase Service Key: ${maskKey(supabaseServiceKey)}`);
  log.detail(`JWT Secret: ${maskKey(jwtSecret)}`);

  // Add a clear warning if both keys appear to be the same
  if (supabaseAnonKey === supabaseServiceKey) {
    log.error('⚠️ SECURITY WARNING: Anon key and Service key appear to be identical!');
    log.error('This will likely cause RLS policy tests to fail as service key bypasses RLS.');
  }

  log.section('Creating test clients');
  const client1 = await getSupabaseClientWithJwt(testPrivyId1);
  const client2 = await getSupabaseClientWithJwt(testPrivyId2);

  // --- Profiles Tests ---
  log.header('Testing profiles table');

  let profileId1: string | null = null;

  overallSuccess &&= await runTest('User 1 can insert own profile', async () => {
    const profile = {
      privy_id: testPrivyId1,
      full_name: 'Test User One',
      email: 'test1@example.com',
      project_name: 'Project 1',
      project_description: 'Desc 1',
      project_vision: 'Vision 1',
      scientific_references: 'Ref 1',
      credential_links: 'Link 1',
      team_members: 'Team 1',
      motivation: 'Motiv 1',
      progress: 'Prog 1',
    };

    log.detail(`Inserting profile for ${testPrivyId1}`);
    const { data, error } = await client1.from('profiles').insert(profile).select('id').single();

    if (error) {
      log.error(`Insert failed: ${error.message}`);
      return false;
    }

    profileId1 = data?.id;
    log.detail(`Created profile with ID: ${profileId1}`);
    return !!profileId1;
  });

  overallSuccess &&= await runTest('User 1 CANNOT insert profile for User 2', async () => {
    const profile = {
      privy_id: testPrivyId2, // Trying to insert for someone else
      full_name: 'Test User Two Attempt',
      email: 'test2-fail@example.com',
      project_name: 'Project 2 Fail',
      project_description: 'Desc 2 Fail',
      project_vision: 'Vision 2 Fail',
      scientific_references: 'Ref 2 Fail',
      credential_links: 'Link 2 Fail',
      team_members: 'Team 2 Fail',
      motivation: 'Motiv 2 Fail',
      progress: 'Prog 2 Fail',
    };

    log.detail(`Attempting to insert profile for ${testPrivyId2} using client1 (should fail)`);
    const { data, error } = await client1.from('profiles').insert(profile);

    if (error) {
      log.detail(`Got expected error: ${error.message}`);
      return true;
    } else if (data) {
      log.error(`RLS Policy Failure: Insert succeeded when it should have been blocked!`);
      log.jsonDetail('Inserted data', data);
      return false;
    }

    return !!error; // Expecting an RLS error
  });

  overallSuccess &&= await runTest('User 1 can select own profile', async () => {
    log.detail(`Selecting profile for ${testPrivyId1}`);
    const { data, error } = await client1
      .from('profiles')
      .select('*')
      .eq('privy_id', testPrivyId1)
      .maybeSingle();

    if (error) {
      log.error(`Select failed: ${error.message}`);
      return false;
    }

    if (!data) {
      log.error('No profile found');
      return false;
    }

    log.detail(`Retrieved profile: ${data.full_name}`);
    return data?.privy_id === testPrivyId1;
  });

  overallSuccess &&= await runTest("User 1 CANNOT select User 2's profile", async () => {
    // First, User 2 needs a profile (inserted by admin or user 2)
    log.detail(`Admin: Creating profile for ${testPrivyId2} (setup step)`);
    const { data: adminInsertData, error: adminInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        privy_id: testPrivyId2,
        full_name: 'Test User Two Admin',
        email: 'test2-admin@example.com',
        project_name: 'Project 2 Admin',
        project_description: 'Desc 2 Admin',
        project_vision: 'Vision 2 Admin',
        scientific_references: 'Ref 2 Admin',
        credential_links: 'Link 2 Admin',
        team_members: 'Team 2 Admin',
        motivation: 'Motiv 2 Admin',
        progress: 'Prog 2 Admin',
      })
      .select('id')
      .single();

    if (adminInsertError) {
      log.error(`Admin setup failed: ${adminInsertError.message}`);
      return false;
    }

    log.detail(`Admin created profile for User 2 with ID: ${adminInsertData?.id}`);

    // Now try selecting as User 1
    log.detail(`User 1 attempting to select User 2's profile (should fail or return empty)`);
    const { data, error } = await client1.from('profiles').select('*').eq('privy_id', testPrivyId2);

    if (error) {
      log.detail(`Got error: ${error.message}`);
      return false; // We expect empty result, not an error
    }

    if (data && data.length > 0) {
      log.error(`RLS Policy Failure: User 1 could see User 2's profile!`);
      log.jsonDetail('Retrieved data', data);
      return false;
    }

    log.detail('Got expected empty result due to RLS');
    return data.length === 0; // Should return empty because RLS prevents seeing it
  });

  overallSuccess &&= await runTest('User 1 can update own profile', async () => {
    const newName = 'Test User One Updated';
    log.detail(`Updating ${testPrivyId1}'s name to "${newName}"`);

    const { data, error } = await client1
      .from('profiles')
      .update({
        full_name: newName,
      })
      .eq('privy_id', testPrivyId1)
      .select()
      .single();

    if (error) {
      log.error(`Update failed: ${error.message}`);
      return false;
    }

    log.detail(`Updated profile: ${data?.full_name}`);
    return data?.full_name === newName;
  });

  overallSuccess &&= await runTest("User 1 CANNOT update User 2's profile", async () => {
    log.detail(`User 1 attempting to update User 2's profile (should fail or return empty result)`);
    const { data, error } = await client1
      .from('profiles')
      .update({
        full_name: 'Update Attempt Fail',
      })
      .eq('privy_id', testPrivyId2)
      .select();

    if (error) {
      log.detail(`Got error: ${error.message}`);
      return false; // We expect empty result, not an error
    }

    if (data && data.length > 0) {
      log.error(`RLS Policy Failure: User 1 could update User 2's profile!`);
      log.jsonDetail('Updated data', data);
      return false;
    }

    log.detail('Got expected empty result due to RLS');
    return data.length === 0; // Should return empty because RLS prevents update
  });

  // --- User Levels Tests ---
  log.header('Testing user_levels table');

  let userLevelId1: string | null = null;

  overallSuccess &&= await runTest('User 1 can insert own user_level', async () => {
    log.detail(`Inserting user_level for ${testPrivyId1}`);
    const { data, error } = await client1
      .from('user_levels')
      .insert({
        privy_id: testPrivyId1,
        level: 1,
      })
      .select('id')
      .single();

    if (error) {
      log.error(`Insert failed: ${error.message}`);
      return false;
    }

    userLevelId1 = data?.id;
    log.detail(`Created user_level with ID: ${userLevelId1}`);
    return !!userLevelId1;
  });

  overallSuccess &&= await runTest('User 1 CANNOT insert user_level for User 2', async () => {
    log.detail(`Attempting to insert user_level for ${testPrivyId2} using client1 (should fail)`);
    const { data, error } = await client1.from('user_levels').insert({
      privy_id: testPrivyId2, // Trying for someone else
      level: 1,
    });

    if (error) {
      log.detail(`Got expected error: ${error.message}`);
      return true;
    } else if (data) {
      log.error(`RLS Policy Failure: Insert succeeded when it should have been blocked!`);
      log.jsonDetail('Inserted data', data);
      return false;
    }

    return !!error; // Expecting RLS error
  });

  overallSuccess &&= await runTest('User 1 can select own user_level', async () => {
    log.detail(`Selecting user_level for ${testPrivyId1}`);
    const { data, error } = await client1
      .from('user_levels')
      .select('*')
      .eq('privy_id', testPrivyId1)
      .maybeSingle();

    if (error) {
      log.error(`Select failed: ${error.message}`);
      return false;
    }

    if (!data) {
      log.error('No user_level found');
      return false;
    }

    log.detail(`Retrieved user_level: level ${data.level}`);
    return data?.privy_id === testPrivyId1 && data?.level === 1;
  });

  overallSuccess &&= await runTest("User 1 CANNOT select User 2's user_level", async () => {
    // User 2 needs a level entry
    log.detail(`Admin: Creating user_level for ${testPrivyId2} (setup step)`);
    const { data: adminInsertData, error: adminInsertError } = await supabaseAdmin
      .from('user_levels')
      .insert({
        privy_id: testPrivyId2,
        level: 2,
      })
      .select('id')
      .single();

    if (adminInsertError) {
      log.error(`Admin setup failed: ${adminInsertError.message}`);
      return false;
    }

    log.detail(`Admin created user_level for User 2 with ID: ${adminInsertData?.id}`);

    // Now try selecting as User 1
    log.detail(`User 1 attempting to select User 2's user_level (should fail or return empty)`);
    const { data, error } = await client1
      .from('user_levels')
      .select('*')
      .eq('privy_id', testPrivyId2);

    if (error) {
      log.detail(`Got error: ${error.message}`);
      return false; // We expect empty result, not an error
    }

    if (data && data.length > 0) {
      log.error(`RLS Policy Failure: User 1 could see User 2's user_level!`);
      log.jsonDetail('Retrieved data', data);
      return false;
    }

    log.detail('Got expected empty result due to RLS');
    return data.length === 0; // RLS prevents seeing it
  });

  overallSuccess &&= await runTest('User 1 can update own user_level', async () => {
    log.detail(`Updating ${testPrivyId1}'s level to 2`);
    const { data, error } = await client1
      .from('user_levels')
      .update({
        level: 2,
      })
      .eq('privy_id', testPrivyId1)
      .select()
      .single();

    if (error) {
      log.error(`Update failed: ${error.message}`);
      return false;
    }

    log.detail(`Updated user_level: level ${data?.level}`);
    return data?.level === 2;
  });

  overallSuccess &&= await runTest("User 1 CANNOT update User 2's user_level", async () => {
    log.detail(`User 1 attempting to update User 2's user_level (should fail or return empty)`);
    const { data, error } = await client1
      .from('user_levels')
      .update({
        level: 3,
      })
      .eq('privy_id', testPrivyId2)
      .select();

    if (error) {
      log.detail(`Got error: ${error.message}`);
      return false; // We expect empty result, not an error
    }

    if (data && data.length > 0) {
      log.error(`RLS Policy Failure: User 1 could update User 2's user_level!`);
      log.jsonDetail('Updated data', data);
      return false;
    }

    log.detail('Got expected empty result due to RLS');
    return data.length === 0; // RLS prevents update
  });

  // --- Cleanup ---
  // Uncomment to clean up test data
  // await cleanupTestData(supabaseAdmin, testPrivyId1, testPrivyId2);

  // --- Results Summary ---
  log.header('Test Results Summary');

  if (overallSuccess) {
    log.success('ALL TESTS PASSED');
    log.detail('Your Row Level Security policies are working correctly!');
  } else {
    log.error('SOME TESTS FAILED');
    log.detail('Your Row Level Security policies may not be configured correctly.');
    log.detail('Check that:');
    log.detail('1. You are using the correct anon key (not service key)');
    log.detail('2. RLS is enabled on your tables');
    log.detail(
      "3. The RLS policies correctly check ((request.jwt.claims ->> 'privy_id')::text = privy_id)"
    );
    log.detail("4. JWT secret in Supabase matches what you're using in this test");
  }

  // Don't exit with error code, just continue
}

runTests();
