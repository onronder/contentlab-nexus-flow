import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Zap, Lightbulb, Target, RefreshCw, Search, Accessibility, Merge } from 'lucide-react';

interface PerformanceOptimizationPanelProps {
  projectId: string;
}

export function PerformanceOptimizationPanel({ projectId }: PerformanceOptimizationPanelProps) {
  const [optimizationInProgress, setOptimizationInProgress] = useState(false);

  // Mock data - replace with actual optimization data
  const performanceRecommendations = [
    {
      id: 1,
      type: 'performance',
      priority: 'high',
      title: 'Optimize Image Compression',
      description: 'Large images are slowing down page load times. Compress 23 images to improve performance.',
      impact: 'Reduce page load time by 2.3 seconds',
      effort: 'Low',
      status: 'pending',
      affectedContent: 23
    },
    {
      id: 2,
      type: 'seo',
      priority: 'high',
      title: 'Add Missing Meta Descriptions',
      description: '15 pages lack meta descriptions, affecting search engine visibility.',
      impact: 'Improve SEO ranking potential by 25%',
      effort: 'Medium',
      status: 'pending',
      affectedContent: 15
    },
    {
      id: 3,
      type: 'accessibility',
      priority: 'medium',
      title: 'Improve Alt Text Coverage',
      description: '8 images missing descriptive alt text for screen readers.',
      impact: 'Enhanced accessibility compliance',
      effort: 'Low',
      status: 'in-progress',
      affectedContent: 8
    },
    {
      id: 4,
      type: 'content',
      priority: 'medium',
      title: 'Consolidate Duplicate Content',
      description: 'Found 5 pieces of similar content that could be merged.',
      impact: 'Reduce content redundancy by 12%',
      effort: 'High',
      status: 'pending',
      affectedContent: 5
    }
  ];

  const freshnessAnalysis = [
    { category: 'Very Fresh (0-30 days)', count: 45, percentage: 35, status: 'excellent' },
    { category: 'Fresh (31-90 days)', count: 38, percentage: 30, status: 'good' },
    { category: 'Aging (91-180 days)', count: 28, percentage: 22, status: 'warning' },
    { category: 'Stale (180+ days)', count: 17, percentage: 13, status: 'needs-attention' }
  ];

  const seoOptimization = [
    { 
      aspect: 'Title Tags', 
      score: 85, 
      issues: 3, 
      recommendations: ['Optimize 3 titles that are too long', 'Add target keywords to 2 titles']
    },
    { 
      aspect: 'Meta Descriptions', 
      score: 72, 
      issues: 15, 
      recommendations: ['Add meta descriptions to 15 pages', 'Optimize length for 5 descriptions']
    },
    { 
      aspect: 'Header Structure', 
      score: 90, 
      issues: 2, 
      recommendations: ['Fix H1 tag hierarchy on 2 pages']
    },
    { 
      aspect: 'Image Optimization', 
      score: 68, 
      issues: 23, 
      recommendations: ['Add alt text to 8 images', 'Optimize file size for 15 images']
    }
  ];

  const accessibilityChecks = [
    { check: 'Alt Text Coverage', score: 78, status: 'warning', issues: 8 },
    { check: 'Color Contrast', score: 92, status: 'good', issues: 2 },
    { check: 'Keyboard Navigation', score: 95, status: 'excellent', issues: 1 },
    { check: 'Screen Reader Support', score: 85, status: 'good', issues: 3 },
    { check: 'Form Labels', score: 100, status: 'excellent', issues: 0 }
  ];

  const contentConsolidation = [
    {
      group: 'Marketing Templates',
      items: 3,
      similarity: 89,
      recommendation: 'Merge into comprehensive template',
      potential_savings: '45% storage reduction'
    },
    {
      group: 'Brand Guidelines',
      items: 2,
      similarity: 76,
      recommendation: 'Consolidate versions',
      potential_savings: '30% storage reduction'
    }
  ];

  const handleOptimizeAll = async () => {
    setOptimizationInProgress(true);
    // Simulate optimization process
    setTimeout(() => {
      setOptimizationInProgress(false);
    }, 3000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'needs-attention': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Optimization</h2>
          <p className="text-muted-foreground">
            Intelligent recommendations to improve content effectiveness and user experience
          </p>
        </div>
        <Button 
          onClick={handleOptimizeAll}
          disabled={optimizationInProgress}
          className="flex items-center gap-2"
        >
          {optimizationInProgress ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {optimizationInProgress ? 'Optimizing...' : 'Optimize All'}
        </Button>
      </div>

      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="freshness">Content Freshness</TabsTrigger>
          <TabsTrigger value="seo">SEO Optimization</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          <TabsTrigger value="consolidation">Consolidation</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4">
            {performanceRecommendations.map((rec) => (
              <Card key={rec.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getPriorityColor(rec.priority)}>
                          {rec.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {rec.affectedContent} items
                        </Badge>
                        {rec.type === 'performance' && <Zap className="h-4 w-4 text-blue-500" />}
                        {rec.type === 'seo' && <Search className="h-4 w-4 text-green-500" />}
                        {rec.type === 'accessibility' && <Accessibility className="h-4 w-4 text-purple-500" />}
                        {rec.type === 'content' && <Merge className="h-4 w-4 text-orange-500" />}
                      </div>
                      <h3 className="font-semibold mb-2">{rec.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Impact:</span>
                          <span className="ml-2 font-medium text-green-600">{rec.impact}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Effort:</span>
                          <span className="ml-2 font-medium">{rec.effort}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={rec.status === 'pending' ? 'secondary' : 'default'}>
                        {rec.status}
                      </Badge>
                      <Button size="sm" variant={rec.status === 'pending' ? 'default' : 'outline'}>
                        {rec.status === 'pending' ? 'Apply Fix' : 'View Progress'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="freshness" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Freshness Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {freshnessAnalysis.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.count} items ({item.percentage}%)
                        </span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                    {item.status === 'needs-attention' && (
                      <Button size="sm" variant="outline">
                        Refresh Content
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              {freshnessAnalysis.some(item => item.status === 'needs-attention') && (
                <Alert className="mt-4">
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    Consider updating or refreshing content older than 180 days to maintain relevance and engagement.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO Optimization Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {seoOptimization.map((item, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{item.aspect}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{item.score}%</span>
                        <Badge variant={item.issues > 10 ? 'destructive' : item.issues > 5 ? 'default' : 'secondary'}>
                          {item.issues} issues
                        </Badge>
                      </div>
                    </div>
                    <Progress value={item.score} className="h-2" />
                    <div className="text-sm text-muted-foreground">
                      <strong>Recommendations:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {item.recommendations.map((rec, recIndex) => (
                          <li key={recIndex}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accessibilityChecks.map((check, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <div className="font-medium">{check.check}</div>
                        <div className="text-sm text-muted-foreground">
                          {check.issues === 0 ? 'No issues found' : `${check.issues} issues to address`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{check.score}%</span>
                      {check.issues > 0 && (
                        <Button size="sm" variant="outline">
                          Fix Issues
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consolidation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Consolidation Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentConsolidation.map((group, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{group.group}</h4>
                        <p className="text-sm text-muted-foreground">
                          {group.items} similar items ({group.similarity}% similarity)
                        </p>
                      </div>
                      <Badge variant="outline">{group.potential_savings}</Badge>
                    </div>
                    <p className="text-sm mb-3">{group.recommendation}</p>
                    <Button size="sm" variant="outline" className="w-full">
                      Preview Consolidation
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}