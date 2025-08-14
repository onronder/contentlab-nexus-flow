import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useTeamContext } from './TeamContext';

// Settings Types
export interface PlatformSettings {
  user: UserSettings;
  team: TeamSettings;
  project: ProjectSettings;
  content: ContentSettings;
  competitive: CompetitiveSettings;
  analytics: AnalyticsSettings;
}

export interface UserSettings {
  theme: {
    mode: 'light' | 'dark' | 'system';
    primaryColor: string;
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
  };
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
    categories: string[];
  };
  accessibility: {
    highContrast: boolean;
    keyboardNavigation: boolean;
    screenReader: boolean;
    reducedMotion: boolean;
  };
  language: {
    locale: string;
    timezone: string;
    dateFormat: string;
    numberFormat: string;
  };
}

export interface TeamSettings {
  collaboration: {
    autoApproval: boolean;
    memberInvites: boolean;
    publicProjects: boolean;
    commentModeration: boolean;
  };
  defaults: {
    projectVisibility: 'public' | 'team' | 'private';
    contentApproval: boolean;
    analysisFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

export interface ProjectSettings {
  dashboard: {
    defaultView: 'grid' | 'list' | 'kanban';
    chartsEnabled: string[];
    refreshInterval: number;
    autoRefresh: boolean;
  };
  analysis: {
    autoTrigger: boolean;
    scheduleEnabled: boolean;
    reportFormat: 'pdf' | 'html' | 'json';
    includeCharts: boolean;
  };
}

export interface ContentSettings {
  management: {
    defaultView: 'grid' | 'list';
    sortBy: 'date' | 'name' | 'type' | 'size';
    autoTags: boolean;
    autoCategories: boolean;
  };
  workflow: {
    requireApproval: boolean;
    autoPublish: boolean;
    versionControl: boolean;
    collaborationMode: boolean;
  };
}

export interface CompetitiveSettings {
  monitoring: {
    frequency: 'daily' | 'weekly' | 'monthly';
    alertThreshold: number;
    autoAnalysis: boolean;
    screenshotCapture: boolean;
  };
  analysis: {
    includeSerp: boolean;
    includePricing: boolean;
    includeContent: boolean;
    includeTechnical: boolean;
  };
}

export interface AnalyticsSettings {
  dashboard: {
    defaultPeriod: '7d' | '30d' | '90d' | '1y';
    chartTypes: string[];
    realTimeUpdates: boolean;
    exportFormat: 'csv' | 'xlsx' | 'json';
  };
  reports: {
    autoGenerate: boolean;
    schedule: string;
    recipients: string[];
    format: 'pdf' | 'html';
  };
}

interface SettingsContextType {
  settings: PlatformSettings | null;
  isLoading: boolean;
  error: Error | null;
  updateUserSettings: (updates: Partial<UserSettings>) => Promise<void>;
  updateTeamSettings: (updates: Partial<TeamSettings>) => Promise<void>;
  updateProjectSettings: (projectId: string, updates: Partial<ProjectSettings>) => Promise<void>;
  updateContentSettings: (updates: Partial<ContentSettings>) => Promise<void>;
  updateCompetitiveSettings: (updates: Partial<CompetitiveSettings>) => Promise<void>;
  updateAnalyticsSettings: (updates: Partial<AnalyticsSettings>) => Promise<void>;
  resetToDefaults: (scope: keyof PlatformSettings) => Promise<void>;
  exportSettings: () => Promise<string>;
  importSettings: (settingsData: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultUserSettings: UserSettings = {
  theme: {
    mode: 'system',
    primaryColor: 'hsl(var(--primary))',
    fontSize: 'medium',
    compactMode: false,
  },
  notifications: {
    email: true,
    push: false,
    inApp: true,
    frequency: 'daily',
    categories: ['project', 'team', 'competitor', 'content'],
  },
  accessibility: {
    highContrast: false,
    keyboardNavigation: true,
    screenReader: false,
    reducedMotion: false,
  },
  language: {
    locale: 'en-US',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/dd/yyyy',
    numberFormat: 'en-US',
  },
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentTeam } = useTeamContext();
  const queryClient = useQueryClient();

  // Fetch aggregated settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['platform-settings', user?.id, currentTeam?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('get_platform_settings', {
        p_user_id: user.id,
        p_team_id: currentTeam?.id || null,
      });

      if (error) throw error;

      return data || {
        user: defaultUserSettings,
        team: {},
        project: {},
        content: {},
        competitive: {},
        analytics: {},
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Real-time settings updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_settings',
          filter: currentTeam ? `team_id=eq.${currentTeam.id}` : undefined,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentTeam?.id, queryClient]);

  const updateUserSettings = async (updates: Partial<UserSettings>) => {
    if (!user?.id) throw new Error('User not authenticated');

    const { error } = await supabase.rpc('update_user_settings_safe', {
      p_user_id: user.id,
      p_settings: updates,
    });

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
  };

  const updateTeamSettings = async (updates: Partial<TeamSettings>) => {
    if (!currentTeam?.id) throw new Error('No active team');

    const { error } = await supabase.rpc('update_team_settings_safe', {
      p_team_id: currentTeam.id,
      p_settings: updates,
    });

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
  };

  const updateProjectSettings = async (projectId: string, updates: Partial<ProjectSettings>) => {
    const { error } = await supabase.rpc('update_project_settings_safe', {
      p_project_id: projectId,
      p_settings: updates,
    });

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
  };

  const updateContentSettings = async (updates: Partial<ContentSettings>) => {
    if (!user?.id) throw new Error('User not authenticated');

    const { error } = await supabase.rpc('update_content_settings_safe', {
      p_user_id: user.id,
      p_settings: updates,
    });

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
  };

  const updateCompetitiveSettings = async (updates: Partial<CompetitiveSettings>) => {
    if (!user?.id) throw new Error('User not authenticated');

    const { error } = await supabase.rpc('update_competitive_settings_safe', {
      p_user_id: user.id,
      p_settings: updates,
    });

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
  };

  const updateAnalyticsSettings = async (updates: Partial<AnalyticsSettings>) => {
    if (!user?.id) throw new Error('User not authenticated');

    const { error } = await supabase.rpc('update_analytics_settings_safe', {
      p_user_id: user.id,
      p_settings: updates,
    });

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
  };

  const resetToDefaults = async (scope: keyof PlatformSettings) => {
    if (!user?.id) throw new Error('User not authenticated');

    const { error } = await supabase.rpc('reset_settings_to_defaults', {
      p_user_id: user.id,
      p_scope: scope,
    });

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
  };

  const exportSettings = async (): Promise<string> => {
    if (!settings) throw new Error('No settings to export');
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = async (settingsData: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const importedSettings = JSON.parse(settingsData);
      
      const { error } = await supabase.rpc('import_user_settings', {
        p_user_id: user.id,
        p_settings_data: importedSettings,
      });

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    } catch (error) {
      throw new Error('Invalid settings data format');
    }
  };

  const value: SettingsContextType = {
    settings,
    isLoading,
    error,
    updateUserSettings,
    updateTeamSettings,
    updateProjectSettings,
    updateContentSettings,
    updateCompetitiveSettings,
    updateAnalyticsSettings,
    resetToDefaults,
    exportSettings,
    importSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}