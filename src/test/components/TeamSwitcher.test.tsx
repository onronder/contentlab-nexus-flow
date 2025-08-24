import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { TeamSwitcher } from '@/components/team/TeamSwitcher';

// Mock hooks
vi.mock('@/contexts/TeamContext', () => ({
  useTeamContext: vi.fn()
}));

vi.mock('@/hooks/useAppPreferences', () => ({
  useAppPreferences: vi.fn(),
}));

const mockUseTeamContext = vi.mocked(await import('@/contexts/TeamContext')).useTeamContext;
const mockUseAppPreferences = vi.mocked(await import('@/hooks/useAppPreferences')).useAppPreferences;

const mockTeams = [
  { 
    id: '1', 
    name: 'Team Alpha', 
    slug: 'alpha',
    description: 'Test team',
    owner_id: 'user-1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    team_type: 'organization' as const,
    settings: {},
    member_limit: 50,
    current_member_count: 5,
    is_active: true
  },
  { 
    id: '2', 
    name: 'Team Beta', 
    slug: 'beta',
    description: 'Test team',
    owner_id: 'user-1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    team_type: 'organization' as const,
    settings: {},
    member_limit: 50,
    current_member_count: 3,
    is_active: true
  },
  { 
    id: '3', 
    name: 'Team Gamma', 
    slug: 'gamma',
    description: 'Test team',
    owner_id: 'user-1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    team_type: 'organization' as const,
    settings: {},
    member_limit: 50,
    current_member_count: 2,
    is_active: true
  }
];

const mockPreferences = {
  currentTeamId: '1',
  recentTeams: ['2', '3'],
  teamSwitchBehavior: 'remember' as const,
  crossDeviceSync: true
};

describe('TeamSwitcher', () => {
  beforeEach(() => {
    mockUseTeamContext.mockReturnValue({
      currentTeam: mockTeams[0],
      availableTeams: mockTeams,
      switchTeam: vi.fn(),
      isLoading: false,
      setCurrentTeam: vi.fn(),
      hasTeamAccess: vi.fn(),
      isTeamMember: vi.fn()
    });

    mockUseAppPreferences.mockReturnValue({
      data: mockPreferences,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isSuccess: true,
      isError: false,
      isPending: false
    } as any);
  });

  it('renders current team correctly', () => {
    render(<TeamSwitcher />);
    expect(screen.getByDisplayValue('Team Alpha')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseTeamContext.mockReturnValue({
      currentTeam: null,
      availableTeams: [],
      switchTeam: vi.fn(),
      isLoading: true,
      setCurrentTeam: vi.fn(),
      hasTeamAccess: vi.fn(),
      isTeamMember: vi.fn()
    });

    render(<TeamSwitcher />);
    expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
  });

  it('displays available teams in dropdown', async () => {
    render(<TeamSwitcher />);
    
    fireEvent.click(screen.getByRole('combobox'));
    
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
      expect(screen.getByText('Team Gamma')).toBeInTheDocument();
    });
  });

  it('displays recent teams section', async () => {
    render(<TeamSwitcher />);
    
    fireEvent.click(screen.getByRole('combobox'));
    
    await waitFor(() => {
      expect(screen.getByText('Recent Teams')).toBeInTheDocument();
    });
  });

  it('shows synced badge when cross-device sync is enabled', () => {
    render(<TeamSwitcher />);
    expect(screen.getByText('Synced')).toBeInTheDocument();
  });

  it('calls switchTeam when team is selected', async () => {
    const mockSwitchTeam = vi.fn();
    mockUseTeamContext.mockReturnValue({
      currentTeam: mockTeams[0],
      availableTeams: mockTeams,
      switchTeam: mockSwitchTeam,
      isLoading: false,
      setCurrentTeam: vi.fn(),
      hasTeamAccess: vi.fn(),
      isTeamMember: vi.fn()
    });

    render(<TeamSwitcher />);
    
    fireEvent.click(screen.getByRole('combobox'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Team Beta'));
    });

    expect(mockSwitchTeam).toHaveBeenCalledWith('2');
  });

  it('shows settings button when preferences are available', () => {
    render(<TeamSwitcher />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});