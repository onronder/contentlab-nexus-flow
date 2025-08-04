import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from './useCurrentUserId';
import { useOptimizedQuery } from './useOptimizedQueries';

export interface MonitoringAlert {
  id: string;
  title: string;
  company: string;
  severity: 'high' | 'medium' | 'low';
  time: string;
  description: string;
  isRead: boolean;
  isDismissed: boolean;
  alertType: string;
  alertData?: any;
}

const fetchMonitoringAlerts = async (userId: string): Promise<MonitoringAlert[]> => {
  // First get user's projects
  const { data: userProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id')
    .eq('created_by', userId);

  if (projectsError) throw projectsError;

  const projectIds = userProjects?.map(p => p.id) || [];

  if (projectIds.length === 0) {
    return [];
  }

  // Fetch monitoring alerts for user's projects
  const { data: alerts, error } = await supabase
    .from('monitoring_alerts')
    .select(`
      id,
      title,
      description,
      severity,
      alert_type,
      alert_data,
      is_read,
      is_dismissed,
      created_at,
      project_id,
      competitor_id
    `)
    .in('project_id', projectIds)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  // Get competitor names separately to avoid join issues
  const competitorIds = alerts?.map(a => a.competitor_id).filter(Boolean) || [];
  let competitorNames: Record<string, string> = {};
  
  if (competitorIds.length > 0) {
    const { data: competitors } = await supabase
      .from('project_competitors')
      .select('id, company_name')
      .in('id', competitorIds);
    
    competitorNames = competitors?.reduce((acc, comp) => ({
      ...acc,
      [comp.id]: comp.company_name
    }), {}) || {};
  }

  return alerts?.map(alert => ({
    id: alert.id,
    title: alert.title,
    company: alert.competitor_id ? competitorNames[alert.competitor_id] || 'Unknown Company' : 'System Alert',
    severity: alert.severity as 'high' | 'medium' | 'low',
    time: getTimeAgo(new Date(alert.created_at)),
    description: alert.description,
    isRead: alert.is_read,
    isDismissed: alert.is_dismissed,
    alertType: alert.alert_type,
    alertData: alert.alert_data
  })) || [];
};

const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
};

export const useMonitoringAlerts = () => {
  const userId = useCurrentUserId();

  return useOptimizedQuery({
    queryKey: ['monitoring-alerts', userId],
    queryFn: () => fetchMonitoringAlerts(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 3 * 60 * 1000, // 3 minutes
    enabledOnline: true,
    offlineStaleTime: 15 * 60 * 1000, // 15 minutes offline
  });
};