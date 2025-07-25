import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks';
import { Eye, EyeOff, Check, X, Shield, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    { label: 'At least 8 characters', test: (p) => p.length >= 8, met: false },
    { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p), met: false },
    { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p), met: false },
    { label: 'Contains number', test: (p) => /\d/.test(p), met: false },
    { label: 'Contains special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p), met: false }
  ]);

  const [validationErrors, setValidationErrors] = useState({
    password: '',
    confirmPassword: ''
  });

  // Check if we have valid reset tokens and set session
  useEffect(() => {
    const checkTokens = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');

      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          // Set the session with the tokens from the URL
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            setError('Invalid or expired reset link. Please request a new password reset.');
          } else {
            setValidToken(true);
          }
        } catch (error) {
          setError('Failed to validate reset link. Please request a new password reset.');
        }
      } else {
        setError('Invalid or expired reset link. Please request a new password reset.');
      }
      setCheckingToken(false);
    };

    checkTokens();
  }, [searchParams]);

  // Update password requirements in real-time
  useEffect(() => {
    if (formData.password) {
      const updatedRequirements = requirements.map(req => ({
        ...req,
        met: req.test(formData.password)
      }));
      setRequirements(updatedRequirements);
      
      const metCount = updatedRequirements.filter(req => req.met).length;
      setPasswordStrength((metCount / requirements.length) * 100);
    } else {
      setPasswordStrength(0);
      setRequirements(reqs => reqs.map(req => ({ ...req, met: false })));
    }
  }, [formData.password]);

  const validateField = (name: string, value: string) => {
    let error = '';
    
    switch (name) {
      case 'password':
        if (!value) error = 'Password is required';
        else if (requirements.filter(req => req.test(value)).length < 3) 
          error = 'Password must meet at least 3 requirements';
        break;
      case 'confirmPassword':
        if (!value) error = 'Please confirm your password';
        else if (value !== formData.password) error = 'Passwords do not match';
        break;
    }
    
    setValidationErrors(prev => ({ ...prev, [name]: error }));
    return error === '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear previous errors and validate
    if (validationErrors[name as keyof typeof validationErrors]) {
      validateField(name, value);
    }

    // Also validate confirm password when password changes
    if (name === 'password' && formData.confirmPassword) {
      validateField('confirmPassword', formData.confirmPassword);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const isValidForm = [
      validateField('password', formData.password),
      validateField('confirmPassword', formData.confirmPassword)
    ].every(Boolean);

    if (!isValidForm) return;

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) {
        setError(error.message || 'Failed to update password. Please try again.');
        return;
      }

      // Clear sensitive data from memory
      setFormData({ password: '', confirmPassword: '' });
      setSuccess(true);
      
      // Log successful password reset for security monitoring
      console.log('Password reset completed successfully for user:', user?.id);
      
      // Automatically redirect to dashboard after success (user is already signed in)
      setTimeout(() => {
        navigate('/', { 
          state: { 
            message: 'Password updated successfully! Welcome back.',
            type: 'success'
          }
        });
      }, 2000);

    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-destructive';
    if (passwordStrength < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 80) return 'Medium';
    return 'Strong';
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/forgot-password')}
                className="w-full"
              >
                Request New Reset Link
              </Button>
              
              <div className="text-center">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/login')}
                  className="text-sm"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
            
            {/* Contact Support */}
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Still having trouble?{' '}
                <a href="/contact" className="text-primary hover:underline">
                  Contact Support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Password Updated</CardTitle>
            <CardDescription>
              Your password has been successfully updated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your password has been updated and you're now signed in. Redirecting you to your dashboard...
              </AlertDescription>
            </Alert>
            
            {/* Security confirmation */}
            <div className="text-center text-sm text-muted-foreground">
              <p>For your security, you may want to sign out of other devices</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription>
            Choose a strong password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={cn(
                    "pr-10",
                    validationErrors.password && "border-destructive focus-visible:ring-destructive"
                  )}
                  disabled={isLoading}
                  autoFocus
                  autoComplete="new-password"
                  aria-describedby="password-requirements password-help"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <p id="password-help" className="text-sm text-muted-foreground">
                Create a strong password with at least 8 characters including uppercase, lowercase, numbers, and special characters
              </p>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Password strength:</span>
                    <span className={cn(
                      "font-medium",
                      passwordStrength < 40 && "text-destructive",
                      passwordStrength >= 40 && passwordStrength < 80 && "text-yellow-600",
                      passwordStrength >= 80 && "text-green-600"
                    )}>
                      {getStrengthLabel()}
                    </span>
                  </div>
                   <div className="relative">
                    <Progress 
                      value={passwordStrength} 
                      className="h-2"
                    />
                    <div 
                      className={cn(
                        "absolute top-0 left-0 h-2 rounded-full transition-all duration-300",
                        getStrengthColor()
                      )}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Password Requirements */}
              <div id="password-requirements" className="space-y-1">
                {requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {req.met ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={cn(
                      req.met ? "text-green-600" : "text-muted-foreground"
                    )}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>

              {validationErrors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={cn(
                    "pr-10",
                    validationErrors.confirmPassword && "border-destructive focus-visible:ring-destructive",
                    formData.confirmPassword && formData.confirmPassword === formData.password && "border-green-500 focus-visible:ring-green-500"
                  )}
                  disabled={isLoading}
                  autoComplete="new-password"
                  aria-describedby={validationErrors.confirmPassword ? "confirmPassword-error" : "confirmPassword-help"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <p id="confirmPassword-help" className="text-sm text-muted-foreground">
                Re-enter your password to confirm it matches
              </p>
              
              {formData.confirmPassword && formData.confirmPassword === formData.password && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Passwords match
                </p>
              )}
              {validationErrors.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !formData.password || !formData.confirmPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>

            {/* Security Tips */}
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security Tips
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use a unique password not used on other accounts</li>
                <li>• Make sure you're on a secure network</li>
                <li>• Consider using a password manager</li>
                <li>• Avoid common words or personal information</li>
              </ul>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;