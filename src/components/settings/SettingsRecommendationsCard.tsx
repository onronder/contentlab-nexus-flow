import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';
import { useSettingsRecommendations } from '@/hooks/useSettingsIntegration';

export const SettingsRecommendationsCard: React.FC = () => {
  const { data: recommendations = [], isLoading } = useSettingsRecommendations();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Settings Recommendations
          </CardTitle>
          <CardDescription>Loading personalized recommendations...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading recommendations...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <CheckCircle className="h-4 w-4 text-success" />;
    }
  };

  const getImpactVariant = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'destructive' as const;
      case 'medium':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Settings Recommendations
        </CardTitle>
        <CardDescription>
          AI-powered suggestions to optimize your settings configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-success mb-4" />
            <h3 className="font-medium mb-2">All Settings Optimized!</h3>
            <p className="text-sm text-muted-foreground">
              Your settings are already optimized. No recommendations at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {getImpactIcon(rec.impact_level)}
                      <h4 className="font-medium">{rec.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Badge variant={getImpactVariant(rec.impact_level)} className="text-xs">
                      {rec.impact_level} impact
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {rec.recommendation_type}
                    </Badge>
                  </div>
                </div>
                
                {rec.suggested_changes && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">Suggested Action:</p>
                    <p className="text-sm text-muted-foreground">
                      {(rec.suggested_changes as any)?.action || 'Review and update your settings'}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-4">
                  <div className="text-xs text-muted-foreground">
                    Generated {rec.created_at && new Date(rec.created_at).toLocaleDateString()}
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto">
                    Apply
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};