import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Team } from '@/types/team';
import { TeamService } from '@/services/teamService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface TeamContextType {
  currentTeam: Team | null;
  setCurrentTeam: (team: Team | null) => void;
  availableTeams: Team[];
  isLoading: boolean;
  switchTeam: (teamId: string) => Promise<void>;
  refreshTeams: () => Promise<void>;
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
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load team context from localStorage
  useEffect(() => {
    const savedTeamId = localStorage.getItem('currentTeamId');
    if (savedTeamId && availableTeams.length > 0) {
      const savedTeam = availableTeams.find(team => team.id === savedTeamId);
      if (savedTeam) {
        setCurrentTeamState(savedTeam);
      }
    }
  }, [availableTeams]);

  // Fetch available teams when user changes
  useEffect(() => {
    if (user?.id) {
      fetchTeams();
    } else {
      setAvailableTeams([]);
      setCurrentTeamState(null);
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchTeams = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const teams = await TeamService.getTeamsByUser(user.id);
      console.log('Fetched teams:', teams); // Debug log
      setAvailableTeams(teams);
      
      // Set first team as current if none selected and we have teams
      if (teams.length > 0) {
        const savedTeamId = localStorage.getItem('currentTeamId');
        const savedTeam = savedTeamId ? teams.find(t => t.id === savedTeamId) : null;
        const teamToSet = savedTeam || teams[0];
        
        if (!currentTeam || currentTeam.id !== teamToSet.id) {
          setCurrentTeamState(teamToSet);
          localStorage.setItem('currentTeamId', teamToSet.id);
        }
      } else {
        // No teams found - user needs to create one
        console.log('No teams found for user:', user.id);
        setCurrentTeamState(null);
        localStorage.removeItem('currentTeamId');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Error loading teams',
        description: 'Failed to load your teams. Please try again.',
        variant: 'destructive',
      });
      // Set empty state on error
      setAvailableTeams([]);
      setCurrentTeamState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentTeam = (team: Team | null) => {
    setCurrentTeamState(team);
    if (team) {
      localStorage.setItem('currentTeamId', team.id);
    } else {
      localStorage.removeItem('currentTeamId');
    }
  };

  const switchTeam = async (teamId: string) => {
    const team = availableTeams.find(t => t.id === teamId);
    if (team) {
      setCurrentTeam(team);
      toast({
        title: 'Team switched',
        description: `Switched to ${team.name}`,
      });
    }
  };

  const refreshTeams = async () => {
    await fetchTeams();
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
    refreshTeams,
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