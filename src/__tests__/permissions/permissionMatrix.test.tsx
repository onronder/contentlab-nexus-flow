import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionMatrix } from '@/components/permissions/PermissionMatrix';

// Mock hooks
vi.mock('@/hooks/usePermissionQueries', () => ({
  usePermissionMatrix: vi.fn()
}));

vi.mock('@/hooks/usePermissionMutations', () => ({
  useAssignPermissions: vi.fn()
}));

const mockPermissionMatrix = {
  permissions: [
    {
      id: 'perm1',
      name: 'Create Projects',
      slug: 'projects.create',
      module: 'projects',
      action: 'create',
      description: 'Create new projects'
    },
    {
      id: 'perm2',
      name: 'Read Projects',
      slug: 'projects.read',
      module: 'projects',
      action: 'read',
      description: 'View projects'
    }
  ],
  roles: [
    {
      id: 'role1',
      name: 'Admin',
      slug: 'admin',
      hierarchy_level: 10
    },
    {
      id: 'role2',
      name: 'User',
      slug: 'user',
      hierarchy_level: 1
    }
  ],
  matrix: {
    role1: [
      { id: 'perm1', slug: 'projects.create' },
      { id: 'perm2', slug: 'projects.read' }
    ],
    role2: [
      { id: 'perm2', slug: 'projects.read' }
    ]
  }
};

describe('PermissionMatrix', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    vi.clearAllMocks();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should render permission matrix correctly', async () => {
    const { usePermissionMatrix } = await import('@/hooks/usePermissionQueries');
    (usePermissionMatrix as any).mockReturnValue({
      data: mockPermissionMatrix,
      isLoading: false,
      error: null
    });

    renderWithQueryClient(<PermissionMatrix />);

    expect(screen.getByText('Permission Matrix')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Create Projects')).toBeInTheDocument();
    expect(screen.getByText('Read Projects')).toBeInTheDocument();
  });

  it('should show loading state', async () => {
    const { usePermissionMatrix } = await import('@/hooks/usePermissionQueries');
    (usePermissionMatrix as any).mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    });

    renderWithQueryClient(<PermissionMatrix />);

    expect(screen.getByText('Loading permission matrix...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    const { usePermissionMatrix } = await import('@/hooks/usePermissionQueries');
    (usePermissionMatrix as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Failed to load permissions'
    });

    renderWithQueryClient(<PermissionMatrix />);

    expect(screen.getByText(/Failed to load permission matrix/)).toBeInTheDocument();
  });

  it('should toggle permissions when not read-only', async () => {
    const { usePermissionMatrix } = await import('@/hooks/usePermissionQueries');
    const { useAssignPermissions } = await import('@/hooks/usePermissionMutations');
    
    (usePermissionMatrix as any).mockReturnValue({
      data: mockPermissionMatrix,
      isLoading: false,
      error: null
    });

    const mockMutate = vi.fn();
    (useAssignPermissions as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false
    });

    renderWithQueryClient(<PermissionMatrix readOnly={false} />);

    // Find a permission switch and click it
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);

    // Should show save button for the role
    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    // Click save button
    fireEvent.click(screen.getByText('Save'));

    expect(mockMutate).toHaveBeenCalled();
  });

  it('should display permission counts correctly', async () => {
    const { usePermissionMatrix } = await import('@/hooks/usePermissionQueries');
    (usePermissionMatrix as any).mockReturnValue({
      data: mockPermissionMatrix,
      isLoading: false,
      error: null
    });

    renderWithQueryClient(<PermissionMatrix />);

    // Admin should have 2 permissions
    expect(screen.getByText('2 permissions')).toBeInTheDocument();
    // User should have 1 permission
    expect(screen.getByText('1 permission')).toBeInTheDocument();
  });

  it('should group permissions by module', async () => {
    const { usePermissionMatrix } = await import('@/hooks/usePermissionQueries');
    (usePermissionMatrix as any).mockReturnValue({
      data: mockPermissionMatrix,
      isLoading: false,
      error: null
    });

    renderWithQueryClient(<PermissionMatrix />);

    // Should show projects module
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('should handle permission change callback', async () => {
    const { usePermissionMatrix } = await import('@/hooks/usePermissionQueries');
    (usePermissionMatrix as any).mockReturnValue({
      data: mockPermissionMatrix,
      isLoading: false,
      error: null
    });

    const onPermissionChange = vi.fn();

    renderWithQueryClient(
      <PermissionMatrix onPermissionChange={onPermissionChange} readOnly={false} />
    );

    // Toggle a permission
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);

    // Save changes
    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onPermissionChange).toHaveBeenCalled();
    });
  });

  it('should show read-only indicators when readOnly is true', async () => {
    const { usePermissionMatrix } = await import('@/hooks/usePermissionQueries');
    (usePermissionMatrix as any).mockReturnValue({
      data: mockPermissionMatrix,
      isLoading: false,
      error: null
    });

    renderWithQueryClient(<PermissionMatrix readOnly={true} />);

    // Should show check/X icons instead of switches
    const checkIcons = screen.getAllByTestId(/permission-indicator-/);
    expect(checkIcons.length).toBeGreaterThan(0);

    // Should not show any save buttons
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });
});