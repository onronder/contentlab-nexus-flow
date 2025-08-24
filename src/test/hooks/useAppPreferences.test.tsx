import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppPreferences, useUpdateAppPreferences, useTeamPreferenceHelpers } from '@/hooks/useAppPreferences';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } } }))
    },
    rpc: vi.fn()
  }
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAppPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches user preferences correctly', async () => {
    const mockPreferences = {
      currentTeamId: 'team-1',
      recentTeams: ['team-2', 'team-3'],
      teamSwitchBehavior: 'remember',
      crossDeviceSync: true
    };

    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockPreferences, error: null });

    const { result } = renderHook(() => useAppPreferences(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockPreferences);
    });
  });

  it('handles fetch errors gracefully', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('Fetch failed') });

    const { result } = renderHook(() => useAppPreferences(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});

describe('useUpdateAppPreferences', () => {
  it('updates preferences correctly', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useUpdateAppPreferences(), {
      wrapper: createWrapper()
    });

    const newPreferences = { currentTeamId: 'new-team' };
    result.current.mutate(newPreferences);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('update_user_app_preferences', {
        p_preferences: newPreferences
      });
    });
  });
});

describe('useTeamPreferenceHelpers', () => {
  beforeEach(() => {
    const mockPreferences = {
      currentTeamId: 'team-1',
      recentTeams: ['team-2'],
      teamSwitchBehavior: 'remember',
      crossDeviceSync: true
    };

    const supabaseModule = await import('@/integrations/supabase/client');
    const { supabase } = supabaseModule;
    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockPreferences, error: null });
  });

  it('provides helper functions', async () => {
    const { result } = renderHook(() => useTeamPreferenceHelpers(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.updateCurrentTeam).toBeDefined();
      expect(result.current.clearTeamHistory).toBeDefined();
      expect(result.current.updateSwitchBehavior).toBeDefined();
      expect(result.current.toggleCrossDeviceSync).toBeDefined();
    });
  });

  it('updates current team and recent teams list', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { result } = renderHook(() => useTeamPreferenceHelpers(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      result.current.updateCurrentTeam('new-team');
    });

    expect(supabase.rpc).toHaveBeenCalledWith('update_user_app_preferences', {
      p_preferences: expect.objectContaining({
        currentTeamId: 'new-team',
        recentTeams: expect.arrayContaining(['team-1', 'team-2'])
      })
    });
  });

  it('clears team history correctly', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { result } = renderHook(() => useTeamPreferenceHelpers(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      result.current.clearTeamHistory();
    });

    expect(supabase.rpc).toHaveBeenCalledWith('update_user_app_preferences', {
      p_preferences: expect.objectContaining({
        recentTeams: []
      })
    });
  });
});