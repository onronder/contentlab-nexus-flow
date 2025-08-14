import React, { useState } from 'react';
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
  
  // Mock data - replace with actual data from your analytics service
  const storageData: StorageData = {
    totalFiles: 1247,
    totalStorage: 5368709120, // ~5GB in bytes
    storageByType: {
      'image': 2147483648, // ~2GB
      'video': 1610612736, // ~1.5GB
      'document': 1073741824, // ~1GB
      'audio': 536870912, // ~0.5GB
    },
    uploadTrend: [
      { date: '2024-01-01', uploads: 15, size: 157286400 },
      { date: '2024-01-02', uploads: 23, size: 241172480 },
      { date: '2024-01-03', uploads: 18, size: 188743680 },
      { date: '2024-01-04', uploads: 31, size: 325058560 },
      { date: '2024-01-05', uploads: 12, size: 125829120 },
      { date: '2024-01-06', uploads: 27, size: 283467776 },
      { date: '2024-01-07', uploads: 19, size: 199229440 },
    ],
    topFiles: [
      { name: 'product-demo-video.mp4', size: 157286400, type: 'video', lastAccessed: new Date('2024-01-15') },
      { name: 'marketing-presentation.pptx', size: 52428800, type: 'document', lastAccessed: new Date('2024-01-14') },
      { name: 'hero-banner-4k.jpg', size: 31457280, type: 'image', lastAccessed: new Date('2024-01-13') },
      { name: 'podcast-episode-12.mp3', size: 26214400, type: 'audio', lastAccessed: new Date('2024-01-12') },
      { name: 'annual-report-2023.pdf', size: 20971520, type: 'document', lastAccessed: new Date('2024-01-11') },
    ],
    storageTierDistribution: [
      { tier: 'hot', files: 425, storage: 2147483648 },
      { tier: 'warm', files: 623, storage: 2147483648 },
      { tier: 'cold', files: 199, storage: 1073741824 },
    ]
  };

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
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Compress Large Images</p>
                        <p className="text-sm text-muted-foreground">
                          Found 15 images over 5MB that could be compressed to save ~45MB
                        </p>
                        <Button size="sm" className="mt-2">Optimize Images</Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Archive className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Archive Old Files</p>
                        <p className="text-sm text-muted-foreground">
                          23 files haven't been accessed in 90+ days
                        </p>
                        <Button size="sm" variant="outline" className="mt-2">Move to Cold Storage</Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Remove Duplicates</p>
                        <p className="text-sm text-muted-foreground">
                          8 duplicate files consuming 2.3GB of space
                        </p>
                        <Button size="sm" variant="outline" className="mt-2">View Duplicates</Button>
                      </div>
                    </div>
                  </div>
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