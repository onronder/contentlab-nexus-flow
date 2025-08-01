import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  UserPlus,
  Building,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { useInvitationByToken, useInvitationStatus } from '@/hooks/useInvitationQueries';
import { useAcceptInvitation, useDeclineInvitation } from '@/hooks/useInvitationMutations';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: invitation, isLoading: invitationLoading } = useInvitationByToken(token || '');
  const { data: status, isLoading: statusLoading } = useInvitationStatus(token || '');
  const acceptInvitation = useAcceptInvitation();
  const declineInvitation = useDeclineInvitation();

  const isLoading = authLoading || invitationLoading || statusLoading;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, authLoading, navigate]);

  // Redirect to dashboard after successful acceptance
  useEffect(() => {
    if (invitation?.status === 'accepted') {
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  }, [invitation?.status, navigate]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      await acceptInvitation.mutateAsync({ token });
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    try {
      await declineInvitation.mutateAsync({ token });
      navigate('/dashboard');
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <EmptyState
              icon={AlertCircle}
              title="Invalid Invitation"
              description="The invitation link is invalid or malformed."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
            <span className="ml-3">Loading invitation...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <EmptyState
              icon={AlertCircle}
              title="Invitation Not Found"
              description="This invitation does not exist or has been removed."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle different invitation states
  if (status.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <EmptyState
              icon={Clock}
              title="Invitation Expired"
              description="This invitation has expired. Please contact the team owner for a new invitation."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status.alreadyMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <EmptyState
              icon={Users}
              title="Already a Member"
              description="You are already a member of this team."
              action={{
                label: "Go to Dashboard",
                onClick: () => navigate('/dashboard')
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-100 rounded-full p-3 w-fit mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-900">Invitation Accepted!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Welcome to the team! You will be redirected to the dashboard shortly.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <EmptyState
              icon={XCircle}
              title="Invitation Declined"
              description="You have declined this team invitation."
              action={{
                label: "Go to Dashboard",
                onClick: () => navigate('/dashboard')
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <EmptyState
              icon={XCircle}
              title="Invitation Cancelled"
              description="This invitation has been cancelled by the team owner."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid pending invitation
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Team Invitation</CardTitle>
          <p className="text-muted-foreground">
            You&apos;ve been invited to join a team
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Team Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">{invitation.team?.name}</h3>
                {invitation.team?.description && (
                  <p className="text-sm text-muted-foreground">
                    {invitation.team.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">Your Role</h4>
                <Badge variant="outline">
                  {invitation.role?.name}
                </Badge>
                {invitation.role?.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {invitation.role.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">Invited by</h4>
                <p className="text-sm text-muted-foreground">
                  {invitation.invited_by_user?.full_name || invitation.invited_by_user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Personal Message */}
          {invitation.message && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Personal Message</h4>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm">&quot;{invitation.message}&quot;</p>
                </div>
              </div>
            </>
          )}

          {/* Invitation Details */}
          <Separator />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Invited on {format(new Date(invitation.created_at), 'MMMM d, yyyy')}</p>
            <p>Expires on {format(new Date(invitation.expires_at), 'MMMM d, yyyy')}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleAccept}
              disabled={acceptInvitation.isPending || declineInvitation.isPending}
              className="flex-1"
            >
              {acceptInvitation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={acceptInvitation.isPending || declineInvitation.isPending}
              className="flex-1"
            >
              {declineInvitation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Declining...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}