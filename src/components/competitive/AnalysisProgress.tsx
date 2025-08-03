import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle, AlertCircle, Clock, X } from "lucide-react";
import { CompetitorAnalysisMetadata } from "@/types/competitors";

interface AnalysisProgressProps {
  analyses: CompetitorAnalysisMetadata[];
  onCancelAnalysis?: (analysisId: string) => void;
}

export function AnalysisProgress({ analyses, onCancelAnalysis }: AnalysisProgressProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getProgress = (status: string) => {
    switch (status) {
      case 'completed':
        return 100;
      case 'running':
        return 60; // Estimated progress for running analyses
      case 'failed':
        return 0;
      default:
        return 10; // Pending analyses
    }
  };

  if (analyses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Analysis Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No active analyses. Start an analysis to track progress here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Analysis Progress ({analyses.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <div key={analysis.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(analysis.status)}
                  <span className="font-medium">
                    {analysis.analysis_type} Analysis
                  </span>
                  <Badge className={getStatusColor(analysis.status)}>
                    {analysis.status}
                  </Badge>
                </div>
                {(analysis.status === 'pending' || analysis.status === 'running') && onCancelAnalysis && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelAnalysis(analysis.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Progress value={getProgress(analysis.status)} className="mb-3" />

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Started: {new Date(analysis.started_at).toLocaleString()}
                </span>
                {analysis.completed_at && (
                  <span>
                    Completed: {new Date(analysis.completed_at).toLocaleString()}
                  </span>
                )}
                {analysis.confidence_score && (
                  <span>
                    Confidence: {Math.round(analysis.confidence_score)}%
                  </span>
                )}
              </div>

              {analysis.status === 'failed' && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  Analysis failed. Please try again or contact support if the issue persists.
                </div>
              )}

              {analysis.status === 'completed' && analysis.results_summary && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  Analysis completed successfully. View results in the Analysis tab.
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}