import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { TeamProvider } from '@/contexts/TeamContext';

// Mock data for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

export const mockTeam = {
  id: 'test-team-id',
  name: 'Test Team',
  slug: 'test-team',
  description: 'Test team description',
  owner_id: 'test-user-id',
  team_type: 'organization' as const,
  settings: {},
  is_active: true,
  member_limit: 50,
  current_member_count: 5,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

export const mockTeamMember = {
  id: 'test-member-id',
  user_id: 'test-user-id',
  team_id: 'test-team-id',
  role_id: 'test-role-id',
  status: 'active' as const,
  is_active: true,
  last_activity_at: '2024-01-01T00:00:00Z',
  metadata: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

// Create a test query client
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
    mutations: {
      retry: false,
    },
  },
});

// Wrapper component for testing
interface AllTheProvidersProps {
  children: ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TeamProvider>
            {children}
          </TeamProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<void> | void, iterations = 100) => {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }
  
  return {
    average: times.reduce((sum, time) => sum + time, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
    median: times.sort()[Math.floor(times.length / 2)],
    p95: times.sort()[Math.floor(times.length * 0.95)],
    times
  };
};

// Memory usage tracking
export const trackMemoryUsage = () => {
  const initial = (performance as any).memory?.usedJSHeapSize || 0;
  
  return {
    getUsage: () => {
      const current = (performance as any).memory?.usedJSHeapSize || 0;
      return {
        initial,
        current,
        difference: current - initial,
        percentage: initial > 0 ? ((current - initial) / initial) * 100 : 0
      };
    }
  };
};

// API mocking utilities
export const mockSupabaseResponse = <T>(data: T, delay = 0) => {
  return new Promise<{ data: T; error: null }>((resolve) => {
    setTimeout(() => {
      resolve({ data, error: null });
    }, delay);
  });
};

export const mockSupabaseError = (message: string, code = 'TEST_ERROR') => {
  return Promise.resolve({
    data: null,
    error: { message, code }
  });
};

// Test data generators
export const generateMockTeams = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    ...mockTeam,
    id: `test-team-${index}`,
    name: `Test Team ${index + 1}`,
    slug: `test-team-${index + 1}`,
    current_member_count: Math.floor(Math.random() * 20) + 1
  }));
};

export const generateMockMembers = (count: number, teamId: string) => {
  return Array.from({ length: count }, (_, index) => ({
    ...mockTeamMember,
    id: `test-member-${index}`,
    user_id: `test-user-${index}`,
    team_id: teamId
  }));
};

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  TEAM_LOAD: 200, // ms
  MEMBER_LOAD: 150, // ms
  TEAM_CREATE: 500, // ms
  TEAM_UPDATE: 300, // ms
  INVITATION_SEND: 400, // ms
  SEARCH_RESPONSE: 100, // ms
} as const;

// Test helpers
export const waitForLoadingToFinish = async () => {
  // Wait for any pending async operations
  await new Promise(resolve => setTimeout(resolve, 0));
};

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

export * from '@testing-library/react';
export { customRender as render };