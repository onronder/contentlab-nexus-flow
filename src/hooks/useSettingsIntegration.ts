import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUserId } from './useCurrentUserId';

export interface SettingsIntegration {
  id: string;
  source_setting_type: string;
  source_entity_id: string;
  target_setting_type: string;
  target_entity_id: string;
  integration_type: 'inheritance' | 'override' | 'dependency' | 'sync';
  priority: number;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SettingsRecommendation {
  id: string;
  user_id: string;
  recommendation_type: 'optimization' | 'feature' | 'security' | 'productivity';
  setting_type: string;
  entity_id?: string;
  title: string;
  description: string;
  suggested_changes: Record<string, any>;
  confidence_score: number;
  impact_level: 'low' | 'medium' | 'high';
  status: 'pending' | 'accepted' | 'rejected' | 'dismissed';
  applied_at?: string;
  expires_at?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  rule_name: string;
  setting_type: string;
  trigger_conditions: Record<string, any>;
  actions: Array<Record<string, any>>;
  priority: number;
  is_active: boolean;
  user_id?: string;
  team_id?: string;
  execution_count: number;
  last_executed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const fetchSettingsIntegrations = async (userId: string): Promise<SettingsIntegration[]> => {
  const { data, error } = await supabase
    .from('settings_integrations')
    .select('*')
    .or(`source_entity_id.eq.${userId},target_entity_id.eq.${userId}`)
    .order('priority', { ascending: false });

  if (error) throw error;
  return (data || []).map(item => ({
    ...item,
    integration_type: item.integration_type as SettingsIntegration['integration_type'],
    metadata: item.metadata as Record<string, any>
  }));
};

const fetchSettingsRecommendations = async (userId: string): Promise<SettingsRecommendation[]> => {
  const { data, error } = await supabase
    .from('settings_recommendations')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('confidence_score', { ascending: false });

  if (error) throw error;
  return (data || []).map(item => ({
    ...item,
    recommendation_type: item.recommendation_type as SettingsRecommendation['recommendation_type'],
    impact_level: item.impact_level as SettingsRecommendation['impact_level'],
    status: item.status as SettingsRecommendation['status'],
    suggested_changes: item.suggested_changes as Record<string, any>,
    metadata: item.metadata as Record<string, any>
  }));
};

const fetchAutomationRules = async (userId: string): Promise<AutomationRule[]> => {
  const { data, error } = await supabase
    .from('settings_automation_rules')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: false });

  if (error) throw error;
  return (data || []).map(item => ({
    ...item,
    trigger_conditions: item.trigger_conditions as Record<string, any>,
    actions: item.actions as Array<Record<string, any>>
  }));
};

const createSettingsIntegration = async (integration: {
  source_setting_type: string;
  source_entity_id: string;
  target_setting_type: string;
  target_entity_id: string;
  integration_type: SettingsIntegration['integration_type'];
  priority?: number;
  is_active?: boolean;
  metadata?: Record<string, any>;
}): Promise<SettingsIntegration> => {
  const { data, error } = await supabase
    .from('settings_integrations')
    .insert(integration)
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    integration_type: data.integration_type as SettingsIntegration['integration_type'],
    metadata: data.metadata as Record<string, any>
  };
};

const updateRecommendationStatus = async (
  recommendationId: string, 
  status: SettingsRecommendation['status']
): Promise<void> => {
  const { error } = await supabase
    .from('settings_recommendations')
    .update({ 
      status, 
      applied_at: status === 'accepted' ? new Date().toISOString() : null 
    })
    .eq('id', recommendationId);

  if (error) throw error;
};

const createAutomationRule = async (rule: {
  rule_name: string;
  setting_type: string;
  trigger_conditions: Record<string, any>;
  actions: Array<Record<string, any>>;
  priority?: number;
  is_active?: boolean;
  user_id?: string;
  team_id?: string;
}): Promise<AutomationRule> => {
  const { data, error } = await supabase
    .from('settings_automation_rules')
    .insert(rule)
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    trigger_conditions: data.trigger_conditions as Record<string, any>,
    actions: data.actions as Array<Record<string, any>>
  };
};

const generateRecommendations = async (userId: string, settingType?: string): Promise<void> => {
  const { error } = await supabase.rpc('generate_settings_recommendations', {
    p_user_id: userId,
    p_setting_type: settingType
  });

  if (error) throw error;
};

export const useSettingsIntegrations = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['settings-integrations', userId],
    queryFn: () => fetchSettingsIntegrations(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSettingsRecommendations = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['settings-recommendations', userId],
    queryFn: () => fetchSettingsRecommendations(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useAutomationRules = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['automation-rules', userId],
    queryFn: () => fetchAutomationRules(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateSettingsIntegration = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const userId = useCurrentUserId();

  return useMutation({
    mutationFn: createSettingsIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-integrations', userId] });
      toast({
        title: "Integration Created",
        description: "Settings integration has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Integration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateRecommendationStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const userId = useCurrentUserId();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SettingsRecommendation['status'] }) =>
      updateRecommendationStatus(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['settings-recommendations', userId] });
      
      const messages = {
        accepted: "Recommendation applied successfully",
        rejected: "Recommendation rejected",
        dismissed: "Recommendation dismissed"
      };
      
      toast({
        title: "Recommendation Updated",
        description: messages[status] || "Status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCreateAutomationRule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const userId = useCurrentUserId();

  return useMutation({
    mutationFn: createAutomationRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules', userId] });
      toast({
        title: "Automation Rule Created",
        description: "Your automation rule is now active.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useGenerateRecommendations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const userId = useCurrentUserId();

  return useMutation({
    mutationFn: ({ settingType }: { settingType?: string }) =>
      generateRecommendations(userId!, settingType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-recommendations', userId] });
      toast({
        title: "Recommendations Generated",
        description: "New optimization suggestions are available.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useSettingsAnalytics = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['settings-analytics', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};