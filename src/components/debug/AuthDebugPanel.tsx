import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { AuthDebugger } from '@/utils/authDebugger';
import { createProject } from '@/services/projectService';
import { useToast } from '@/hooks/use-toast';

export function AuthDebugPanel() {
  const { user, session, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTestingAuth, setIsTestingAuth] = useState(false);
  const [isTestingProject, setIsTestingProject] = useState(false);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const handleAuthDebug = async () => {
    setIsTestingAuth(true);
    try {
      addTestResult('Starting auth debug...');
      await AuthDebugger.logAllDebugInfo();
      addTestResult('Auth debug completed - check console for details');
    } catch (error) {
      addTestResult(`Auth debug failed: ${error}`);
    } finally {
      setIsTestingAuth(false);
    }
  };

  const handleTestProjectCreation = async () => {
    if (!user?.id) {
      addTestResult('No authenticated user - cannot test project creation');
      return;
    }

    setIsTestingProject(true);
    try {
      addTestResult('Testing project creation...');
      
      const testProjectData = {
        name: `Debug Test ${Date.now()}`,
        description: 'Test project created by debug panel',
        industry: 'Technology',
        projectType: 'competitive_analysis' as const,
        targetMarket: 'Global',
        primaryObjectives: ['Test objective'],
        successMetrics: ['Test metric'],
        isPublic: false,
        allowTeamAccess: true,
        autoAnalysisEnabled: true,
        notificationSettings: { email: true, inApp: true, frequency: 'daily' as const },
        customFields: {},
        tags: ['debug', 'test']
      };

      const project = await createProject(user.id, testProjectData);
      addTestResult(`✅ Project created successfully: ${project.id}`);
      
      toast({
        title: "Test Project Created",
        description: `Successfully created test project: ${project.name}`,
        variant: "default"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addTestResult(`❌ Project creation failed: ${errorMessage}`);
      
      toast({
        title: "Project Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsTestingProject(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 Authentication Debug Panel</CardTitle>
        <CardDescription>
          Debug authentication state and test project creation functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auth State Display */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Auth Status:</label>
            <Badge variant={isAuthenticated ? "default" : "destructive"}>
              {isAuthenticated ? "Authenticated" : "Not Authenticated"}
            </Badge>
          </div>
          <div>
            <label className="text-sm font-medium">Loading:</label>
            <Badge variant={isLoading ? "secondary" : "outline"}>
              {isLoading ? "Loading" : "Ready"}
            </Badge>
          </div>
          <div>
            <label className="text-sm font-medium">User ID:</label>
            <p className="text-sm font-mono">{user?.id || 'None'}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Session:</label>
            <Badge variant={session ? "default" : "secondary"}>
              {session ? "Active" : "None"}
            </Badge>
          </div>
        </div>

        {/* Debug Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleAuthDebug}
            disabled={isTestingAuth}
            variant="outline"
          >
            {isTestingAuth ? 'Running...' : 'Debug Auth State'}
          </Button>
          
          <Button 
            onClick={handleTestProjectCreation}
            disabled={isTestingProject || !isAuthenticated}
            variant="outline"
          >
            {isTestingProject ? 'Testing...' : 'Test Project Creation'}
          </Button>
          
          <Button 
            onClick={clearResults}
            variant="ghost"
            size="sm"
          >
            Clear Results
          </Button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Results:</label>
            <div className="bg-muted rounded-md p-3 max-h-48 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-xs font-mono mb-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted rounded-md p-3">
          <p className="font-medium mb-2">Debug Instructions:</p>
          <ul className="space-y-1">
            <li>• Click "Debug Auth State" to check authentication in console</li>
            <li>• Click "Test Project Creation" to verify RLS policies work</li>
            <li>• Check browser console for detailed debug information</li>
            <li>• Use window.authDebugger.logAllDebugInfo() in console for manual testing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}