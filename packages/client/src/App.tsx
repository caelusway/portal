import './index.css';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppSidebar } from './components/app-sidebar';
import { LogViewer } from './components/log-viewer';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import { STALE_TIMES } from './hooks/use-query-hooks';
import useVersion from './hooks/use-version';
import { apiClient } from './lib/api';
import Room from './routes/room';
import Home from './routes/home';
import Settings from './routes/settings';
import EnvSettings from './components/env-settings';
import { WelcomeFormProvider } from './lib/welcome-form-context';
import { PrivyAuthProvider } from './lib/auth-provider';
import { DashboardLayout } from './components/dashboard-layout';
import { WagmiProviderWrapper } from './lib/wagmi-provider';
import ProfilePage from './pages/profile';
import CoreAgentRoute from './routes/core-agent';
import { UserLevelProvider } from './lib/user-level.tsx';
import { CoreAgent } from './components/agent/core-agent';
import { DatabaseProvider } from './contexts/db-context';
import { RequireOnboarding } from './lib/require-onboarding';

// Create protected route components
const ProtectedDashboard = RequireOnboarding(DashboardLayout);
const ProtectedProfile = RequireOnboarding(ProfilePage);
const ProtectedBioDAO = RequireOnboarding(CoreAgent);

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
                        <SidebarInset>
                          <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/chat" element={<CoreAgentRoute />} />
                            <Route path="/biodao" element={<ProtectedBioDAO />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/room/:serverId" element={<Room />} />
                            <Route path="/env-settings" element={<EnvSettings />} />
                            <Route path="/dashboard" element={<ProtectedDashboard />} />
                            <Route path="/profile" element={<ProtectedProfile />} />
                            <Route path="/logs" element={<LogViewer />} />
                          </Routes>
                        </SidebarInset>
                      </SidebarProvider>
                      <Toaster />
                    </TooltipProvider>
                  </BrowserRouter>
                </div>
              </DatabaseProvider>
            </UserLevelProvider>
          </WelcomeFormProvider>
        </WagmiProviderWrapper>
      </PrivyAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
