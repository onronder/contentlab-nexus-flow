import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Clock, MousePointer } from 'lucide-react';
import { useSettingsAnalytics } from '@/hooks/useSettingsIntegration';

export const SettingsAnalyticsCard: React.FC = () => {
  const { data: analyticsData = [], isLoading } = useSettingsAnalytics();

  // Type-safe array handling
  const analytics = Array.isArray(analyticsData) ? analyticsData : [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Settings Analytics
          </CardTitle>
          <CardDescription>Loading usage analytics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading analytics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group analytics by action type
  const groupedAnalytics = analytics.reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.action_type]) {
      acc[item.action_type] = [];
    }
    acc[item.action_type].push(item);
    return acc;
  }, {});

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'update':
        return <MousePointer className="h-4 w-4 text-primary" />;
      case 'sync':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'access':
        return <Activity className="h-4 w-4 text-info" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendIcon = (frequency: number) => {
    // Simple trend calculation - you can make this more sophisticated
    return frequency > 5 ? (
      <TrendingUp className="h-3 w-3 text-success" />
    ) : (
      <TrendingDown className="h-3 w-3 text-muted-foreground" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Settings Analytics
        </CardTitle>
        <CardDescription>
          Usage patterns and activity insights for your settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {Object.keys(groupedAnalytics).length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No analytics data available yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedAnalytics).map(([actionType, items]) => (
              <div key={actionType} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getActionIcon(actionType)}
                    <h4 className="font-medium capitalize">{actionType} Actions</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{items.length} events</Badge>
                    {getTrendIcon(items.length)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Most Active Setting:</span>
                    <span className="ml-2 font-medium">
                      {Object.keys(items.reduce((acc: any, item: any) => {
                        acc[item.setting_type] = (acc[item.setting_type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>))[0] || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Activity:</span>
                    <span className="ml-2 font-medium">
                      {items[0]?.created_at && new Date(items[0].created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Show performance impact if available */}
                {items.some((item: any) => item.performance_impact) && (
                  <div className="mt-3 p-2 bg-muted rounded">
                    <p className="text-xs font-medium">Performance Impact:</p>
                    <div className="flex gap-2 mt-1">
                      {items
                        .filter((item: any) => item.performance_impact)
                        .slice(0, 3)
                        .map((item: any, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {item.performance_impact}ms
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};