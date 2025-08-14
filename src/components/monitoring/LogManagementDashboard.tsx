import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Download, Filter, RefreshCw, Search, Trash2, Activity, Shield, Zap } from 'lucide-react';
import { useLoggingManagement } from '@/hooks/useLoggingManagement';
import { LogEntry } from '@/services/structuredLoggingService';
import { formatDistanceToNow } from 'date-fns';

export function LogManagementDashboard() {
  const {
    logs,
    filter,
    analytics,
    isLoading,
    updateFilter,
    clearFilter,
    exportLogs,
    clearLogs,
    searchLogs,
    filterByLevel,
    filterByComponent,
    refreshLogs
  } = useLoggingManagement();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<string>('all');

  const handleSearch = () => {
    searchLogs(searchQuery);
  };

  const handleLevelFilter = (level: string) => {
    setSelectedLevel(level);
    if (level === 'all') {
      updateFilter({ level: undefined });
    } else {
      filterByLevel([level as LogEntry['level']]);
    }
  };

  const handleComponentFilter = (component: string) => {
    setSelectedComponent(component);
    if (component === 'all') {
      updateFilter({ component: undefined });
    } else {
      filterByComponent([component]);
    }
  };

  const getLevelBadgeVariant = (level: LogEntry['level']) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warn': return 'secondary';
      case 'info': return 'default';
      case 'debug': return 'outline';
      default: return 'default';
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'critical':
      case 'error':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
        return <Activity className="w-4 h-4" />;
      case 'debug':
        return <Zap className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const uniqueComponents = Array.from(new Set(logs.map(log => log.component).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalLogs}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {analytics.levelCounts.error || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.totalLogs > 0 
                  ? `${((analytics.levelCounts.error || 0) / analytics.totalLogs * 100).toFixed(1)}%`
                  : '0%'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(analytics.securityEvents || {}).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0).toString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.avgPerformance ? `${Math.round(analytics.avgPerformance)}ms` : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Log Management Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Search Logs</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search messages, components, actions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Level</label>
              <Select value={selectedLevel} onValueChange={handleLevelFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Component</label>
              <Select value={selectedComponent} onValueChange={handleComponentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Components</SelectItem>
                  {uniqueComponents.map(component => (
                    <SelectItem key={component} value={component!}>
                      {component}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={refreshLogs} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" onClick={clearFilter}>
                Clear Filters
              </Button>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => exportLogs('json')}>
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button variant="outline" onClick={() => exportLogs('csv')}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => clearLogs()}
              className="ml-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Display */}
      <Card>
        <CardHeader>
          <CardTitle>Log Entries ({logs.length})</CardTitle>
          <CardDescription>
            Real-time application logs with filtering and search capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="space-y-4">
              <div className="max-h-[600px] overflow-y-auto space-y-2">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No logs found matching current filters
                  </div>
                ) : (
                  logs.map((log) => (
                    <Card key={log.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {getLevelIcon(log.level)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getLevelBadgeVariant(log.level)}>
                                {log.level.toUpperCase()}
                              </Badge>
                              {log.component && (
                                <Badge variant="outline">{log.component}</Badge>
                              )}
                              {log.security && (
                                <Badge variant="secondary">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Security
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium mb-1">{log.message}</p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>ID: {log.correlationId}</p>
                              <p>Time: {formatDistanceToNow(log.timestamp, { addSuffix: true })}</p>
                              {log.userId && <p>User: {log.userId}</p>}
                              {log.teamId && <p>Team: {log.teamId}</p>}
                              {log.action && <p>Action: {log.action}</p>}
                            </div>
                            {log.error && (
                              <div className="mt-2 p-2 bg-destructive/10 rounded text-xs">
                                <p className="font-medium">{log.error.name}: {log.error.message}</p>
                                {log.error.stack && (
                                  <pre className="mt-1 whitespace-pre-wrap text-xs opacity-70">
                                    {log.error.stack.split('\n').slice(0, 3).join('\n')}
                                  </pre>
                                )}
                              </div>
                            )}
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs cursor-pointer text-muted-foreground">
                                  Metadata ({Object.keys(log.metadata).length} fields)
                                </summary>
                                <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Log Levels Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(analytics.levelCounts).map(([level, count]) => (
                          <div key={level} className="flex justify-between items-center">
                            <Badge variant={getLevelBadgeVariant(level as LogEntry['level'])}>
                              {level.toUpperCase()}
                            </Badge>
                            <span className="font-medium">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Component Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(analytics.componentCounts).map(([component, count]) => (
                          <div key={component} className="flex justify-between items-center">
                            <Badge variant="outline">{component}</Badge>
                            <span className="font-medium">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Error Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(analytics.errorPatterns).map(([pattern, count]) => (
                          <div key={pattern} className="flex justify-between items-center">
                            <span className="text-sm">{pattern}</span>
                            <Badge variant="destructive">{count as number}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Security Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(analytics.securityEvents).map(([event, count]) => (
                          <div key={event} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              <span className="text-sm">{event}</span>
                            </div>
                            <Badge variant="secondary">{count as number}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}