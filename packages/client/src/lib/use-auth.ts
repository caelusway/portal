import { usePrivy } from '@privy-io/react-auth';
// Removed unused useState and useEffect imports if they were there

export function useAuth() {
  const { authenticated, user, login, logout, createWallet, ready } = usePrivy();
  // Remove supabaseUserId state and related logic
  // const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  // Removed the useEffect hook that previously tried to fetch supabaseUserId

  // Return only the necessary values from Privy and the wallet
  return {
    isAuthenticated: authenticated,
    isLoading: !ready, // Use the 'ready' flag from Privy to determine loading state
    user,
    login,
    logout,
    wallet: user?.wallet,
    createWallet,
    // Removed supabaseUserId and setSupabaseUserId from return object
  };
}
