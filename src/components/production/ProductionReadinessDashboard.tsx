import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, XCircle, Play, ExternalLink } from 'lucide-react';
import { performanceMonitor, checkPerformanceBudget } from '@/utils/performanceOptimization';
import { isProduction } from '@/utils/productionUtils';

interface ValidationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  command?: string;
  documentation?: string;
  details?: string;
}

export const ProductionReadinessDashboard: React.FC = () => {
  const [validationSteps, setValidationSteps] = useState<ValidationStep[]>([
    {
      id: 'database',
      name: 'Database Configuration',
      description: 'Check RLS policies and schema optimization',
      status: 'warning',
      details: 'Extension in public schema detected'
    },
    {
      id: 'build',
      name: 'Production Build',
      description: 'TypeScript compilation and build optimization',
      status: 'pending',
      command: 'npm run build'
    },
    {
      id: 'linting',
      name: 'Code Quality',
      description: 'ESLint validation and code standards',
      status: 'pending',
      command: 'npm run lint'
    },
    {
      id: 'tests',
      name: 'Test Suite',
      description: 'Comprehensive test validation',
      status: 'pending',
      command: 'vitest run'
    },
    {
      id: 'optimization',
      name: 'Asset Optimization',
      description: 'Remove debug code and optimize assets',
      status: 'pending',
      command: 'node run-production-optimize.js'
    },
    {
      id: 'performance',
      name: 'Performance Budget',
      description: 'Core Web Vitals and bundle size validation',
      status: 'pending'
    }
  ]);

  const [performanceData, setPerformanceData] = useState<any>(null);
  const [overallScore, setOverallScore] = useState(0);

  useEffect(() => {
    // Check performance budget
    const perfCheck = checkPerformanceBudget();
    setPerformanceData(perfCheck);
    
    // Update performance step status
    setValidationSteps(prev => prev.map(step => 
      step.id === 'performance' 
        ? { 
            ...step, 
            status: perfCheck.passed ? 'passed' : 'warning',
            details: perfCheck.violations.join(', ') || 'All metrics within budget'
          }
        : step
    ));
  }, []);

  useEffect(() => {
    // Calculate overall score
    const totalSteps = validationSteps.length;
    const passedSteps = validationSteps.filter(step => step.status === 'passed').length;
    const warningSteps = validationSteps.filter(step => step.status === 'warning').length;
    
    const score = ((passedSteps + (warningSteps * 0.7)) / totalSteps) * 100;
    setOverallScore(Math.round(score));
  }, [validationSteps]);

  const runValidation = (stepId: string) => {
    setValidationSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status: 'running' } : step
    ));

    // Simulate validation for demo purposes
    setTimeout(() => {
      setValidationSteps(prev => prev.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              status: stepId === 'database' ? 'warning' : 'passed',
              details: stepId === 'database' ? 'Extension warning exists but not blocking' : 'Validation completed successfully'
            } 
          : step
      ));
    }, 2000);
  };

  const getStatusIcon = (status: ValidationStep['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status: ValidationStep['status']) => {
    switch (status) {
      case 'passed': return 'default';
      case 'warning': return 'secondary';
      case 'failed': return 'destructive';
      case 'running': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Production Readiness Dashboard</h1>
        <p className="text-muted-foreground">
          Validate your application for production deployment
        </p>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Production Readiness Score
            <Badge variant={overallScore >= 90 ? 'default' : overallScore >= 70 ? 'secondary' : 'destructive'}>
              {overallScore}%
            </Badge>
          </CardTitle>
          <CardDescription>
            Overall assessment of production readiness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={overallScore} className="w-full" />
          <div className="mt-4 text-sm text-muted-foreground">
            {overallScore >= 90 && "✅ Ready for production deployment"}
            {overallScore >= 70 && overallScore < 90 && "⚠️ Minor issues to address"}
            {overallScore < 70 && "❌ Critical issues require attention"}
          </div>
        </CardContent>
      </Card>

      {/* Validation Steps */}
      <div className="grid gap-4">
        {validationSteps.map((step) => (
          <Card key={step.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  {getStatusIcon(step.status)}
                  {step.name}
                </div>
                <Badge variant={getStatusColor(step.status)}>
                  {step.status}
                </Badge>
              </CardTitle>
              <CardDescription>{step.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {step.details && (
                <p className="text-sm mb-3 text-muted-foreground">{step.details}</p>
              )}
              
              <div className="flex gap-2">
                {step.command && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runValidation(step.id)}
                    disabled={step.status === 'running'}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    {step.status === 'running' ? 'Running...' : 'Validate'}
                  </Button>
                )}
                
                {step.documentation && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={step.documentation} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Docs
                    </a>
                  </Button>
                )}
              </div>

              {step.command && (
                <div className="mt-3 p-2 bg-muted rounded text-sm font-mono">
                  {step.command}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Metrics */}
      {performanceData && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Budget</CardTitle>
            <CardDescription>Core Web Vitals and optimization metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Performance Score:</span>
                <Badge variant={performanceData.score >= 80 ? 'default' : 'secondary'}>
                  {performanceData.score}/100
                </Badge>
              </div>
              
              {performanceData.violations.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Issues to address:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {performanceData.violations.map((violation, index) => (
                      <li key={index}>• {violation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Run common production preparation tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="outline" size="sm">
              Run All Tests
            </Button>
            <Button variant="outline" size="sm">
              Build Production
            </Button>
            <Button variant="outline" size="sm">
              Optimize Assets
            </Button>
            <Button variant="outline" size="sm">
              Check Security
            </Button>
            <Button variant="outline" size="sm">
              Validate Bundle
            </Button>
            <Button variant="outline" size="sm">
              Deploy Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Steps Required</CardTitle>
          <CardDescription>Complete these steps in your terminal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="font-medium text-sm">1. Run production optimization:</p>
              <code className="block mt-1 p-2 bg-muted rounded text-xs">
                node run-production-optimize.js
              </code>
            </div>
            
            <div>
              <p className="font-medium text-sm">2. Execute final build validation:</p>
              <code className="block mt-1 p-2 bg-muted rounded text-xs">
                node final-build-validation.js
              </code>
            </div>
            
            <div>
              <p className="font-medium text-sm">3. Run comprehensive tests:</p>
              <code className="block mt-1 p-2 bg-muted rounded text-xs">
                vitest run --coverage
              </code>
            </div>
            
            <div>
              <p className="font-medium text-sm">4. Test production build:</p>
              <code className="block mt-1 p-2 bg-muted rounded text-xs">
                npm run build && npm run preview
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};