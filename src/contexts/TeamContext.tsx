import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Team } from '@/types/team';
import { useAuth } from '@/hooks/useAuth';
import { useTeams } from '@/hooks/useTeamQueries';
import { useTeamPersistence } from '@/hooks/useTeamPersistence';
import { useErrorBoundary } from '@/hooks/useErrorBoundary';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface TeamContextType {
  currentTeam: Team | null;
  setCurrentTeam: (team: Team | null) => void;
  availableTeams: Team[];
  isLoading: boolean;
  switchTeam: (teamId: string) => void;
  hasTeamAccess: (permission: string) => boolean;
  isTeamMember: (userId: string) => boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface TeamProviderProps {
  children: ReactNode;
}

export function TeamProvider({ children }: TeamProviderProps) {
  const { user } = useAuth();
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null);
  const { updateLastTeam, getLastTeam, clearLastTeam } = useTeamPersistence();
  const { captureError, recoverFromError } = useErrorBoundary();
  
  // Use React Query to fetch teams
  const { data: availableTeams = [], isLoading, error } = useTeams();

  // Handle error state
  useEffect(() => {
    if (error) {
      captureError(error, 'Team fetching');
      console.error('Error fetching teams:', error);
      // Only show toast for non-authentication errors
      if (!error.message.includes('JWT') && !error.message.includes('auth')) {
        toast({
          title: 'Error loading teams',
          description: 'Failed to load your teams. Please try again.',
          variant: 'destructive',
        });
      }
    }
  }, [error, captureError]);

  // Set initial current team from saved preference or first available team
  useEffect(() => {
    const initializeTeam = async () => {
      if (!isLoading && availableTeams.length > 0 && !currentTeam) {
        try {
          const savedTeamId = await getLastTeam();
          const savedTeam = savedTeamId ? availableTeams.find(team => team.id === savedTeamId) : null;
          const teamToSet = savedTeam || availableTeams[0];
          
          console.log('Initializing team:', { 
            savedTeamId, 
            savedTeam: !!savedTeam, 
            teamToSet: teamToSet?.name
          });
          setCurrentTeamState(teamToSet);
          
          // Update persistence if we fallback to first team (non-blocking)
          if (!savedTeam && teamToSet) {
            updateLastTeam(teamToSet.id).catch(error => {
              console.warn('Failed to update team preference:', error);
              // Don't capture error here to avoid cascade failures
            });
          }
        } catch (error) {
          captureError(error as Error, 'Team initialization');
          console.warn('Team initialization failed, using first available team:', error);
          // Fallback to first team if persistence fails
          if (availableTeams[0]) {
            setCurrentTeamState(availableTeams[0]);
          }
        }
      } else if (!isLoading && availableTeams.length === 0 && user?.id) {
        console.log('No teams found for user:', user.id);
        setCurrentTeamState(null);
        clearLastTeam().catch(error => {
          console.warn('Failed to clear team preference:', error);
          // Don't capture error here to avoid cascade failures
        });
      }
    };

    initializeTeam();
  }, [availableTeams, isLoading, currentTeam, user?.id, getLastTeam, updateLastTeam, clearLastTeam, captureError]);

  // Clear team state when user logs out
  useEffect(() => {
    if (!user?.id) {
      setCurrentTeamState(null);
      clearLastTeam().catch(console.warn);
    }
  }, [user?.id, clearLastTeam]);

  const setCurrentTeam = async (team: Team | null) => {
    try {
      setCurrentTeamState(team);
      // Update persistence (non-blocking)
      if (team) {
        updateLastTeam(team.id).catch(error => {
          console.warn('Failed to update team preference:', error);
          // Don't capture error here - team switching should still work locally
        });
      } else {
        clearLastTeam().catch(error => {
          console.warn('Failed to clear team preference:', error);
          // Don't capture error here - local state clear is sufficient
        });
      }
    } catch (error) {
      captureError(error as Error, 'Team switching');
      // Even if persistence fails, update local state
      setCurrentTeamState(team);
    }
  };

  const switchTeam = async (teamId: string) => {
    try {
      const team = availableTeams.find(t => t.id === teamId);
      if (team) {
        // Set current team immediately for optimistic UI
        setCurrentTeamState(team);
        
        // Invalidate all team-dependent queries
        await queryClient.invalidateQueries({ queryKey: ['projects', 'team'] });
        await queryClient.invalidateQueries({ queryKey: ['content', 'team'] });
        await queryClient.invalidateQueries({ queryKey: ['teams'] });
        await queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
        await queryClient.invalidateQueries({ queryKey: ['teamStats'] });
        
        // Update persistence (non-blocking)
        updateLastTeam(team.id).catch(error => {
          console.warn('Failed to update team preference:', error);
        });
        
        // Show success feedback
        toast({
          title: 'Team switched',
          description: `Switched to ${team.name}`,
        });
      }
    } catch (error) {
      captureError(error as Error, 'Team switching');
      // Still show user feedback even if something went wrong
      const team = availableTeams.find(t => t.id === teamId);
      if (team) {
        toast({
          title: 'Team switched',
          description: `Switched to ${team.name} (some features may be limited)`,
          variant: 'default',
        });
      }
    }
  };

  const hasTeamAccess = (permission: string): boolean => {
    if (!currentTeam || !user?.id) return false;
    
    // Find current user's role in the team
    const userMember = currentTeam.members?.find(member => member.user_id === user.id);
    if (!userMember) return false;

    // Check if user has permission (this would be enhanced with actual permission system)
    const role = userMember.role;
    if (!role) return false;

    // Basic role-based permissions
    const rolePermissions: Record<string, string[]> = {
      'owner': ['view', 'edit', 'delete', 'manage_members', 'manage_settings', 'manage_projects'],
      'admin': ['view', 'edit', 'delete', 'manage_members', 'manage_projects'],
      'manager': ['view', 'edit', 'manage_projects'],
      'member': ['view', 'edit'],
      'viewer': ['view']
    };

    return rolePermissions[role.slug]?.includes(permission) || false;
  };

  const isTeamMember = (userId: string): boolean => {
    if (!currentTeam) return false;
    return currentTeam.members?.some(member => 
      member.user_id === userId && member.is_active && member.status === 'active'
    ) || false;
  };

  const value: TeamContextType = {
    currentTeam,
    setCurrentTeam,
    availableTeams,
    isLoading,
    switchTeam,
    hasTeamAccess,
    isTeamMember,
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeamContext() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeamContext must be used within a TeamProvider');
  }
  return context;
}