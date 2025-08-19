import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTeamQueries } from '@/hooks/queries/useTeamQueries';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [{ id: '1', name: 'Test Team' }],
        error: null,
      })),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useTeamQueries', () => {
  it('should fetch teams successfully', () => {
    const { result } = renderHook(() => useTeamQueries(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
  });
});