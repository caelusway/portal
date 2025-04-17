import { config } from 'dotenv';
import path from 'path';
import * as jose from 'jose';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from root .env file
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
config({ path: rootEnvPath });

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const jwtSecret = process.env.VITE_SUPABASE_JWT_SECRET;

if (!supabaseUrl || !supabaseAnonKey || !jwtSecret) {
  console.error('Error: Missing Supabase environment variables');
  console.error(
    'Please ensure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_JWT_SECRET are set in the root .env file'
  );
  process.exit(1);
}

console.log('Testing JWT generation and custom header authorization...');

// Create a test Privy ID
const testPrivyId = `test-privy-id-${Date.now()}`;
console.log(`Using test privy_id: ${testPrivyId}`);

async function generateJwtToken(privyUserId: string): Promise<string> {
  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60; // 1 hour expiration

    const claims = {
      privy_id: privyUserId,
      role: 'authenticated',
      aud: 'authenticated',
      sub: privyUserId,
      exp: exp,
    };

    const jwt = await new jose.SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setAudience('authenticated')
      .sign(secret);

    return jwt;
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw error;
  }
}

async function testJwtAuthWithHeaders() {
  // 1. Generate JWT
  console.log('Generating JWT token...');
  const jwt = await generateJwtToken(testPrivyId);
  console.log(`JWT generated: ${jwt.substring(0, 20)}...`);

  // 2. Create Supabase client with JWT in Authorization header
  console.log('Creating Supabase client with JWT in Authorization header...');
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });

  // 3. Try a test query to verify RLS
  console.log('\nTesting RLS with a profiles query...');
  try {
    // First try to create a profile for the test privy_id
    console.log('Creating a test profile...');
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .upsert({
        privy_id: testPrivyId,
        full_name: 'Test User',
        email: 'test@example.com',
        project_name: 'Test Project',
        project_description: 'This is a test project description',
        project_vision: 'Test project vision',
        scientific_references: 'Test references',
        credential_links: 'Test credential links',
        team_members: 'Test team members',
        motivation: 'Test motivation',
        progress: 'Test progress',
      })
      .select();

    if (insertError) {
      console.error('❌ Error creating profile:', insertError);
    } else {
      console.log('✅ Profile created successfully:', insertData);
    }

    // Then try to select profiles
    console.log('\nTesting profile selection...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('privy_id', testPrivyId)
      .single();

    if (profileError) {
      console.error('❌ Error querying profiles:', profileError);
    } else {
      console.log('✅ Query successful. Data:', profileData);
    }

    // Cleanup test data
    console.log('\nCleaning up test data...');
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('privy_id', testPrivyId);

    if (deleteError) {
      console.error('❌ Error deleting test profile:', deleteError);
    } else {
      console.log('✅ Test profile deleted successfully');
    }
  } catch (queryError) {
    console.error('❌ Exception during operation:', queryError);
  }
}

testJwtAuthWithHeaders().catch(console.error);
