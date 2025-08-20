import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HardDrive,
  TrendingUp,
  FileText,
  Image as ImageIcon,
  Video,
  Download,
  Upload,
  Zap,
  Archive,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Calendar
} from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { realStorageAnalytics } from '@/services/realStorageAnalytics';

interface StorageAnalyticsDashboardProps {
  projectId: string;
}

interface StorageData {
  totalFiles: number;
  totalStorage: number;
  storageByType: Record<string, number>;
  uploadTrend: Array<{ date: string; uploads: number; size: number }>;
  topFiles: Array<{ name: string; size: number; type: string; lastAccessed: Date }>;
  storageTierDistribution: Array<{ tier: string; files: number; storage: number }>;
}

export const StorageAnalyticsDashboard = ({ projectId }: StorageAnalyticsDashboardProps) => {
  const [dateRange, setDateRange] = useState('30d');
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [optimizations, setOptimizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStorageData = async () => {
      setIsLoading(true);
      try {
        const [analytics, opts] = await Promise.all([
          realStorageAnalytics.getStorageAnalytics(projectId, dateRange),
          realStorageAnalytics.getStorageOptimizations(projectId)
        ]);
        
        setStorageData(analytics);
        setOptimizations(opts);
      } catch (error) {
        console.error('Error loading storage data:', error);
        setStorageData({
          totalFiles: 0,
          totalStorage: 0,
          storageByType: {},
          uploadTrend: [],
          topFiles: [],
          storageTierDistribution: []
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadStorageData();
  }, [projectId, dateRange]);

  if (isLoading || !storageData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const storageByTypeData = Object.entries(storageData.storageByType).map(([type, size]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: size,
    percentage: (size / storageData.totalStorage) * 100
  }));

  const tierData = storageData.storageTierDistribution.map(tier => ({
    name: tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1),
    files: tier.files,
    storage: tier.storage,
    percentage: (tier.storage / storageData.totalStorage) * 100
  }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Storage Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            Monitor storage usage and optimize your content library
          </p>
        </div>
        
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HardDrive className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatFileSize(storageData.totalStorage)}</p>
                <p className="text-sm text-muted-foreground">Total Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{storageData.totalFiles.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Files</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatFileSize(storageData.uploadTrend.reduce((sum, day) => sum + day.size, 0))}
                </p>
                <p className="text-sm text-muted-foreground">Uploaded This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(storageData.totalStorage / (10 * 1024 * 1024 * 1024) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Storage Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Storage by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Storage by Content Type</CardTitle>
                <CardDescription>Distribution of storage across different file types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {storageByTypeData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getFileIcon(item.name.toLowerCase())}
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatFileSize(item.value)}</p>
                        <p className="text-sm text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Files */}
            <Card>
              <CardHeader>
                <CardTitle>Largest Files</CardTitle>
                <CardDescription>Files consuming the most storage space</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {storageData.topFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Last accessed {file.lastAccessed.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatFileSize(file.size)}</p>
                        <Badge variant="outline" className="text-xs">
                          {file.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Storage Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Storage Distribution</CardTitle>
                <CardDescription>Visual breakdown of storage by type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={storageByTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, percentage}) => `${name} ${percentage.toFixed(1)}%`}
                    >
                      {storageByTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatFileSize(Number(value))} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Storage Tiers */}
            <Card>
              <CardHeader>
                <CardTitle>Storage Tiers</CardTitle>
                <CardDescription>Distribution across hot, warm, and cold storage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tierData.map((tier, index) => (
                    <div key={tier.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            tier.name === 'Hot' && "bg-red-500",
                            tier.name === 'Warm' && "bg-orange-500",
                            tier.name === 'Cold' && "bg-blue-500"
                          )} />
                          <span className="font-medium">{tier.name} Storage</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatFileSize(tier.storage)}</p>
                          <p className="text-sm text-muted-foreground">{tier.files} files</p>
                        </div>
                      </div>
                      <Progress value={tier.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Trends</CardTitle>
              <CardDescription>Daily upload activity and storage growth</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={storageData.uploadTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'size' ? formatFileSize(Number(value)) : value,
                      name === 'size' ? 'Storage' : 'Files'
                    ]}
                  />
                  <Bar dataKey="uploads" fill="hsl(var(--primary))" name="uploads" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Optimization Opportunities</CardTitle>
                <CardDescription>Recommendations to reduce storage usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {optimizations.map((opt, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-start gap-3">
                        {opt.actionType === 'compress' && <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />}
                        {opt.actionType === 'archive' && <Archive className="h-5 w-5 text-blue-500 mt-0.5" />}
                        {opt.actionType === 'deduplicate' && <Clock className="h-5 w-5 text-orange-500 mt-0.5" />}
                        <div>
                          <p className="font-medium">{opt.category}</p>
                          <p className="text-sm text-muted-foreground">{opt.description}</p>
                          {opt.potentialSavings > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              Potential savings: {formatFileSize(opt.potentialSavings)}
                            </p>
                          )}
                          <Button size="sm" variant="outline" className="mt-2">
                            {opt.actionType === 'compress' && 'Optimize'}
                            {opt.actionType === 'archive' && 'Archive'}
                            {opt.actionType === 'deduplicate' && 'View Duplicates'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {optimizations.length === 0 && (
                    <div className="text-center p-6 text-muted-foreground">
                      No optimization opportunities found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Forecast</CardTitle>
                <CardDescription>Projected storage usage based on current trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {formatFileSize(storageData.totalStorage * 1.5)}
                    </p>
                    <p className="text-sm text-muted-foreground">Projected in 30 days</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current Usage</span>
                      <span>{formatFileSize(storageData.totalStorage)}</span>
                    </div>
                    <Progress value={50} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>0 GB</span>
                      <span>10 GB Limit</span>
                    </div>
                  </div>

                  <Button className="w-full" variant="outline">
                    Upgrade Storage Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};