import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Users, BarChart3, FileText, TrendingUp, Crown } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12 bg-gradient-hero rounded-xl text-white shadow-glow">
        <div className="flex items-center justify-center mb-4">
          <Crown className="h-12 w-12 mr-3" />
          <h1 className="text-4xl font-bold">ContentLab Nexus</h1>
        </div>
        <p className="text-xl text-white/90 mb-6 max-w-2xl mx-auto">
          The ultimate competitive intelligence platform for content marketing teams
        </p>
        <Button asChild variant="secondary" size="lg" className="text-primary">
          <Link to="/competitive">
            <Target className="mr-2 h-5 w-5" />
            Start Competitive Analysis
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-elegant hover:shadow-glow transition-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">12</div>
            <p className="text-xs text-muted-foreground">+3 this week</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-glow transition-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competitors Tracked</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">24</div>
            <p className="text-xs text-muted-foreground">Across 5 industries</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-glow transition-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">8</div>
            <p className="text-xs text-muted-foreground">Marketing team</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-glow transition-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">+23%</div>
            <p className="text-xs text-muted-foreground">vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-elegant hover:shadow-stepper transition-elegant">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              <CardTitle>Competitive Intelligence</CardTitle>
            </div>
            <CardDescription>
              Monitor and analyze competitor strategies with advanced AI-powered insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/competitive">Explore Features</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-stepper transition-elegant">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <CardTitle>Advanced Analytics</CardTitle>
            </div>
            <CardDescription>
              Deep dive into performance metrics and competitive positioning data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-stepper transition-elegant">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle>Team Collaboration</CardTitle>
            </div>
            <CardDescription>
              Work together seamlessly with your marketing team on competitive research
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates from your competitive intelligence dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce-gentle"></div>
                <div>
                  <p className="font-medium">New competitor added: Apple Inc.</p>
                  <p className="text-sm text-muted-foreground">Technology sector</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">2 hours ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <div>
                  <p className="font-medium">Analysis report generated</p>
                  <p className="text-sm text-muted-foreground">Q1 competitive landscape</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">1 day ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <div>
                  <p className="font-medium">Alert: Competitor launched new feature</p>
                  <p className="text-sm text-muted-foreground">Microsoft Corporation</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">3 days ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
