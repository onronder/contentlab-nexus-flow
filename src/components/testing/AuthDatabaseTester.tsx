import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks';
import { useUser, useSession, useSupabaseClient } from '@/contexts';
import { useCreateProject } from '@/hooks/mutations/useProjectMutations';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database, 
  User, 
  Shield, 
  Loader2,
  TestTube,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'running';
  message: string;
  details?: string;
}

export function AuthDatabaseTester() {
  const { user: authUser, isAuthenticated, isLoading } = useAuth();
  const user = useUser();
  const session = useSession();
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const createProjectMutation = useCreateProject();
  
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  
  // Test project form data
  const [testProjectData, setTestProjectData] = useState({
    name: `Auth Test Project ${Date.now()}`,
    description: 'Test project to verify database integration',
    industry: 'Technology',
    targetMarket: 'Global'
  });

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const updateTestResult = (name: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(result => 
      result.name === name ? { ...result, ...updates } : result
    ));
  };

  const runComprehensiveTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    
    try {
      // Test 1: Authentication Context Verification
      setCurrentTest('Authentication Context');
      addTestResult({
        name: 'Authentication Context',
        status: 'running',
        message: 'Checking authentication state...'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      if (!user || !authUser) {
        updateTestResult('Authentication Context', {
          status: 'error',
          message: 'User not authenticated',
          details: 'Both user and authUser should be available'
        });
        return;
      }

      updateTestResult('Authentication Context', {
        status: 'success',
        message: 'Authentication state verified',
        details: `User ID: ${user.id}, Email: ${user.email}`
      });

      // Test 2: Session Verification
      setCurrentTest('Session Verification');
      addTestResult({
        name: 'Session Verification',
        status: 'running',
        message: 'Checking session state...'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      if (!session) {
        updateTestResult('Session Verification', {
          status: 'error',
          message: 'Session not available',
          details: 'Session should contain access token and user information'
        });
        return;
      }

      updateTestResult('Session Verification', {
        status: 'success',
        message: 'Session verified',
        details: `Token type: ${session.token_type}, Expires: ${new Date(session.expires_at! * 1000).toLocaleString()}`
      });

      // Test 3: Supabase Client Auth
      setCurrentTest('Supabase Client Auth');
      addTestResult({
        name: 'Supabase Client Auth',
        status: 'running',
        message: 'Testing Supabase client authentication...'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth getUser() timed out after 10 seconds')), 10000);
      });
      
      const getUserPromise = supabase.auth.getUser();
      
      let authData, authError;
      try {
        const result = await Promise.race([getUserPromise, timeoutPromise]) as any;
        authData = result.data;
        authError = result.error;
      } catch (error) {
        updateTestResult('Supabase Client Auth', {
          status: 'error',
          message: 'Supabase client auth timed out',
          details: error instanceof Error ? error.message : 'Unknown timeout error'
        });
        return;
      }
      
      if (authError || !authData.user) {
        updateTestResult('Supabase Client Auth', {
          status: 'error',
          message: 'Supabase client auth failed',
          details: authError?.message || 'No user data'
        });
        return;
      }

      updateTestResult('Supabase Client Auth', {
        status: 'success',
        message: 'Supabase client auth verified',
        details: `Auth user ID: ${authData.user.id}`
      });

      // Test 4: Database User Context (Critical Test)
      setCurrentTest('Database User Context');
      addTestResult({
        name: 'Database User Context',
        status: 'running',
        message: 'Testing auth.uid() in database context...'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        updateTestResult('Database User Context', {
          status: 'error',
          message: 'Database user context failed',
          details: `Error: ${profileError.message}`
        });
        return;
      }

      updateTestResult('Database User Context', {
        status: 'success',
        message: 'Database user context working',
        details: `Profile found: ${profileData.full_name || 'No name'}`
      });

      // Test 5: Critical Project Creation Test
      setCurrentTest('Project Creation');
      addTestResult({
        name: 'Project Creation',
        status: 'running',
        message: 'Testing project creation with RLS policies...'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const projectData = {
          name: testProjectData.name,
          description: testProjectData.description,
          industry: testProjectData.industry,
          projectType: 'competitive_analysis' as const,
          targetMarket: testProjectData.targetMarket,
          primaryObjectives: ['Test authentication integration'],
          successMetrics: ['Successful project creation'],
          isPublic: false,
          allowTeamAccess: true,
          autoAnalysisEnabled: true,
          notificationSettings: { email: true, inApp: true, frequency: 'daily' as const },
          customFields: {},
          tags: ['auth-test']
        };

        const project = await createProjectMutation.mutateAsync(projectData);

        updateTestResult('Project Creation', {
          status: 'success',
          message: 'Project created successfully!',
          details: `Project ID: ${project.id}, Name: ${project.name}`
        });

        toast({
          title: "🎉 Critical Test Passed!",
          description: "Project creation works without RLS violations",
          variant: "default"
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateTestResult('Project Creation', {
          status: 'error',
          message: 'Project creation failed',
          details: `Error: ${errorMessage}`
        });

        if (errorMessage.includes('row-level security') || errorMessage.includes('RLS')) {
          toast({
            title: "❌ Critical Test Failed",
            description: "RLS policy violation - auth.uid() may still be null",
            variant: "destructive"
          });
        }
      }

      // Test 6: RLS Policy Verification
      setCurrentTest('RLS Policy Test');
      addTestResult({
        name: 'RLS Policy Test',
        status: 'running',
        message: 'Testing RLS policies with user context...'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, created_by')
        .limit(5);

      if (projectsError) {
        updateTestResult('RLS Policy Test', {
          status: 'error',
          message: 'RLS policy test failed',
          details: `Error: ${projectsError.message}`
        });
      } else {
        updateTestResult('RLS Policy Test', {
          status: 'success',
          message: 'RLS policies working correctly',
          details: `Found ${projectsData.length} projects user can access`
        });
      }

    } catch (error) {
      console.error('Test execution error:', error);
      addTestResult({
        name: 'Test Execution',
        status: 'error',
        message: 'Test execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunningTests(false);
      setCurrentTest('');
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Badge variant="outline" className="text-blue-600">Running</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Pass</Badge>;
      case 'error':
        return <Badge variant="destructive">Fail</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Phase 4: Authentication & Database Integration Tester
          </CardTitle>
          <CardDescription>
            Comprehensive testing of authentication system and database integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Auth State */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium">Auth Status</p>
                <Badge variant={isAuthenticated ? "default" : "destructive"}>
                  {isAuthenticated ? "Authenticated" : "Not Authenticated"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium">Session</p>
                <Badge variant={session ? "default" : "secondary"}>
                  {session ? "Active" : "None"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium">User ID</p>
                <p className="text-xs font-mono">{user?.id?.substring(0, 8) || 'None'}...</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium">Loading</p>
                <Badge variant={isLoading ? "secondary" : "outline"}>
                  {isLoading ? "Loading" : "Ready"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Test Project Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Project Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={testProjectData.name}
                  onChange={(e) => setTestProjectData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={testProjectData.industry}
                  onChange={(e) => setTestProjectData(prev => ({ ...prev, industry: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={testProjectData.description}
                  onChange={(e) => setTestProjectData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Test Controls */}
          <div className="flex gap-4">
            <Button 
              onClick={runComprehensiveTests}
              disabled={isRunningTests || !isAuthenticated}
              className="flex items-center gap-2"
            >
              {isRunningTests ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              Run Comprehensive Tests
            </Button>
            {isRunningTests && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Currently testing: {currentTest}
              </div>
            )}
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Test Results</h3>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <span className="font-medium">{result.name}</span>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                        {result.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Test Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {testResults.filter(r => r.status === 'success').length}
                    </div>
                    <div>Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">
                      {testResults.filter(r => r.status === 'error').length}
                    </div>
                    <div>Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {testResults.filter(r => r.status === 'running').length}
                    </div>
                    <div>Running</div>
                  </div>
                </div>
                
                {testResults.filter(r => r.status === 'error').length === 0 && 
                 testResults.filter(r => r.status === 'running').length === 0 &&
                 testResults.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">All Tests Passed!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Authentication and database integration is working correctly. 
                      Project creation should work without RLS violations.
                    </p>
                  </div>
                )}

                {testResults.some(r => r.status === 'error') && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Tests Failed</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                      Some tests failed. Check the details above to identify and resolve issues.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}