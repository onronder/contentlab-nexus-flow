import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import Dashboard from '@/pages/Dashboard';

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDashboardStats', () => ({
  useDashboardStats: () => ({
    data: {
      totalProjects: 5,
      totalTeams: 2,
      totalContent: 10,
      totalAnalytics: 25,
    },
    isLoading: false,
  }),
}));

describe('Dashboard', () => {
  it('renders dashboard statistics', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('5')).toBeInTheDocument(); // totalProjects
    expect(screen.getByText('2')).toBeInTheDocument(); // totalTeams
  });

  it('handles navigation correctly', () => {
    render(<Dashboard />);
    
    const projectsLink = screen.getByText(/projects/i);
    expect(projectsLink).toBeInTheDocument();
  });
});