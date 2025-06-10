import './index.css';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppSidebar } from './components/app-sidebar';
import { LogViewer } from './components/log-viewer';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import { STALE_TIMES } from './hooks/use-query-hooks';
import useVersion from './hooks/use-version';
import { apiClient } from './lib/api';
import Room from './routes/room';
import Home from './routes/home';
import AgentSettings from './routes/settings';
import EnvSettings from './components/env-settings';
import { WelcomeFormProvider } from './lib/welcome-form-context';
import { PrivyAuthProvider } from './lib/auth-provider';
import { useAuth } from './lib/use-auth';
import { DashboardLayout } from './components/dashboard-layout';
import { WagmiProviderWrapper } from './lib/wagmi-provider';
import ProfilePage from './pages/profile';
import SettingsPage from './pages/settings';
import CoreAgentRoute from './routes/core-agent';
import { UserLevelProvider } from './lib/user-level.tsx';
import { CoreAgent } from './components/agent/core-agent';
import { CoachingAgent } from './components/agent/coaching-agent';
import { DatabaseProvider } from './contexts/db-context';
import { RequireOnboarding } from './lib/require-onboarding';
import Chat from './routes/chat';
import { RequireAuth } from './lib/require-auth';
import AcceptInvite from './pages/accept-invite';
import { Loader2 } from 'lucide-react';
import { SettingsProvider } from './lib/settings-context';
import POLNFTPage from './pages/pol-nft';

// Create protected route components
//const ProtectedDashboard = RequireOnboarding(DashboardLayout);
//const ProtectedProfile = RequireOnboarding(ProfilePage);
//const ProtectedBioDAO = RequireOnboarding(CoreAgent);

// Create a query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIMES.STANDARD,
      // Default to no polling unless specifically configured
      refetchInterval: false,
      // Make queries retry 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch query on window focus
      refetchOnWindowFocus: true,
      // Enable refetch on reconnect
      refetchOnReconnect: true,
      // Fail queries that take too long
    },
    mutations: {
      // Default to 3 retries for mutations too
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Prefetch initial data with smarter error handling
const prefetchInitialData = async () => {
  try {
    // Prefetch agents (real-time data so shorter stale time)
    await queryClient.prefetchQuery({
      queryKey: ['agents'],
      queryFn: () => apiClient.getAgents(),
      staleTime: STALE_TIMES.FREQUENT,
    });
  } catch (error) {
    console.error('Error prefetching initial data:', error);
    // Don't throw, let the app continue loading with fallbacks
  }
};

// Execute prefetch immediately
prefetchInitialData();

// Route guard with loading state
function AuthenticatedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Save current path to localStorage when logged in
    if (isAuthenticated && location.pathname !== '/') {
      localStorage.setItem('lastAuthenticatedPath', location.pathname);
    }
  }, [isAuthenticated, location]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading authentication state...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route
        path="/chat"
        element={
          <RequireAuth>
            <CoreAgent />
          </RequireAuth>
        }
      />
      <Route
        path="chat/:agentId"
        element={
          <RequireAuth>
            <Chat />
          </RequireAuth>
        }
      />
      <Route
        path="/coaching"
        element={
          <RequireAuth>
            <CoachingAgent />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/pol-nft"
        element={
          <RequireAuth>
            <POLNFTPage />
          </RequireAuth>
        }
      />
      <Route
        path="/room/:serverId"
        element={
          <RequireAuth>
            <Room />
          </RequireAuth>
        }
      />
      <Route path="/env-settings" element={<EnvSettings />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/logs"
        element={
          <RequireAuth>
            <LogViewer />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function App() {
  useVersion();

  // Also prefetch when the component mounts (helps with HMR and refreshes)
  useEffect(() => {
    prefetchInitialData();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyAuthProvider>
        <WagmiProviderWrapper>
          <WelcomeFormProvider>
            <UserLevelProvider>
              <DatabaseProvider>
                <SettingsProvider>
                  <div
                    className="dark antialiased"
                    style={{
                      colorScheme: 'dark',
                    }}
                  >
                    <BrowserRouter>
                      <TooltipProvider delayDuration={0}>
                        <SidebarProvider>
                          <AppSidebar />
                          <SidebarInset className="p-0 m-0 overflow-hidden">
                            <div className="flex flex-col h-full">
                              <AuthenticatedRoutes />
                            </div>
                          </SidebarInset>
                        </SidebarProvider>
                        <Toaster />
                      </TooltipProvider>
                    </BrowserRouter>
                  </div>
                </SettingsProvider>
              </DatabaseProvider>
            </UserLevelProvider>
          </WelcomeFormProvider>
        </WagmiProviderWrapper>
      </PrivyAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
