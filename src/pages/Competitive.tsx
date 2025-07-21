import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Users, Bell, BarChart3, Activity } from "lucide-react";
import { mockCompetitors } from "@/data/mockData";
import { AddCompetitorStepper } from "@/components/competitive/AddCompetitorStepper";

export default function Competitive() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);

  if (showAddCompetitor) {
    return (
      <AddCompetitorStepper 
        onComplete={() => setShowAddCompetitor(false)}
        onCancel={() => setShowAddCompetitor(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title gradient-text">
            Competitive Intelligence
          </h1>
          <p className="page-description">
            Monitor, analyze, and outperform your competitors with advanced intelligence
          </p>
        </div>
        <Button 
          onClick={() => setShowAddCompetitor(true)}
          className="shadow-glow hover:shadow-elegant"
          variant="hero"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Competitor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Competitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{mockCompetitors.length}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Monitoring</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {mockCompetitors.filter(c => c.monitoring_enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time tracking
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Market Share</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {Math.round(mockCompetitors.reduce((acc, c) => acc + c.metrics.market_share, 0) / mockCompetitors.length)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Industry average
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Velocity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {Math.round(mockCompetitors.reduce((acc, c) => acc + c.metrics.content_velocity, 0) / mockCompetitors.length)}
            </div>
            <p className="text-xs text-muted-foreground">
              Posts per week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Competitors
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="real-time" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real-time
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="section-title">Competitive Landscape</CardTitle>
              <CardDescription>
                Key insights about your competitive environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Competitive Overview Dashboard</h3>
                <p className="text-muted-foreground mb-6">
                  Get insights into market positioning, content performance, and competitive gaps.
                </p>
                <Button variant="outline">
                  View Detailed Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6">
          <div className="grid gap-6">
            {mockCompetitors.map((competitor) => (
              <Card key={competitor.id} className="shadow-elegant hover:shadow-stepper transition-elegant">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 card-title">
                        {competitor.name}
                        <Badge 
                          variant={competitor.priority_level === 'high' ? 'destructive' : 
                                   competitor.priority_level === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {competitor.priority_level} priority
                        </Badge>
                      </CardTitle>
                      <CardDescription className="font-mono text-sm">
                        {competitor.domain}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={competitor.monitoring_enabled ? "default" : "secondary"}>
                        {competitor.monitoring_enabled ? "Monitoring" : "Paused"}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {competitor.industry}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {competitor.metrics.market_share}%
                      </div>
                      <div className="text-xs text-muted-foreground">Market Share</div>
                    </div>
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {competitor.metrics.content_velocity}
                      </div>
                      <div className="text-xs text-muted-foreground">Content/Week</div>
                    </div>
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {competitor.metrics.social_engagement}%
                      </div>
                      <div className="text-xs text-muted-foreground">Engagement</div>
                    </div>
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {competitor.metrics.seo_score}
                      </div>
                      <div className="text-xs text-muted-foreground">SEO Score</div>
                    </div>
                  </div>
                  {competitor.description && (
                    <p className="text-sm text-muted-foreground mt-4">
                      {competitor.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Alert Center</CardTitle>
              <CardDescription>
                Configure and manage competitor monitoring alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Smart Alert System</h3>
                <p className="text-muted-foreground mb-6">
                  Set up intelligent alerts for competitor activities, content changes, and market movements.
                </p>
                <Button variant="outline">
                  Configure Alerts
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Competitive Analysis</CardTitle>
              <CardDescription>
                Deep dive into competitive insights and market positioning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground mb-6">
                  Generate comprehensive competitive analysis reports with AI-powered insights.
                </p>
                <Button variant="outline">
                  Start Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="real-time" className="space-y-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Real-time Monitoring</CardTitle>
              <CardDescription>
                Live feed of competitor activities and market changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Live Activity Feed</h3>
                <p className="text-muted-foreground mb-6">
                  Monitor competitor activities as they happen with real-time notifications.
                </p>
                <Button variant="outline">
                  View Live Feed
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
