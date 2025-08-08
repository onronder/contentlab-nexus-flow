import { useMemo } from "react";
import { useTeamMembers, useTeamActivity } from "@/hooks/useTeamQueries";
import { useTeamProjects } from "@/hooks/queries/useTeamAwareProjectQueries";
import { teamPerformanceMonitor } from "@/utils/teamPerformance";

export interface TeamPerformanceKPIs {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  completionRate: number; // percentage 0-100
  activeMembers: number;
  communicationCount30d: number;
  engagementScore: number; // 0-100
}

export interface MemberContribution {
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  activities: number;
  score: number;
}

export interface PerformanceTrendsPoint {
  name: string; // e.g., date label
  activities: number;
  messages: number;
  completions: number;
}

export interface TeamPerformanceMetricsResult {
  kpis: TeamPerformanceKPIs;
  memberContributions: MemberContribution[];
  trends: PerformanceTrendsPoint[];
  statusDistribution: Array<{ name: string; value: number }>;
  isLoading: boolean;
  error?: string;
}

function toDateLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function useTeamPerformanceMetrics(teamId: string): TeamPerformanceMetricsResult {
  const { data: membersResp, isLoading: membersLoading } = useTeamMembers(teamId);
  const { data: activities = [], isLoading: activityLoading } = useTeamActivity(teamId);
  const { data: projects = [], isLoading: projectsLoading } = useTeamProjects();

  const isLoading = membersLoading || activityLoading || projectsLoading;

  const result = useMemo<TeamPerformanceMetricsResult>(() => {
    try {
      const run = async () => {
        // no-op placeholder to get timing captured
        return true;
      };
      teamPerformanceMonitor.trackOperation('compute_team_performance_metrics', run);

      // Projects KPIs
      const totalProjects = projects?.length || 0;
      const completedProjects = projects?.filter((p: any) => p.status === 'completed').length || 0;
      const activeProjects = projects?.filter((p: any) => p.status === 'active').length || 0;
      const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

      // Members
      const members = membersResp?.members || [];
      const activeMembers = members.filter((m: any) => m.status === 'active' && m.is_active !== false).length;

      // Activities aggregation (last 30 days already from service)
      const byDay = new Map<string, { activities: number; messages: number; completions: number }>();
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        byDay.set(toDateLabel(day), { activities: 0, messages: 0, completions: 0 });
      }

      const communicationType = 'communication';
      activities.forEach((a: any) => {
        const createdAt = new Date(a.created_at || a.createdAt || Date.now());
        const label = toDateLabel(createdAt);
        if (!byDay.has(label)) return;
        const bucket = byDay.get(label)!;
        bucket.activities += 1;
        if (a.activity_type === communicationType || a.activityType === communicationType) {
          bucket.messages += 1;
        }
        if (a.activity_type === 'project_updated' || a.activityType === 'project_updated') {
          if (a.metadata?.status === 'completed' || a.activity_description?.includes('completed')) {
            bucket.completions += 1;
          }
        }
      });

      const trends: PerformanceTrendsPoint[] = Array.from(byDay.entries()).map(([name, v]) => ({ name, ...v }));

      // Communication count (30d)
      const communicationCount30d = activities.filter((a: any) => (a.activity_type === communicationType || a.activityType === communicationType)).length;

      // Engagement score: normalized activity/member over last 30d (capped to 100)
      const perMember = activeMembers > 0 ? (activities.length / activeMembers) : 0;
      const engagementScore = Math.max(0, Math.min(100, Math.round(perMember * 10)));

      // Member contributions
      const contributionMap = new Map<string, MemberContribution>();
      members.forEach((m: any) => {
        const uid = m.user?.id || m.user_id;
        contributionMap.set(uid, {
          userId: uid,
          name: m.user?.full_name || m.user?.email || 'Member',
          email: m.user?.email,
          avatarUrl: m.user?.avatar_url,
          activities: 0,
          score: 0,
        });
      });
      activities.forEach((a: any) => {
        const uid = a.user_id || a.userId;
        if (!uid) return;
        const mc = contributionMap.get(uid);
        if (mc) mc.activities += 1;
      });
      const memberContributions = Array.from(contributionMap.values())
        .map(m => ({ ...m, score: m.activities }))
        .sort((a, b) => b.activities - a.activities)
        .slice(0, 10);

      // Status distribution pie
      const statusDistribution = [
        { name: 'Active', value: activeProjects },
        { name: 'Completed', value: completedProjects },
        { name: 'Other', value: Math.max(0, totalProjects - activeProjects - completedProjects) },
      ];

      const kpis: TeamPerformanceKPIs = {
        totalProjects,
        activeProjects,
        completedProjects,
        completionRate,
        activeMembers,
        communicationCount30d,
        engagementScore,
      };

      return {
        kpis,
        memberContributions,
        trends,
        statusDistribution,
        isLoading: false,
      } as TeamPerformanceMetricsResult;
    } catch (e: any) {
      return {
        kpis: {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          completionRate: 0,
          activeMembers: 0,
          communicationCount30d: 0,
          engagementScore: 0,
        },
        memberContributions: [],
        trends: [],
        statusDistribution: [],
        isLoading: false,
        error: e?.message || 'Failed to compute team metrics',
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(membersResp), JSON.stringify(activities), JSON.stringify(projects)]);

  return {
    ...result,
    isLoading,
  };
}
