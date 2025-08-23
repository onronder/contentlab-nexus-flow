import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { realTimeMonitoringService, RealTimeUpdate } from '@/services/realTimeMonitoringService';
import { useCompetitors, useCompetitor } from './useCompetitorQueries';
import { competitorQueryKeys } from './useCompetitorQueries';
import { Competitor } from '@/types/competitors';

// ==================== REAL-TIME COMPETITORS ====================

export function useRealTimeCompetitors(projectId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Base competitor query
  const competitorsQuery = useCompetitors(projectId, undefined, undefined, 1, 50, enabled);
  
  useEffect(() => {
    if (!enabled || !projectId) return;

    let unsubscribe: (() => void) | undefined;

    const setupRealTime = async () => {
      // Start project monitoring
      await realTimeMonitoringService.startProjectMonitoring(projectId);
      
      // Subscribe to real-time updates
      unsubscribe = realTimeMonitoringService.subscribeToUpdates(projectId, (update: RealTimeUpdate) => {
        console.log('Real-time competitor update:', update);
        
        // Invalidate and refetch competitor data
        if (update.type === 'competitor_update') {
          queryClient.invalidateQueries({
            queryKey: competitorQueryKeys.list(projectId)
          });
          setLastUpdate(new Date());
        }
      });
    };

    setupRealTime();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [projectId, enabled, queryClient]);

  return {
    ...competitorsQuery,
    lastUpdate,
    isRealTime: true
  };
}

// ==================== REAL-TIME ALERTS ====================

export interface Alert {
  id: string;
  project_id: string;
  competitor_id?: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  alert_data: any;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

export function useRealTimeAlerts(projectId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch initial alerts
  const alertsQuery = useQuery({
    queryKey: ['alerts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monitoring_alerts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Alert[];
    },
    enabled: enabled && !!projectId,
    staleTime: 30000, // 30 seconds
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!enabled || !projectId) return;

    const channel = supabase
      .channel(`alerts_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monitoring_alerts',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Real-time alert update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newAlert = payload.new as Alert;
            setAlerts(current => [newAlert, ...current]);
            if (!newAlert.is_read) {
              setUnreadCount(current => current + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedAlert = payload.new as Alert;
            setAlerts(current => 
              current.map(alert => 
                alert.id === updatedAlert.id ? updatedAlert : alert
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedAlert = payload.old as Alert;
            setAlerts(current => 
              current.filter(alert => alert.id !== deletedAlert.id)
            );
          }
          
          setLastUpdate(new Date());
          
          // Invalidate alerts query to keep cache in sync
          queryClient.invalidateQueries({ queryKey: ['alerts', projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, enabled, queryClient]);

  // Update alerts when query data changes
  useEffect(() => {
    if (alertsQuery.data) {
      setAlerts(alertsQuery.data);
      setUnreadCount(alertsQuery.data.filter(alert => !alert.is_read).length);
    }
  }, [alertsQuery.data]);

  return {
    alerts,
    unreadCount,
    lastUpdate,
    isLoading: alertsQuery.isLoading,
    error: alertsQuery.error,
    isRealTime: true,
    refetch: alertsQuery.refetch
  };
}

// ==================== REAL-TIME MONITORING STATUS ====================

export function useMonitoringStatus(competitorId: string, projectId: string, enabled: boolean = true) {
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // Get competitor data to check monitoring status
  const competitorQuery = useCompetitor(competitorId, enabled && !!competitorId);

  useEffect(() => {
    if (!enabled || !competitorId || !projectId) return;

    // Check monitoring session status
    const checkStatus = async () => {
      try {
        const session = await realTimeMonitoringService.getMonitoringStatus(competitorId, projectId);
        setSessionInfo(session);
        setIsMonitoring(session?.isActive || false);
        setLastUpdate(session?.lastUpdate || null);
      } catch (error) {
        console.error('Failed to check monitoring status:', error);
      }
    };

    // Initial check
    checkStatus();

    // Set up periodic status checks
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds

    // Set up real-time subscription for competitor updates
    const unsubscribe = realTimeMonitoringService.subscribeToUpdates(projectId, (update: RealTimeUpdate) => {
      if (update.competitorId === competitorId) {
        setLastUpdate(new Date(update.timestamp));
      }
    });

    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, [competitorId, projectId, enabled]);

  // Update monitoring status from competitor data
  useEffect(() => {
    if (competitorQuery.data) {
      setIsMonitoring(competitorQuery.data.monitoring_enabled);
    }
  }, [competitorQuery.data]);

  return {
    isMonitoring,
    lastUpdate,
    sessionInfo,
    competitorData: competitorQuery.data,
    isLoading: competitorQuery.isLoading,
    error: competitorQuery.error,
    isRealTime: true
  };
}

// ==================== REAL-TIME METRICS ====================

export interface RealTimeMetrics {
  totalCompetitors: number;
  activeMonitoring: number;
  recentAlerts: number;
  analysesInProgress: number;
  lastDataUpdate: Date;
}

export function useRealTimeMetrics(projectId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    totalCompetitors: 0,
    activeMonitoring: 0,
    recentAlerts: 0,
    analysesInProgress: 0,
    lastDataUpdate: new Date()
  });

  // Fetch initial metrics
  const metricsQuery = useQuery({
    queryKey: ['realTimeMetrics', projectId],
    queryFn: async () => {
      const [competitorsResult, alertsResult, analysisResult] = await Promise.all([
        supabase
          .from('project_competitors')
          .select('id, monitoring_enabled')
          .eq('project_id', projectId)
          .eq('status', 'active'),
        supabase
          .from('monitoring_alerts')
          .select('id')
          .eq('project_id', projectId)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('competitor_analysis_metadata')
          .select('id')
          .eq('status', 'pending')
          .gte('started_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      ]);

      const competitors = competitorsResult.data || [];
      const alerts = alertsResult.data || [];
      const analyses = analysisResult.data || [];

      return {
        totalCompetitors: competitors.length,
        activeMonitoring: competitors.filter(c => c.monitoring_enabled).length,
        recentAlerts: alerts.length,
        analysesInProgress: analyses.length,
        lastDataUpdate: new Date()
      } as RealTimeMetrics;
    },
    enabled: enabled && !!projectId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Set up real-time subscriptions
  useEffect(() => {
    if (!enabled || !projectId) return;

    let unsubscribe: (() => void) | undefined;

    const setupRealTimeMetrics = async () => {
      // Subscribe to updates that affect metrics
      unsubscribe = realTimeMonitoringService.subscribeToUpdates(projectId, (update: RealTimeUpdate) => {
        console.log('Metrics update:', update);
        
        // Update metrics based on the type of update
        setMetrics(current => {
          const updated = { ...current, lastDataUpdate: new Date() };
          
          switch (update.type) {
            case 'competitor_update':
              // Trigger refetch to get accurate counts
              queryClient.invalidateQueries({ queryKey: ['realTimeMetrics', projectId] });
              break;
            case 'alert':
              updated.recentAlerts = current.recentAlerts + 1;
              break;
            case 'competitor_update':
              updated.analysesInProgress = Math.max(0, current.analysesInProgress - 1);
              break;
          }
          
          return updated;
        });
      });
    };

    setupRealTimeMetrics();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [projectId, enabled, queryClient]);

  // Update metrics when query data changes
  useEffect(() => {
    if (metricsQuery.data) {
      setMetrics(metricsQuery.data);
    }
  }, [metricsQuery.data]);

  return {
    metrics,
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
    refetch: metricsQuery.refetch,
    isRealTime: true
  };
}

// ==================== REAL-TIME SERP DATA ====================

export function useRealTimeSerpData(competitorId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const [serpData, setSerpData] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch initial SERP data
  const serpQuery = useQuery({
    queryKey: ['serpData', competitorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_serp_data')
        .select('*')
        .eq('competitor_id', competitorId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: enabled && !!competitorId,
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!enabled || !competitorId) return;

    const channel = supabase
      .channel(`serp_${competitorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'competitor_serp_data',
          filter: `competitor_id=eq.${competitorId}`
        },
        (payload) => {
          console.log('Real-time SERP update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setSerpData(current => [payload.new, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setSerpData(current => 
              current.map(item => 
                item.id === payload.new.id ? payload.new : item
              )
            );
          }
          
          setLastUpdate(new Date());
          queryClient.invalidateQueries({ queryKey: ['serpData', competitorId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [competitorId, enabled, queryClient]);

  // Update SERP data when query data changes
  useEffect(() => {
    if (serpQuery.data) {
      setSerpData(serpQuery.data);
    }
  }, [serpQuery.data]);

  return {
    serpData,
    lastUpdate,
    isLoading: serpQuery.isLoading,
    error: serpQuery.error,
    isRealTime: true,
    refetch: serpQuery.refetch
  };
}
