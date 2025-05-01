import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useDatabase, ProjectInvite } from '@/contexts/db-context';
import { AlertCircle, Send, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProjectInvitationsProps {
  projectId: string;
}

export function ProjectInvitations({ projectId }: ProjectInvitationsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createProjectInvite, getInvitesByProjectId } = useDatabase();

  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [isSending, setIsSending] = useState(false);

  // Fetch existing invitations
  const fetchInvites = async () => {
    if (!projectId) return;

    try {
      setIsRefreshing(true);
      const invitesList = await getInvitesByProjectId(projectId);
      setInvites(invitesList);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitations',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load invitations when component mounts
  useEffect(() => {
    setIsLoading(true);
    fetchInvites().finally(() => setIsLoading(false));
  }, [projectId]);

  // Send invitation
  const handleSendInvite = async () => {
    if (!user?.id || !projectId || !email) return;

    try {
      setIsSending(true);
      await createProjectInvite(projectId, user.id, email);
      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${email}`,
      });
      setEmail('');
      // Refresh invitation list
      await fetchInvites();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
            Pending
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500">
            Accepted
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500">
            Declined
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-500">
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Determine if invitation is expired
  const isExpired = (expiresAt: Date) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Invitations</CardTitle>
        <CardDescription>Invite co-founders and team members to your project</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invitation Form */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Send New Invitation</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
              />
            </div>
            <div className="w-full md:w-32">
              <Select value={role} onValueChange={setRole} disabled={isSending}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="founder">Co-Founder</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSendInvite}
              disabled={!email || isSending}
              className="flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Invitations List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Current Invitations</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchInvites()}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 flex justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invites.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No invitations</AlertTitle>
              <AlertDescription>
                You haven't sent any invitations yet. Invite team members to collaborate on your
                project.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited On</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.inviteeEmail}</TableCell>
                      <TableCell>{getStatusBadge(invite.status)}</TableCell>
                      <TableCell>{formatDate(invite.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isExpired(invite.expiresAt) ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          {formatDate(invite.expiresAt)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <div>
            Invitations are valid for 7 days. Users will need to create an account to join your
            project.
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
