import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { useCacheManagement, CacheType } from '@/hooks/useCacheManagement';

export function CacheManagementDashboard() {
  const {
    stats,
    isLoading,
    clearCache,
    cleanup,
    getCacheHealth,
    getTotalCacheSize,
    getOverallHitRate,
    refreshStats
  } = useCacheManagement();

  const health = getCacheHealth();
  const totalSize = getTotalCacheSize();
  const overallHitRate = getOverallHitRate();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
      case 'warning':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
      case 'critical':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleClearCache = async (type: CacheType) => {
    try {
      await clearCache(type);
    } catch (error) {
      console.error(`Failed to clear ${type} cache:`, error);
    }
  };

  const handleCleanup = async (type: CacheType) => {
    try {
      await cleanup(type);
    } catch (error) {
      console.error(`Failed to cleanup ${type} cache:`, error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallHitRate.toFixed(1)}%</div>
            <Progress value={overallHitRate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cache Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalSize)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.browser.totalEntries + stats.api.totalEntries + stats.userData.totalEntries}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cache Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.values(health).every(h => h.status === 'healthy') ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  All Healthy
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Issues Detected
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Cache Management
          </CardTitle>
          <CardDescription>
            Monitor and manage application caches for optimal performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="browser">Browser Cache</TabsTrigger>
              <TabsTrigger value="api">API Cache</TabsTrigger>
              <TabsTrigger value="userData">User Data Cache</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['browser', 'api', 'userData'] as CacheType[]).map((cacheType) => (
                  <Card key={cacheType}>
                    <CardHeader>
                      <CardTitle className="text-base capitalize flex items-center justify-between">
                        {cacheType === 'userData' ? 'User Data' : cacheType} Cache
                        {getHealthBadge(health[cacheType].status)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Hit Rate</span>
                          <span>{stats[cacheType].hitRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={stats[cacheType].hitRate} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Entries</p>
                          <p className="font-medium">{stats[cacheType].totalEntries}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Size</p>
                          <p className="font-medium">{formatBytes(stats[cacheType].totalMemoryUsage)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Hits</p>
                          <p className="font-medium text-green-600">{stats[cacheType].totalHits}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Misses</p>
                          <p className="font-medium text-red-600">{stats[cacheType].totalMisses}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCleanup(cacheType)}
                          disabled={isLoading}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Cleanup
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleClearCache(cacheType)}
                          disabled={isLoading}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {(['browser', 'api', 'userData'] as CacheType[]).map((cacheType) => (
              <TabsContent key={cacheType} value={cacheType} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Performance Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Hit Rate</span>
                          <span className="text-sm">{stats[cacheType].hitRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={stats[cacheType].hitRate} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Hits</p>
                          <p className="text-2xl font-bold text-green-600">{stats[cacheType].totalHits}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Misses</p>
                          <p className="text-2xl font-bold text-red-600">{stats[cacheType].totalMisses}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Average Access Count</p>
                        <p className="text-lg font-semibold">{stats[cacheType].avgAccessCount.toFixed(1)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Storage Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Memory Usage</p>
                        <p className="text-2xl font-bold">{formatBytes(stats[cacheType].totalMemoryUsage)}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Total Entries</p>
                        <p className="text-2xl font-bold">{stats[cacheType].totalEntries}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Entries by TTL</p>
                        <div className="space-y-1">
                          {Object.entries(stats[cacheType].entriesByTTL).map(([ttl, count]) => (
                            <div key={ttl} className="flex justify-between text-sm">
                              <span>{ttl}</span>
                              <Badge variant="outline">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Cache Operations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <Button 
                        onClick={() => handleCleanup(cacheType)}
                        disabled={isLoading}
                        variant="outline"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Cleanup Expired Entries
                      </Button>
                      
                      <Button 
                        onClick={() => handleClearCache(cacheType)}
                        disabled={isLoading}
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All Entries
                      </Button>

                      <Button 
                        onClick={refreshStats}
                        disabled={isLoading}
                        variant="outline"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh Stats
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}