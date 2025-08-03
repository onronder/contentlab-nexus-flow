import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, TrendingUp, Users, Activity, Plus, Search, Filter, MoreHorizontal, Globe, MapPin, DollarSign, Eye, EyeOff, Edit, Trash2 } from "lucide-react";
import { AddCompetitorStepper } from "@/components/competitive/AddCompetitorStepper";
import { useState } from "react";
import { 
  useProjects, 
  useCreateCompetitor, 
  useDeleteCompetitor,
  useRealTimeCompetitors,
  useRealTimeAlerts,
  useRealTimeMetrics,
  useToggleRealTimeMonitoring,
  useAcknowledgeAlert,
  useDismissAlert
} from "@/hooks";
import { 
  useGenerateProjectInsights,
  useStartAnalysis,
  useCancelAnalysis
} from "@/hooks/useAnalysisMutations";
import { 
  useProjectInsights,
  useProjectAnalyses,
  useAnalysisStats
} from "@/hooks/useAnalysisQueries";
import { AnalysisResults } from "@/components/competitive/AnalysisResults";
import { AnalysisProgress } from "@/components/competitive/AnalysisProgress";
import { AnalysisMetrics } from "@/components/competitive/AnalysisMetrics";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { THREAT_LEVELS, COMPETITIVE_TIERS, CompetitorCreateInput } from "@/types/competitors";
import { Competitor } from "@/types/competitors";
import { useToast } from "@/hooks/use-toast";
import { AddCompetitorData } from "@/data/mockData";

export default function Competitive() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterThreatLevel, setFilterThreatLevel] = useState("all-threats");
  const [filterTier, setFilterTier] = useState("");
  
  const userId = useCurrentUserId();
  const { toast } = useToast();
  
  // Get user's projects to determine which project we're viewing
  const { data: projects } = useProjects();
  const currentProject = projects?.[0]; // For demo, use first project
  
  // Get real-time competitors data
  const { data: competitorsResult, isLoading } = useRealTimeCompetitors(
    currentProject?.id || '',
    !!currentProject?.id
  );
  
  // Get real-time metrics
  const { metrics: realTimeMetrics } = useRealTimeMetrics(
    currentProject?.id || '',
    !!currentProject?.id
  );
  
  // Get real-time alerts
  const { alerts, unreadCount } = useRealTimeAlerts(
    currentProject?.id || '',
    !!currentProject?.id
  );
  
  const createCompetitorMutation = useCreateCompetitor();
  const toggleMonitoringMutation = useToggleRealTimeMonitoring();
  const deleteCompetitorMutation = useDeleteCompetitor();
  const acknowledgeAlertMutation = useAcknowledgeAlert();
  const dismissAlertMutation = useDismissAlert();
  
  // Analysis mutations and queries
  const generateInsightsMutation = useGenerateProjectInsights();
  const startAnalysisMutation = useStartAnalysis();
  const cancelAnalysisMutation = useCancelAnalysis();
  
  const { data: projectInsights, isLoading: insightsLoading, refetch: refetchInsights } = useProjectInsights(
    currentProject?.id || '',
    !!currentProject?.id
  );
  
  const { data: projectAnalyses, isLoading: analysesLoading } = useProjectAnalyses(
    currentProject?.id || '',
    !!currentProject?.id
  );
  
  const { data: analysisStats } = useAnalysisStats(
    currentProject?.id || '',
    !!currentProject?.id
  );
  
  const competitors = competitorsResult?.competitors || [];
  
  // Use real-time metrics when available, fallback to calculated stats
  const totalCompetitors = realTimeMetrics?.totalCompetitors ?? competitors.length;
  const activeMonitoring = realTimeMetrics?.activeMonitoring ?? competitors.filter(c => c.monitoring_enabled).length;
  const recentAlerts = realTimeMetrics?.recentAlerts ?? 0;
  const analysesInProgress = realTimeMetrics?.analysesInProgress ?? 0;

  // Handle alert actions
  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!currentProject?.id) return;
    try {
      await acknowledgeAlertMutation.mutateAsync({
        alertId,
        projectId: currentProject.id
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    if (!currentProject?.id) return;
    try {
      await dismissAlertMutation.mutateAsync({
        alertId,
        projectId: currentProject.id
      });
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  // Transform AddCompetitorData to CompetitorCreateInput
  const transformCompetitorData = (formData: AddCompetitorData): CompetitorCreateInput => {
    // Map alert_frequency to analysis_frequency with proper type safety
    const getAnalysisFrequency = (frequency: string): 'daily' | 'weekly' | 'monthly' | 'quarterly' => {
      switch (frequency) {
        case 'daily': return 'daily';
        case 'weekly': return 'weekly';
        case 'monthly': return 'monthly';
        default: return 'weekly'; // Default fallback
      }
    };

    return {
      company_name: formData.name,
      domain: formData.domain,
      industry: formData.industry,
      company_size: formData.market_size,
      description: formData.description || undefined,
      competitive_tier: 'direct', // Default to direct competitor
      threat_level: formData.priority_level === 'high' ? 'high' : 
                   formData.priority_level === 'low' ? 'low' : 'medium',
      monitoring_enabled: formData.monitoring_enabled,
      analysis_frequency: getAnalysisFrequency(formData.alert_frequency),
      tags: formData.tags || []
    };
  };

  const handleAddCompetitor = async (formData: AddCompetitorData) => {
    if (!currentProject?.id) {
      toast({
        title: "Error",
        description: "No project selected. Please create a project first.",
        variant: "destructive"
      });
      return;
    }

    try {
      const competitorData = transformCompetitorData(formData);
      await createCompetitorMutation.mutateAsync({
        projectId: currentProject.id,
        competitorData
      });
      setShowAddCompetitor(false);
    } catch (error) {
      console.error('Error adding competitor:', error);
    }
  };

  const handleToggleMonitoring = async (competitor: Competitor) => {
    try {
      await toggleMonitoringMutation.mutateAsync({
        competitorId: competitor.id,
        enabled: !competitor.monitoring_enabled,
        projectId: competitor.project_id
      });
    } catch (error) {
      console.error('Error toggling monitoring:', error);
    }
  };

  const handleDeleteCompetitor = async (competitor: Competitor) => {
    try {
      await deleteCompetitorMutation.mutateAsync({
        competitorId: competitor.id,
        projectId: competitor.project_id,
        competitorName: competitor.company_name
      });
    } catch (error) {
      console.error('Error deleting competitor:', error);
    }
  };

  // Analysis handlers
  const handleStartProjectAnalysis = async () => {
    if (!currentProject?.id) {
      toast({
        title: "Error",
        description: "No project selected. Please create a project first.",
        variant: "destructive"
      });
      return;
    }
    
    if (competitors.length === 0) {
      toast({
        title: "No Competitors",
        description: "Add competitors before starting analysis.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await generateInsightsMutation.mutateAsync({ projectId: currentProject.id });
    } catch (error) {
      console.error('Error starting project analysis:', error);
    }
  };

  const handleStartCompetitorAnalysis = async (competitorId: string) => {
    try {
      await startAnalysisMutation.mutateAsync({
        competitorId,
        analysisType: 'positioning'
      });
    } catch (error) {
      console.error('Error starting competitor analysis:', error);
    }
  };

  const handleCancelAnalysis = async (analysisId: string) => {
    try {
      await cancelAnalysisMutation.mutateAsync({ analysisId });
    } catch (error) {
      console.error('Error canceling analysis:', error);
    }
  };

  const getThreatLevelColor = (level: string) => {
    const threat = THREAT_LEVELS.find(t => t.value === level);
    return threat?.color || 'gray';
  };

  const getTierLabel = (tier: string) => {
    const tierObj = COMPETITIVE_TIERS.find(t => t.value === tier);
    return tierObj?.label || tier;
  };

  if (showAddCompetitor) {
    return (
      <AddCompetitorStepper 
        onComplete={handleAddCompetitor}
        onCancel={() => setShowAddCompetitor(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Competitive Intelligence
          </h1>
          <p className="text-muted-foreground">
            Monitor, analyze, and outperform your competitors with advanced intelligence
          </p>
        </div>
        <Button onClick={() => setShowAddCompetitor(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Competitor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Competitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalCompetitors}</div>
            <p className="text-xs text-muted-foreground">Active competitors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Monitoring</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activeMonitoring}</div>
            <p className="text-xs text-muted-foreground">Real-time tracking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Alerts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{recentAlerts}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analyses Running</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{analysesInProgress}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="competitors" className="mt-6">
          {/* Search and Filter Controls */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search competitors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterThreatLevel} onValueChange={setFilterThreatLevel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by threat level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-threats">All threat levels</SelectItem>
                {THREAT_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              <div className="text-center py-8">Loading competitors...</div>
            ) : competitors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No competitors found.</p>
                <Button 
                  onClick={() => setShowAddCompetitor(true)}
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Competitor
                </Button>
              </div>
            ) : (
              competitors.map((competitor) => (
                <Card key={competitor.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold">{competitor.company_name}</h3>
                          <Badge variant="outline">{competitor.threat_level}</Badge>
                          {competitor.monitoring_enabled ? (
                            <Eye className="w-4 h-4 text-green-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{competitor.description || 'No description available'}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Globe className="w-4 h-4" />
                            <span>{competitor.domain}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStartCompetitorAnalysis(competitor.id)}>
                          <Activity className="w-4 h-4 mr-2" />
                          Start Analysis
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleMonitoring(competitor)}>
                          {competitor.monitoring_enabled ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-2" />
                              Disable Monitoring
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Enable Monitoring
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteCompetitor(competitor)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Competitor
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Other tabs remain unchanged for now */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Competitive intelligence overview</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Overview content coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alert Center {unreadCount > 0 && <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>}</CardTitle>
                  <CardDescription>
                    Real-time alerts for competitor activities and changes
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
                  <p className="text-muted-foreground mb-6">
                    You'll see real-time alerts here when competitors make significant changes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.slice(0, 10).map((alert) => (
                    <div key={alert.id} className={`p-4 border rounded-lg ${!alert.is_read ? 'bg-primary/5 border-primary/20' : 'bg-background'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'default' : 'secondary'}>
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!alert.is_read && (
                            <Button size="sm" variant="outline" onClick={() => handleAcknowledgeAlert(alert.id)}>
                              Mark Read
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDismissAlert(alert.id)}>
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {/* Analysis Metrics */}
          {analysisStats && (
            <AnalysisMetrics
              totalAnalyses={analysisStats.totalAnalyses}
              completedAnalyses={analysisStats.completedAnalyses}
              pendingAnalyses={analysisStats.pendingAnalyses}
              failedAnalyses={analysisStats.failedAnalyses}
              averageConfidence={analysisStats.averageConfidence}
              analysesByType={analysisStats.analysesByType}
              recentAnalyses={analysisStats.recentAnalyses}
            />
          )}

          {/* Analysis Progress */}
          {projectAnalyses && projectAnalyses.length > 0 && (
            <AnalysisProgress
              analyses={projectAnalyses}
              onCancelAnalysis={handleCancelAnalysis}
            />
          )}

          {/* Analysis Results */}
          <AnalysisResults
            insights={projectInsights}
            isLoading={insightsLoading}
            onRefresh={() => refetchInsights()}
          />

          {/* Start Analysis Section */}
          {(!projectInsights || !insightsLoading) && (
            <Card>
              <CardHeader>
                <CardTitle>Generate New Analysis</CardTitle>
                <CardDescription>
                  Create comprehensive competitive analysis reports with AI-powered insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Competitive Analysis</h3>
                  <p className="text-muted-foreground mb-6">
                    Analyze {competitors.length} competitors to generate strategic insights and recommendations.
                  </p>
                  <Button 
                    onClick={handleStartProjectAnalysis}
                    disabled={generateInsightsMutation.isPending || competitors.length === 0}
                    size="lg"
                  >
                    {generateInsightsMutation.isPending ? (
                      <>
                        <Activity className="mr-2 h-4 w-4 animate-spin" />
                        Generating Analysis...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Start Analysis
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
