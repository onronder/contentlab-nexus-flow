import { useCallback } from 'react';
import { useTeamContext } from '@/contexts/TeamContext';
import { useTeamSwitching } from '@/hooks/useTeamSwitching';

/**
 * Hook for managing component state during team switches
 */
export function useTeamSwitchingState() {
  const { currentTeam } = useTeamContext();
  const { invalidateTeamQueries } = useTeamSwitching();

  const createResetEffect = useCallback((resetFunction: () => void) => {
    return () => {
      resetFunction();
    };
  }, []);

  const createTeamAwareState = useCallback(<T>(
    initialValue: T,
    setValue: (value: T) => void
  ) => {
    const reset = () => setValue(initialValue);
    return { reset, currentTeam };
  }, [currentTeam]);

  return {
    currentTeam,
    invalidateTeamQueries,
    createResetEffect,
    createTeamAwareState,
  };
}