import { PrivyProvider } from '@privy-io/react-auth';
import { PropsWithChildren, useEffect, useState, useRef } from 'react';
import { setSupabaseJwt } from './supabase-client';
import { useAuth } from './use-auth';
import * as jose from 'jose'; // Add jose for JWT generation
import { SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets';
import { baseSepolia } from 'viem/chains';

const privyConfig = {
  appId: import.meta.env.VITE_PRIVY_APP_ID,
  loginMethods: ['email', 'passkey'] as ('email' | 'passkey')[],
  defaultChain: baseSepolia,
  appearance: {
    theme: 'dark' as const,
    accentColor: '#8bff2a' as const,
  },
  embeddedWallets: {
    createOnLogin: 'all-users' as const,
  },
};

// Function to generate JWT token
async function generateJwtToken(privyUserId: string): Promise<string> {
  try {
    const jwtSecret = import.meta.env.VITE_SUPABASE_JWT_SECRET;

    if (!jwtSecret) {
      console.error('Missing SUPABASE_JWT_SECRET in environment variables');
      throw new Error('Missing JWT Secret');
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 24 * 60 * 60; // 24 hours expiration (increased from 1 hour)

    const claims = {
      privy_id: privyUserId,
      role: 'authenticated',
      aud: 'authenticated',
      sub: privyUserId,
      exp: exp,
    };

    console.log('Generating JWT with claims:', claims);

    const jwt = await new jose.SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setAudience('authenticated')
      .sign(secret);

    console.log(`JWT Token (first 40 chars): ${jwt.substring(0, 40)}...`);

    return jwt;
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw error;
  }
}

// Internal provider that handles auth state changes according to custom JWT flow
function PrivyAuthIntegration({ children }: PropsWithChildren) {
  const { user, isAuthenticated } = useAuth();
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  // Add refs to track previous values
  const prevAuthRef = useRef(isAuthenticated);
  const prevUserIdRef = useRef<string | null>(null);
  const jwtSetRef = useRef(false);

  useEffect(() => {
    // Only run this effect when auth status or user ID actually changes
    const prevAuth = prevAuthRef.current;
    const prevUserId = prevUserIdRef.current;
    const currentUserId = user?.id || null;

    // Update refs
    prevAuthRef.current = isAuthenticated;
    prevUserIdRef.current = currentUserId;

    // Skip if processing is already in progress
    if (isProcessingAuth) return;

    // Handle login - only when first authenticated or when user ID changes
    if (
      isAuthenticated &&
      currentUserId &&
      (!prevAuth || prevUserId !== currentUserId || !jwtSetRef.current)
    ) {
      setIsProcessingAuth(true);
      jwtSetRef.current = false; // Reset the flag

      const setupAuth = async () => {
        try {
          console.log('Privy authenticated, generating Supabase auth token...');

          // Generate JWT token directly instead of calling edge function
          const signedJwt = await generateJwtToken(currentUserId);

          if (signedJwt) {
            console.log('JWT generated successfully');

            // Store the token in component state
            setJwtToken(signedJwt);

            // Set the JWT in the Supabase client (this creates a new client with the token)
            setSupabaseJwt(signedJwt);
            jwtSetRef.current = true; // Mark JWT as set
            console.log('Supabase client configured with Authorization header');
          } else {
            console.error('Failed to generate JWT token');
            setJwtToken(null);
            setSupabaseJwt(null);
          }
        } catch (error) {
          console.error('Error during JWT generation:', error);
          setJwtToken(null);
          setSupabaseJwt(null);
        } finally {
          setIsProcessingAuth(false);
        }
      };

      setupAuth();
    }
    // Handle logout - only when going from authenticated to unauthenticated
    else if (!isAuthenticated && prevAuth) {
      console.log('Privy logged out, clearing JWT token.');
      setJwtToken(null);
      setSupabaseJwt(null);
      jwtSetRef.current = false;
    }
  }, [isAuthenticated, user?.id]);

  return <>{children}</>;
}

export function PrivyAuthProvider({ children }: PropsWithChildren) {
  if (!privyConfig.appId) {
    console.error('VITE_PRIVY_APP_ID is not set in environment variables');
    return null;
  }

  return (
    <PrivyProvider
      appId={privyConfig.appId}
      config={{
        loginMethods: privyConfig.loginMethods,
        appearance: privyConfig.appearance,
        embeddedWallets: privyConfig.embeddedWallets,
        defaultChain: privyConfig.defaultChain,
      }}
    >
      <SmartWalletsProvider
        config={{
          paymasterContext: {
            mode: 'SPONSORED',
            calculateGasLimits: true,
            expiryDuration: 300,
          },
        }}
      >
        <PrivyAuthIntegration>{children}</PrivyAuthIntegration>
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
