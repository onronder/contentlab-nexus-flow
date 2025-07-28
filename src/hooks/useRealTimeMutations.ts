import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { realTimeMonitoringService, MonitoringConfig } from '@/services/realTimeMonitoringService';
import { useToast } from '@/hooks/use-toast';
import { Alert } from './useRealTimeQueries';

// ==================== REAL-TIME MONITORING MUTATIONS ====================

export function useToggleRealTimeMonitoring(): UseMutationResult<
  boolean,
  Error,
  { competitorId: string; projectId: string; enabled: boolean }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ competitorId, projectId, enabled }) => {
      if (enabled) {
        return await realTimeMonitoringService.startRealTimeMonitoring(competitorId, projectId);
      } else {
        return await realTimeMonitoringService.stopRealTimeMonitoring(competitorId, projectId);
      }
    },
    onSuccess: (success, { competitorId, projectId, enabled }) => {
      if (!success) {
        throw new Error(`Failed to ${enabled ? 'start' : 'stop'} real-time monitoring`);
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['competitor', competitorId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['competitors', projectId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['realTimeMetrics', projectId] 
      });

      toast({
        title: 'Monitoring Updated',
        description: `Real-time monitoring ${enabled ? 'started' : 'stopped'} successfully.`,
      });
    },
    onError: (error, { enabled }) => {
      console.error('Error toggling real-time monitoring:', error);
      toast({
        title: 'Error',
        description: error.message || `Failed to ${enabled ? 'start' : 'stop'} real-time monitoring.`,
        variant: 'destructive',
      });
    },
  });
}

// ==================== ALERT MANAGEMENT MUTATIONS ====================

export function useAcknowledgeAlert(): UseMutationResult<
  Alert,
  Error,
  { alertId: string; projectId: string }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ alertId }) => {
      const { data, error } = await supabase
        .from('monitoring_alerts')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data as Alert;
    },
    onMutate: async ({ alertId, projectId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['alerts', projectId] });

      // Snapshot the previous value
      const previousAlerts = queryClient.getQueryData<Alert[]>(['alerts', projectId]);

      // Optimistically update the cache
      if (previousAlerts) {
        queryClient.setQueryData(
          ['alerts', projectId],
          previousAlerts.map(alert => 
            alert.id === alertId 
              ? { ...alert, is_read: true, read_at: new Date().toISOString() }
              : alert
          )
        );
      }

      return { previousAlerts };
    },
    onSuccess: (updatedAlert, { projectId }) => {
      // Update was successful, invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ['alerts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['realTimeMetrics', projectId] });

      toast({
        title: 'Alert Acknowledged',
        description: 'Alert has been marked as read.',
      });
    },
    onError: (error, { alertId, projectId }, context) => {
      // Revert optimistic update on error
      if (context?.previousAlerts) {
        queryClient.setQueryData(['alerts', projectId], context.previousAlerts);
      }

      console.error('Error acknowledging alert:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to acknowledge alert. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useBulkAcknowledgeAlerts(): UseMutationResult<
  Alert[],
  Error,
  { alertIds: string[]; projectId: string }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ alertIds }) => {
      const { data, error } = await supabase
        .from('monitoring_alerts')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('id', alertIds)
        .select();

      if (error) throw error;
      return data as Alert[];
    },
    onSuccess: (updatedAlerts, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['realTimeMetrics', projectId] });

      toast({
        title: 'Alerts Acknowledged',
        description: `${updatedAlerts.length} alerts have been marked as read.`,
      });
    },
    onError: (error) => {
      console.error('Error bulk acknowledging alerts:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to acknowledge alerts. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useSnoozeAlert(): UseMutationResult<
  Alert,
  Error,
  { alertId: string; projectId: string; snoozeUntil: Date }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ alertId, snoozeUntil }) => {
      // Store snooze information in alert_data
      const { data: currentAlert } = await supabase
        .from('monitoring_alerts')
        .select('alert_data')
        .eq('id', alertId)
        .single();

      const currentData = currentAlert?.alert_data as Record<string, any> || {};
      const updatedData = {
        ...currentData,
        snoozed: true,
        snooze_until: snoozeUntil.toISOString()
      };

      const { data, error } = await supabase
        .from('monitoring_alerts')
        .update({ 
          alert_data: updatedData,
          is_dismissed: true,
          dismissed_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data as Alert;
    },
    onSuccess: (updatedAlert, { projectId, snoozeUntil }) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['realTimeMetrics', projectId] });

      const duration = Math.ceil((snoozeUntil.getTime() - Date.now()) / (1000 * 60 * 60));
      toast({
        title: 'Alert Snoozed',
        description: `Alert has been snoozed for ${duration} hours.`,
      });
    },
    onError: (error) => {
      console.error('Error snoozing alert:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to snooze alert. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useDismissAlert(): UseMutationResult<
  Alert,
  Error,
  { alertId: string; projectId: string }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ alertId }) => {
      const { data, error } = await supabase
        .from('monitoring_alerts')
        .update({ 
          is_dismissed: true,
          dismissed_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data as Alert;
    },
    onSuccess: (updatedAlert, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['realTimeMetrics', projectId] });

      toast({
        title: 'Alert Dismissed',
        description: 'Alert has been dismissed.',
      });
    },
    onError: (error) => {
      console.error('Error dismissing alert:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to dismiss alert. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// ==================== ALERT PREFERENCES MUTATIONS ====================

export function useUpdateAlertPreferences(): UseMutationResult<
  any,
  Error,
  { competitorId: string; preferences: Partial<MonitoringConfig> }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ competitorId, preferences }) => {
      return await realTimeMonitoringService.updateMonitoringConfig(competitorId, preferences);
    },
    onSuccess: (success, { competitorId }) => {
      if (!success) {
        throw new Error('Failed to update alert preferences');
      }

      queryClient.invalidateQueries({ 
        queryKey: ['competitor', competitorId] 
      });

      toast({
        title: 'Preferences Updated',
        description: 'Alert preferences have been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating alert preferences:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update alert preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// ==================== MANUAL ANALYSIS TRIGGERS ====================

export function useTriggerAnalysis(): UseMutationResult<
  any,
  Error,
  { competitorId: string; analysisType: 'positioning' | 'content' | 'serp' | 'website' }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ competitorId, analysisType }) => {
      // Create analysis metadata record
      const { data, error } = await supabase
        .from('competitor_analysis_metadata')
        .insert({
          competitor_id: competitorId,
          analysis_type: analysisType,
          status: 'pending',
          started_at: new Date().toISOString(),
          parameters: {
            manual_trigger: true,
            triggered_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger the appropriate edge function
      let functionName = '';
      switch (analysisType) {
        case 'serp':
          functionName = 'serp-analysis';
          break;
        case 'website':
          functionName = 'web-scraping';
          break;
        default:
          functionName = 'generate-insights';
      }

      const { data: functionResult, error: functionError } = await supabase.functions.invoke(functionName, {
        body: { competitorId, analysisId: data.id }
      });

      if (functionError) {
        // Update analysis status to failed
        await supabase
          .from('competitor_analysis_metadata')
          .update({ 
            status: 'failed',
            completed_at: new Date().toISOString(),
            results_summary: { error: functionError.message }
          })
          .eq('id', data.id);
        
        throw functionError;
      }

      return { analysisId: data.id, result: functionResult };
    },
    onSuccess: (result, { competitorId, analysisType }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['competitor', competitorId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['competitorAnalytics', competitorId] 
      });

      toast({
        title: 'Analysis Started',
        description: `${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} analysis has been started.`,
      });
    },
    onError: (error, { analysisType }) => {
      console.error('Error triggering analysis:', error);
      toast({
        title: 'Error',
        description: error.message || `Failed to start ${analysisType} analysis. Please try again.`,
        variant: 'destructive',
      });
    },
  });
}

// ==================== MONITORING CONFIGURATION ====================

export function useUpdateMonitoringFrequency(): UseMutationResult<
  boolean,
  Error,
  { competitorId: string; frequency: 'hourly' | 'daily' | 'weekly' }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ competitorId, frequency }) => {
      const { data, error } = await supabase
        .from('project_competitors')
        .update({ analysis_frequency: frequency })
        .eq('id', competitorId)
        .select()
        .single();

      if (error) throw error;

      // Also update monitoring config
      await realTimeMonitoringService.updateMonitoringConfig(competitorId, { frequency });

      return true;
    },
    onSuccess: (success, { competitorId, frequency }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['competitor', competitorId] 
      });

      toast({
        title: 'Frequency Updated',
        description: `Monitoring frequency set to ${frequency}.`,
      });
    },
    onError: (error) => {
      console.error('Error updating monitoring frequency:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update monitoring frequency. Please try again.',
        variant: 'destructive',
      });
    },
  });
}