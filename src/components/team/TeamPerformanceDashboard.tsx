import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { ProjectLineChart, ProjectBarChart, ProjectPieChart } from "@/components/analytics/AnalyticsCharts";
import { useTeamPerformanceMetrics } from "@/hooks/analytics/useTeamPerformanceMetrics";
import { MessageCircle, Users, CheckCircle2, Activity } from "lucide-react";

interface TeamPerformanceDashboardProps {
  teamId: string;
}

export function TeamPerformanceDashboard({ teamId }: TeamPerformanceDashboardProps) {
  const { kpis, trends, memberContributions, statusDistribution, isLoading, error } = useTeamPerformanceMetrics(teamId);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Completion Rate"
          value={`${kpis.completionRate}%`}
          description="Projects completed"
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant={kpis.completionRate >= 80 ? 'success' : kpis.completionRate >= 60 ? 'warning' : 'error'}
          isLoading={isLoading}
          error={error}
        />
        <AnalyticsCard
          title="Active Members"
          value={kpis.activeMembers}
          description="Engaged collaborators"
          icon={<Users className="h-5 w-5" />}
          isLoading={isLoading}
          error={error}
        />
        <AnalyticsCard
          title="Messages (30d)"
          value={kpis.communicationCount30d}
          description="Collaboration activity"
          icon={<MessageCircle className="h-5 w-5" />}
          isLoading={isLoading}
          error={error}
        />
        <AnalyticsCard
          title="Engagement Score"
          value={kpis.engagementScore}
          description="Activity per member"
          icon={<Activity className="h-5 w-5" />}
          variant={kpis.engagementScore >= 70 ? 'success' : kpis.engagementScore >= 40 ? 'warning' : 'error'}
          isLoading={isLoading}
          error={error}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProjectLineChart
          title="Team Activity Trends"
          description="Daily activities, messages, and completions (last 30 days)"
          data={trends.map(t => ({ ...t, value: t.activities }))}
          lines={[
            { dataKey: 'activities', name: 'Activities' },
            { dataKey: 'messages', name: 'Messages' },
            { dataKey: 'completions', name: 'Completions' },
          ]}
          showArea
          isLoading={isLoading}
          error={error}
          height={320}
        />

        <ProjectBarChart
          title="Top Contributors"
          description="Most active team members"
          data={memberContributions.map(m => ({ name: m.name, value: m.activities }))}
          isLoading={isLoading}
          error={error}
          height={320}
        />

        <ProjectPieChart
          title="Project Status"
          description="Distribution of project states"
          data={statusDistribution}
          isLoading={isLoading}
          error={error}
          height={320}
        />
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            {/* Simple heuristic recommendations */}
            {kpis.completionRate < 60 && (
              <li>Completion rate is below target. Consider prioritizing blockers and revisiting timelines.</li>
            )}
            {kpis.engagementScore < 40 && (
              <li>Engagement is low. Encourage communication and assign clear responsibilities.</li>
            )}
            {kpis.communicationCount30d < Math.max(10, kpis.activeMembers * 2) && (
              <li>Communication frequency could be improved. Try weekly stand-ups or async updates.</li>
            )}
            {kpis.completionRate >= 80 && (
              <li>Great job! The team is meeting goals consistently. Consider raising targets carefully.</li>
            )}
            {memberContributions.length === 0 && (
              <li>No recent activity detected. Verify team membership and project activity sources.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
