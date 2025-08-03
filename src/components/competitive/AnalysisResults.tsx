import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Target, AlertTriangle, Lightbulb, Download, Clock } from "lucide-react";
import { ProjectInsights } from "@/services/aiAnalysisService";

interface AnalysisResultsProps {
  insights: ProjectInsights | null;
  isLoading: boolean;
  onRefresh: () => void;
}

interface AnalysisOpportunity {
  title: string;
  description: string;
  impact: string;
  actionItems?: string[];
}

interface AnalysisThreat {
  title: string;
  description: string;
  severity: string;
  mitigation?: string[];
}

interface AnalysisRecommendation {
  title: string;
  description: string;
  priority: string;
  implementation?: string[];
}

export function AnalysisResults({ insights, isLoading, onRefresh }: AnalysisResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No analysis results available yet. Start an analysis to see competitive insights.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analysis Results</h2>
          <p className="text-sm text-muted-foreground">
            Generated on {new Date(insights.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh}>
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Competitive Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Competitive Overview
          </CardTitle>
          <CardDescription>
            Analysis of competitive landscape
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{insights.competitiveOverview || 'Analysis results available'}</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">{insights.projectId ? 'Available' : '0'}</div>
              <div className="text-sm text-muted-foreground">Analysis Complete</div>
            </div>
            <div className="text-center p-4 bg-orange-500/5 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {insights.topThreats?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Identified Threats</div>
            </div>
            <div className="text-center p-4 bg-green-500/5 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {insights.marketOpportunities?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Market Opportunities</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Opportunities */}
      {insights.marketOpportunities && insights.marketOpportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Market Opportunities
            </CardTitle>
            <CardDescription>
              Identified gaps and growth opportunities in the market
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.marketOpportunities.map((opportunity, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">Opportunity {index + 1}</h4>
                    <Badge variant="secondary" className="text-green-600 bg-green-50">
                      High Impact
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{opportunity}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Threats */}
      {insights.topThreats && insights.topThreats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Competitive Threats
            </CardTitle>
            <CardDescription>
              Potential risks and competitive challenges to monitor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.topThreats.map((threat, index) => (
                <div key={index} className="p-4 border rounded-lg border-red-200 bg-red-50/50">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">Threat {index + 1}</h4>
                    <Badge variant="destructive">
                      High
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{threat}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Recommendations */}
      {insights.strategicRecommendations && insights.strategicRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Strategic Recommendations
            </CardTitle>
            <CardDescription>
              AI-powered strategic insights based on competitive analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.strategicRecommendations.map((recommendation, index) => (
                <div key={index} className="p-4 border rounded-lg bg-blue-50/50">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">Recommendation {index + 1}</h4>
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      Priority
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}