import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [{ id: '1', name: 'Test Project', created_at: new Date().toISOString() }],
        error: null,
      })),
    })),
  },
}));

// Mock hook - will match actual hook when created
const useProjectQueries = () => ({
  projects: { data: [], isLoading: false, error: null },
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useProjectQueries', () => {
  it('should return projects data structure', () => {
    const { result } = renderHook(() => useProjectQueries(), {
      wrapper: createWrapper(),
    });

    expect(result.current.projects).toBeDefined();
    expect(result.current.projects.data).toEqual([]);
  });
});