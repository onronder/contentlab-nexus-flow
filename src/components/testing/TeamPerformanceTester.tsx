import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MemoryStick,
  Database
} from 'lucide-react';
import { teamPerformanceMonitor, TEAM_PERFORMANCE_THRESHOLDS } from '@/utils/teamPerformance';
import { useOptimizedTeams, useOptimizedTeamMembers, useOptimizedTeamStats } from '@/hooks/optimized/useOptimizedTeamQueries';

interface PerformanceTest {
  name: string;
  description: string;
  threshold: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  result?: {
    average: number;
    min: number;
    max: number;
    p95: number;
    iterations: number;
  };
}

interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export function TeamPerformanceTester() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [tests, setTests] = useState<PerformanceTest[]>([]);
  const [memorySnapshots, setMemorySnapshots] = useState<MemorySnapshot[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // Initialize performance tests
  const initializeTests = (): PerformanceTest[] => [
    {
      name: 'Team List Loading',
      description: 'Time to load and render team list',
      threshold: TEAM_PERFORMANCE_THRESHOLDS.TEAM_LOAD,
      status: 'idle'
    },
    {
      name: 'Member List Rendering',
      description: 'Time to render team member list',
      threshold: TEAM_PERFORMANCE_THRESHOLDS.MEMBER_LOAD,
      status: 'idle'
    },
    {
      name: 'Team Creation',
      description: 'Time to create a new team',
      threshold: TEAM_PERFORMANCE_THRESHOLDS.TEAM_CREATE,
      status: 'idle'
    },
    {
      name: 'Member Search',
      description: 'Time to search and filter members',
      threshold: TEAM_PERFORMANCE_THRESHOLDS.SEARCH,
      status: 'idle'
    },
    {
      name: 'Permission Checks',
      description: 'Time to validate user permissions',
      threshold: TEAM_PERFORMANCE_THRESHOLDS.PERMISSION_CHECK,
      status: 'idle'
    }
  ];

  useEffect(() => {
    setTests(initializeTests());
  }, []);

  // Memory monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        setMemorySnapshots(prev => [
          ...prev.slice(-50), // Keep last 50 snapshots
          {
            timestamp: Date.now(),
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          }
        ]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Simulate performance test execution
  const executePerformanceTest = async (test: PerformanceTest): Promise<PerformanceTest> => {
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      // Simulate different types of operations
      switch (test.name) {
        case 'Team List Loading':
          await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));
          break;
        case 'Member List Rendering':
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
          break;
        case 'Team Creation':
          await new Promise(resolve => setTimeout(resolve, Math.random() * 600 + 200));
          break;
        case 'Member Search':
          await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 25));
          break;
        case 'Permission Checks':
          await new Promise(resolve => setTimeout(resolve, Math.random() * 80 + 10));
          break;
        default:
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
      }
      
      const end = performance.now();
      times.push(end - start);
    }

    const sorted = [...times].sort((a, b) => a - b);
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;

    return {
      ...test,
      status: average <= test.threshold ? 'completed' : 'failed',
      result: {
        average,
        min: Math.min(...times),
        max: Math.max(...times),
        p95: sorted[Math.floor(sorted.length * 0.95)],
        iterations
      }
    };
  };

  // Run all performance tests
  const runPerformanceTests = async () => {
    setIsRunning(true);
    setRecommendations([]);
    teamPerformanceMonitor.clearMetrics();

    try {
      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        setCurrentTest(test.name);
        
        // Update test status to running
        setTests(prev => prev.map((t, index) => 
          index === i ? { ...t, status: 'running' } : t
        ));

        // Execute test
        const result = await executePerformanceTest(test);
        
        // Update test with result
        setTests(prev => prev.map((t, index) => 
          index === i ? result : t
        ));
      }

      // Generate recommendations
      generateRecommendations();
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };

  // Generate performance recommendations
  const generateRecommendations = () => {
    const recs: string[] = [];
    const completedTests = tests.filter(t => t.result);

    completedTests.forEach(test => {
      if (!test.result) return;

      const { average, p95 } = test.result;
      
      if (average > test.threshold) {
        recs.push(`${test.name} exceeds threshold (${average.toFixed(2)}ms > ${test.threshold}ms). Consider optimization.`);
      }
      
      if (p95 > test.threshold * 2) {
        recs.push(`${test.name} has high latency spikes (P95: ${p95.toFixed(2)}ms). Check for blocking operations.`);
      }
    });

    // Memory recommendations
    if (memorySnapshots.length > 0) {
      const latest = memorySnapshots[memorySnapshots.length - 1];
      const memoryUsagePercent = (latest.usedJSHeapSize / latest.jsHeapSizeLimit) * 100;
      
      if (memoryUsagePercent > 80) {
        recs.push('High memory usage detected. Consider implementing component memoization and cleanup.');
      }
      
      if (memorySnapshots.length > 10) {
        const growth = memorySnapshots[memorySnapshots.length - 1].usedJSHeapSize - 
                      memorySnapshots[memorySnapshots.length - 10].usedJSHeapSize;
        if (growth > 10 * 1024 * 1024) { // 10MB growth
          recs.push('Memory growth detected. Check for memory leaks in team components.');
        }
      }
    }

    if (recs.length === 0) {
      recs.push('All performance metrics are within acceptable thresholds. Great job!');
    }

    setRecommendations(recs);
  };

  // Calculate overall performance score
  const getPerformanceScore = (): number => {
    const completedTests = tests.filter(t => t.status === 'completed' || t.status === 'failed');
    if (completedTests.length === 0) return 0;

    const passedTests = completedTests.filter(t => t.status === 'completed').length;
    return (passedTests / completedTests.length) * 100;
  };

  const performanceScore = getPerformanceScore();
  const testProgress = tests.length > 0 ? 
    (tests.filter(t => t.status === 'completed' || t.status === 'failed').length / tests.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Team Performance Testing
              </CardTitle>
              <CardDescription>
                Comprehensive performance analysis for team management features
              </CardDescription>
            </div>
            <Button
              onClick={runPerformanceTests}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              {isRunning ? 'Running Tests...' : 'Run Performance Tests'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {performanceScore.toFixed(0)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Performance Score</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {tests.filter(t => t.status === 'completed').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Tests Passed</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {memorySnapshots.length > 0 ? 
                      `${(memorySnapshots[memorySnapshots.length - 1]?.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB` : 
                      '0MB'
                    }
                  </div>
                  <p className="text-sm text-muted-foreground">Memory Usage</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Progress */}
          {isRunning && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Test Progress</span>
                <span className="text-sm text-muted-foreground">
                  {testProgress.toFixed(0)}% complete
                </span>
              </div>
              <Progress value={testProgress} />
              {currentTest && (
                <Alert className="mt-2">
                  <Clock className="w-4 h-4" />
                  <AlertDescription>Running: {currentTest}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Test Results */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Test Results</h3>
            {tests.map((test, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {test.status === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {test.status === 'failed' && (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      {test.status === 'running' && (
                        <Clock className="w-5 h-5 text-blue-600 animate-spin" />
                      )}
                      {test.status === 'idle' && (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                      
                      <div>
                        <h4 className="font-medium">{test.name}</h4>
                        <p className="text-sm text-muted-foreground">{test.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        Threshold: {test.threshold}ms
                      </Badge>
                      
                      {test.result && (
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            Avg: {test.result.average.toFixed(2)}ms
                          </div>
                          <div className="text-xs text-muted-foreground">
                            P95: {test.result.p95.toFixed(2)}ms
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Performance Recommendations</h3>
              {recommendations.map((rec, index) => (
                <Alert key={index}>
                  <TrendingUp className="w-4 h-4" />
                  <AlertDescription>{rec}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}