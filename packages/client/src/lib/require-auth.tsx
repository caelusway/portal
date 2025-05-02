import { useAuth } from '@/lib/use-auth';
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, user } = useAuth();

  // If not authenticated, redirect to home page
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
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
