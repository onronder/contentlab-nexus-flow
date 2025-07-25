
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Users, BarChart3, FileText, TrendingUp, Crown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks";

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    console.log('Index page auth state:', { isAuthenticated, isLoading });
    if (!isLoading && isAuthenticated) {
      console.log('Redirecting to dashboard...');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-glow mx-auto animate-pulse">
            <Crown className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show landing page for unauthenticated users
  if (isAuthenticated) {
    return null; // Will redirect
  }
  return (
    <div className="space-y-8">
      {/* Enhanced Hero Section */}
      <div className="relative overflow-hidden">
        <div className="gradient-mesh absolute inset-0 opacity-40" />
        <div className="relative glass-card p-12 rounded-3xl border-0 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-glow mr-4">
              <Crown className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="page-title logo-contentlab">ContentLab Nexus</h1>
          </div>
          <p className="page-description max-w-3xl mx-auto">
            The ultimate competitive intelligence platform for content marketing teams
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="hero" size="xl" className="group">
              <Link to="/login">
                <Target className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                Get Started
              </Link>
            </Button>
            <Button asChild variant="glass" size="xl">
              <Link to="/login">
                Sign In
              </Link>
            </Button>
          </div>
        </div>
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
              <CardTitle className="card-title">Competitive Intelligence</CardTitle>
            </div>
            <CardDescription>
              Monitor and analyze competitor strategies with advanced AI-powered insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Get Started</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-stepper transition-elegant">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <CardTitle className="card-title">Advanced Analytics</CardTitle>
            </div>
            <CardDescription>
              Deep dive into performance metrics and competitive positioning data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Get Started</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-stepper transition-elegant">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle className="card-title">Team Collaboration</CardTitle>
            </div>
            <CardDescription>
              Work together seamlessly with your marketing team on competitive research
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Get Started</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="section-title">Recent Activity</CardTitle>
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
