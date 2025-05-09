import { useAuth } from '@/lib/use-auth';
import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Save the current location to localStorage for restoration after login
  if (!isAuthenticated && !isLoading) {
    localStorage.setItem('returnTo', location.pathname + location.search);
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to home page
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // If authenticated, render the protected component
  return <>{children}</>;
}

// HOC to wrap protected routes
export const withAuth = (Component: React.ComponentType<any>) => {
  return (props: any) => (
    <RequireAuth>
      <Component {...props} />
    </RequireAuth>
  );
};
