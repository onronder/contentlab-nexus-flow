import { useContext } from 'react';
import { TeamContext, type TeamContextType } from '@/contexts/TeamContext';

/**
 * Safe version of useTeamContext that doesn't throw errors
 * Returns null values when provider is not available
 */
export function useTeamContextSafe() {
  try {
    const context = useContext(TeamContext);
    
    // If context is undefined, provider is not available
    if (context === undefined) {
      const emptyContext: TeamContextType & { isProviderAvailable: boolean } = {
        currentTeam: null,
        availableTeams: [],
        isLoading: false,
        setCurrentTeam: () => {},
        switchTeam: async () => {},
        hasTeamAccess: () => false,
        isTeamMember: () => false,
        isProviderAvailable: false
      };
      return emptyContext;
    }
    
    return {
      ...context,
      isProviderAvailable: true
    };
  } catch (error) {
    console.warn('TeamContext not available:', error);
    const emptyContext: TeamContextType & { isProviderAvailable: boolean } = {
      currentTeam: null,
      availableTeams: [],
      isLoading: false,
      setCurrentTeam: () => {},
      switchTeam: async () => {},
      hasTeamAccess: () => false,
      isTeamMember: () => false,
      isProviderAvailable: false
    };
    return emptyContext;
  }
}