import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTeamPersistence } from '@/hooks/useTeamPersistence';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock hooks
vi.mock('@/hooks/useAppPreferences', () => ({
  useAppPreferences: vi.fn(),
  useUpdateAppPreferences: vi.fn()
}));

const mockUseAppPreferences = vi.mocked(await import('@/hooks/useAppPreferences')).useAppPreferences;
const mockUseUpdateAppPreferences = vi.mocked(await import('@/hooks/useAppPreferences')).useUpdateAppPreferences;

describe('useTeamPersistence', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAppPreferences.mockReturnValue({
      data: {
        currentTeamId: 'team-1',
        recentTeams: ['team-2'],
        teamSwitchBehavior: 'remember' as const,
        crossDeviceSync: true
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isSuccess: true,
      isError: false,
      isPending: false
    } as any);

    mockUseUpdateAppPreferences.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null
    } as any);
  });

  it('returns correct interface', () => {
    const { result } = renderHook(() => useTeamPersistence());

    expect(result.current.updateLastTeam).toBeDefined();
    expect(result.current.getLastTeam).toBeDefined();
    expect(result.current.clearLastTeam).toBeDefined();
  });

  it('updates team in localStorage and preferences', () => {
    const { result } = renderHook(() => useTeamPersistence());

    result.current.updateLastTeam('new-team');

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('currentTeamId', 'new-team');
    expect(mockMutate).toHaveBeenCalledWith({
      currentTeamId: 'new-team',
      recentTeams: expect.arrayContaining(['team-1', 'team-2'])
    });
  });

  it('gets team from localStorage first', () => {
    mockLocalStorage.getItem.mockReturnValue('local-team');

    const { result } = renderHook(() => useTeamPersistence());

    const teamId = result.current.getLastTeam();

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('currentTeamId');
    expect(teamId).toBe('local-team');
  });

  it('falls back to preferences if localStorage is empty', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useTeamPersistence());

    const teamId = result.current.getLastTeam();

    expect(teamId).toBe('team-1');
  });

  it('clears team from localStorage and preferences', () => {
    const { result } = renderHook(() => useTeamPersistence());

    result.current.clearLastTeam();

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('currentTeamId');
    expect(mockMutate).toHaveBeenCalledWith({
      currentTeamId: null
    });
  });

  it('handles localStorage errors gracefully', () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage failed');
    });

    const { result } = renderHook(() => useTeamPersistence());

    expect(() => result.current.updateLastTeam('team-1')).not.toThrow();
  });

  it('handles preferences update errors gracefully', () => {
    mockMutate.mockImplementation(() => {
      throw new Error('Update failed');
    });

    const { result } = renderHook(() => useTeamPersistence());

    expect(() => result.current.updateLastTeam('team-1')).not.toThrow();
  });
});