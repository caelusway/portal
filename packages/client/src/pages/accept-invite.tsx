import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/use-auth';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, ConnectedWallet } from '@privy-io/react-auth';
import { useDatabase } from '@/contexts/db-context';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, Check, Loader2, X } from 'lucide-react';
import { ProjectInvite } from '@/contexts/db-context';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { isAuthenticated, login, user } = useAuth();
  const { wallets } = useWallets();
  const { ready } = usePrivy();
  const { verifyInviteToken, acceptInvite, getUserByPrivyId, createUser } = useDatabase();
  const { toast } = useToast();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [inviteData, setInviteData] = useState<ProjectInvite | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Get embedded wallet
  const embeddedWallet = wallets?.find(
    (wallet: ConnectedWallet) => wallet.walletClientType === 'privy'
  );

  // Verify token when page loads (if user is authenticated)
  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    async function verifyToken() {
      if (isAuthenticated && user?.id && ready) {
        setIsVerifying(true);
        try {
          if (token) {
            const invite = await verifyInviteToken(token);
            if (invite) {
              setInviteData(invite);
            } else {
              setVerificationError('This invitation link is invalid or has expired.');
            }
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          setVerificationError('Error verifying invitation. Please try again or contact support.');
        } finally {
          setIsVerifying(false);
        }
      }
    }

    verifyToken();
  }, [isAuthenticated, user?.id, token, ready, verifyInviteToken, navigate]);

  // Accept the invitation
  const handleAcceptInvite = async () => {
    if (!user?.id || !token) return;

    setIsAccepting(true);
    try {
      // First check if user already exists
      let bioUser = await getUserByPrivyId(user.id);

      // If not, create the user
      if (!bioUser) {
        const userData = {
          privyId: user.id,
          wallet: embeddedWallet?.address || null,
          email: user.email?.address || null,
        };

        bioUser = await createUser(userData);
      }

      // Now accept the invitation
      const success = await acceptInvite(token, bioUser.id);

      console.log('AcceptInvite: Success: a', success);

      if (success) {
        toast({
          title: 'Invitation accepted',
          description: 'You have successfully joined the project!',
          duration: 3000,
        });

        // Redirect to chat page
        navigate('/chat');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to accept invitation. Please try again.',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while accepting the invitation.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsAccepting(false);
    }
  };

  // Render login card if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-bio-accent/20 border-t-4">
          <CardHeader className="relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-bio-accent/70 to-bio-accent/10"></div>
            <CardTitle className="text-2xl">Join Project</CardTitle>
            <CardDescription>Please log in to accept the invitation</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="size-24 rounded-full bg-bio-accent/10 flex items-center justify-center mb-6">
              <LogIn className="size-12 text-bio-accent" />
            </div>
            <p className="text-center text-muted-foreground mb-6">
              Sign in with your credentials to join the project. Once authenticated, you'll be able
              to accept the invitation.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-bio-accent hover:bg-bio-accent/90 text-bio-accent-foreground"
              onClick={login}
            >
              Login to Accept Invitation
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show loading state while verifying
  if (isVerifying) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Verifying Invitation</CardTitle>
            <CardDescription>Please wait while we verify your invitation...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="size-12 text-bio-accent animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if verification failed
  if (verificationError) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-500/20 border-t-4">
          <CardHeader className="relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/70 to-red-500/10"></div>
            <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
            <CardDescription>We couldn't verify this invitation link</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="size-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <X className="size-12 text-red-500" />
            </div>
            <p className="text-center text-muted-foreground mb-6">{verificationError}</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline" onClick={() => navigate('/')}>
              Return to Homepage
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show invitation details and accept button
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-bio-accent/20 border-t-4">
        <CardHeader className="relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-bio-accent/70 to-bio-accent/10"></div>
          <CardTitle className="text-2xl">Project Invitation</CardTitle>
          <CardDescription>You've been invited to join a project</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col py-6">
          {inviteData?.project && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project Name</p>
                <p className="text-lg font-semibold">{inviteData.project.name}</p>
              </div>

              {inviteData.project.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-md">{inviteData.project.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground">Invited By</p>
                <p className="text-md">{inviteData.inviter?.fullName || 'A project member'}</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>
            Decline
          </Button>
          <Button
            className="flex-1 bg-bio-accent hover:bg-bio-accent/90 text-bio-accent-foreground"
            onClick={handleAcceptInvite}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <Check className="mr-2 size-4" />
                Accept Invitation
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
