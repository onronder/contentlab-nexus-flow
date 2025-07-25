import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Shield, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  LogIn, 
  LogOut, 
  Navigation,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';

export function AuthTestingPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    session, 
    profile, 
    isLoading, 
    isAuthenticated, 
    error,
    signIn,
    signUp,
    signOut,
    resetPassword
  } = useAuth();

  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string>('');

  const handleTestSignIn = async () => {
    setTestLoading(true);
    setTestError(null);
    setLastAction('Sign In');
    
    try {
      const result = await signIn(testEmail, testPassword);
      if (result.error) {
        setTestError(result.error);
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestSignUp = async () => {
    setTestLoading(true);
    setTestError(null);
    setLastAction('Sign Up');
    
    try {
      const result = await signUp(testEmail, testPassword, 'Test User');
      if (result.error) {
        setTestError(result.error);
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestSignOut = async () => {
    setTestLoading(true);
    setTestError(null);
    setLastAction('Sign Out');
    
    try {
      const result = await signOut();
      if (result.error) {
        setTestError(result.error);
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestResetPassword = async () => {
    setTestLoading(true);
    setTestError(null);
    setLastAction('Reset Password');
    
    try {
      const result = await resetPassword(testEmail);
      if (result.error) {
        setTestError(result.error);
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setTestLoading(false);
    }
  };

  const testRoutes = [
    { path: '/', name: 'Home', protected: false },
    { path: '/login', name: 'Login', protected: false },
    { path: '/projects', name: 'Projects', protected: true },
    { path: '/create-project', name: 'Create Project', protected: true },
    { path: '/dashboard', name: 'Dashboard', protected: true },
    { path: '/profile', name: 'Profile', protected: true },
  ];

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Authentication Testing Panel</h1>
        <p className="text-muted-foreground">
          Comprehensive testing tool for authentication functionality
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Authentication Status
            </CardTitle>
            <CardDescription>
              Current authentication state and user information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Loading State</Label>
                <Badge variant={isLoading ? "default" : "secondary"}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Loading
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ready
                    </>
                  )}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Authentication</Label>
                <Badge variant={isAuthenticated ? "default" : "destructive"}>
                  {isAuthenticated ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Authenticated
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Authenticated
                    </>
                  )}
                </Badge>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Error</span>
                </div>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </div>
            )}

            {user && (
              <div className="space-y-3">
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User Information
                  </Label>
                  <div className="text-sm space-y-1">
                    <div><strong>ID:</strong> {user.id}</div>
                    <div><strong>Email:</strong> {user.email}</div>
                    <div><strong>Created:</strong> {formatDate(user.created_at)}</div>
                    <div><strong>Last Sign In:</strong> {formatDate(user.last_sign_in_at)}</div>
                  </div>
                </div>
              </div>
            )}

            {session && (
              <div className="space-y-3">
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Session Information
                  </Label>
                  <div className="text-sm space-y-1">
                    <div><strong>Access Token:</strong> {session.access_token.substring(0, 20)}...</div>
                    <div><strong>Expires:</strong> {formatDate(new Date(session.expires_at! * 1000).toISOString())}</div>
                    <div><strong>Token Type:</strong> {session.token_type}</div>
                  </div>
                </div>
              </div>
            )}

            {profile && (
              <div className="space-y-3">
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Profile Information</Label>
                  <div className="text-sm space-y-1">
                    <div><strong>Full Name:</strong> {profile.full_name || 'N/A'}</div>
                    <div><strong>Email:</strong> {profile.email || 'N/A'}</div>
                    <div><strong>Phone:</strong> {profile.phone || 'N/A'}</div>
                    <div><strong>Bio:</strong> {profile.bio || 'N/A'}</div>
                    <div><strong>Avatar URL:</strong> {profile.avatar_url || 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Testing Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Manual Authentication Testing
            </CardTitle>
            <CardDescription>
              Test authentication functions manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="test-email">Test Email</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter test email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-password">Test Password</Label>
                <div className="relative">
                  <Input
                    id="test-password"
                    type={showPassword ? "text" : "password"}
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    placeholder="Enter test password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleTestSignIn}
                disabled={testLoading}
                size="sm"
              >
                {testLoading && lastAction === 'Sign In' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Sign In
              </Button>
              <Button
                onClick={handleTestSignUp}
                disabled={testLoading}
                variant="outline"
                size="sm"
              >
                {testLoading && lastAction === 'Sign Up' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <User className="h-4 w-4 mr-2" />
                )}
                Sign Up
              </Button>
              <Button
                onClick={handleTestSignOut}
                disabled={testLoading}
                variant="destructive"
                size="sm"
              >
                {testLoading && lastAction === 'Sign Out' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Sign Out
              </Button>
              <Button
                onClick={handleTestResetPassword}
                disabled={testLoading}
                variant="outline"
                size="sm"
              >
                {testLoading && lastAction === 'Reset Password' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <AlertCircle className="h-4 w-4 mr-2" />
                )}
                Reset
              </Button>
            </div>

            {testError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Test Error</span>
                </div>
                <p className="text-sm text-destructive/80 mt-1">{testError}</p>
              </div>
            )}

            {lastAction && !testError && !testLoading && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Success</span>
                </div>
                <p className="text-sm text-green-600 mt-1">{lastAction} completed successfully</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Route Testing */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Route Testing
            </CardTitle>
            <CardDescription>
              Test navigation to different routes and verify protection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Route</Label>
              <Badge variant="outline" className="font-mono">
                {location.pathname}{location.search}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {testRoutes.map((route) => (
                <Button
                  key={route.path}
                  onClick={() => navigate(route.path)}
                  variant={location.pathname === route.path ? "default" : "outline"}
                  size="sm"
                  className="justify-start"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex items-center gap-1">
                      {route.protected ? (
                        <Shield className="h-3 w-3 text-orange-500" />
                      ) : (
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                      )}
                      <span className="truncate">{route.name}</span>
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span>Public Route</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-orange-500" />
                <span>Protected Route (requires authentication)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Context Values Debug */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Raw Context Values</CardTitle>
            <CardDescription>
              Raw authentication context values for debugging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-64">
              {JSON.stringify({
                isLoading,
                isAuthenticated,
                error,
                user: user ? {
                  id: user.id,
                  email: user.email,
                  created_at: user.created_at,
                  last_sign_in_at: user.last_sign_in_at
                } : null,
                session: session ? {
                  access_token: session.access_token.substring(0, 20) + '...',
                  expires_at: session.expires_at,
                  token_type: session.token_type
                } : null,
                profile
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}