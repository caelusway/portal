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
    'Please ensure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_SUPABASE_JWT_SECRET are set in the root .env file'
  );
  process.exit(1);
}

console.log('Testing JWT generation for client integration...');

// Function to generate JWT token (copy of the function in auth-provider.tsx)
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

async function testClientJwt() {
  try {
    // 1. Generate a test privy ID
    const testPrivyId = `test-privy-id-${Date.now()}`;
    console.log(`\nGenerating JWT for test privy_id: ${testPrivyId}`);

    // 2. Generate JWT
    const jwt = await generateJwtToken(testPrivyId);
    console.log(`JWT token generated (first 20 chars): ${jwt.substring(0, 20)}...`);

    // 3. Verify JWT claims
    const decoded = jose.decodeJwt(jwt);
    console.log('\nDecoded JWT claims:');
    console.log(decoded);

    // 4. Create client with JWT
    console.log('\nCreating Supabase client with JWT...');
    const client = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: { Authorization: `Bearer ${jwt}` },
      },
    });

    // 5. Try a simple query to test RLS
    console.log('\nTesting a query with RLS (accessing profiles table)...');
    const { data, error } = await client.from('profiles').select('*').limit(5);

    if (error) {
      console.error('Error with RLS query:', error);
    } else {
      console.log(`Query successful, returned ${data.length} results`);
      if (data.length > 0) {
        console.log('Sample data (first record if available):');
        console.log(data[0]);
      }
    }

    // 6. Try an insert test
    console.log('\nTesting insert with RLS (adding test profile)...');
    const profile = {
      privy_id: testPrivyId,
      full_name: 'Test Client JWT User',
      email: 'test-client-jwt@example.com',
      project_name: 'JWT Test Project',
      project_description: 'Testing JWT client integration',
      project_vision: 'A world with working JWT auth',
      scientific_references: 'JWT Spec',
      credential_links: 'https://jwt.io',
      team_members: 'JWT Team',
      motivation: 'Testing',
      progress: 'In progress',
    };

    const { data: insertData, error: insertError } = await client
      .from('profiles')
      .upsert(profile)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting test profile:', insertError);

      if (insertError.code === '42501') {
        console.error('\nThis appears to be an RLS policy error. Make sure:');
        console.error('1. RLS is properly configured for the profiles table');
        console.error('2. The JWT claims include privy_id correctly');
        console.error('3. The JWT secret matches the one configured in Supabase');
      }
    } else {
      console.log('Insert successful!');
      console.log('Inserted record ID:', insertData.id);

      // Try fetching the record back to verify it works
      console.log('\nVerifying record was inserted and is accessible...');
      const { data: verifyData, error: verifyError } = await client
        .from('profiles')
        .select('*')
        .eq('privy_id', testPrivyId)
        .single();

      if (verifyError) {
        console.error('Error verifying inserted record:', verifyError);
      } else {
        console.log('Record verification successful! Record found:');
        console.log('ID:', verifyData.id);
        console.log('Full Name:', verifyData.full_name);
        console.log('Project:', verifyData.project_name);
      }
    }

    console.log('\nJWT client integration test completed.');
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

testClientJwt();
