import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@supabase/auth-helpers-react';
import { Mail, ArrowLeft, Clock, Shield, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const user = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Redirect if authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Handle resend countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    } else if (resetSent) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown, resetSent]);

  const validateEmail = (email: string) => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear error when user starts typing
    if (emailError) {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) return;

    setIsSubmitting(true);
    setOperationError(null);

    const { error } = await resetPassword(email);
    
    if (!error) {
      setResetSent(true);
      setCanResend(false);
      setResendCountdown(60); // 60 second cooldown
    } else {
      setOperationError(error);
    }
    
    setIsSubmitting(false);
  };

  const handleResend = async () => {
    if (!canResend || isSubmitting) return;
    
    setIsSubmitting(true);
    const { error } = await resetPassword(email);
    
    if (!error) {
      setCanResend(false);
      setResendCountdown(60);
    }
    
    setIsSubmitting(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !resetSent) {
      handleSubmit(e as any);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {resetSent ? 'Check Your Email' : 'Reset Your Password'}
          </CardTitle>
          <CardDescription>
            {resetSent 
              ? "We've sent password reset instructions to your email address"
              : "Enter your email address and we'll send you a link to reset your password"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!resetSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => validateEmail(email)}
                  onKeyPress={handleKeyPress}
                  className={cn(
                    emailError && "border-destructive focus-visible:ring-destructive"
                  )}
                  placeholder="Enter your email address"
                  autoFocus
                  disabled={isSubmitting}
                  aria-describedby={emailError ? "email-error" : "email-help"}
                />
                {emailError && (
                  <p id="email-error" className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {emailError}
                  </p>
                )}
                <p id="email-help" className="text-sm text-muted-foreground">
                  Enter the email address associated with your account
                </p>
              </div>

              {/* Error Message */}
              {operationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{operationError}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || !email.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Success Message */}
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Password reset instructions have been sent to <strong>{email}</strong>
                </AlertDescription>
              </Alert>

              {/* Instructions */}
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Check your email within the next few minutes</p>
                    <p>The reset link will arrive shortly in your inbox</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Can't find the email?</p>
                    <ul className="space-y-1 mt-1">
                      <li>• Check your spam or junk folder</li>
                      <li>• Verify the email address spelling</li>
                      <li>• Wait a few more minutes for delivery</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Security Tips</p>
                    <ul className="space-y-1 mt-1">
                      <li>• Reset links expire after 1 hour</li>
                      <li>• Only use links from official emails</li>
                      <li>• Create a strong, unique password</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Resend Option */}
              <div className="pt-4 border-t">
                {canResend ? (
                  <Button
                    variant="outline"
                    onClick={handleResend}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Reset Email
                      </>
                    )}
                  </Button>
                ) : resendCountdown > 0 ? (
                  <Button variant="outline" disabled className="w-full">
                    <Clock className="mr-2 h-4 w-4" />
                    Resend available in {resendCountdown}s
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="w-full">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Email Sent Successfully
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/login')}
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
              
              {!resetSent && (
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => navigate('/signup')}
                  disabled={isSubmitting}
                >
                  Create Account
                </Button>
              )}
            </div>

            {resetSent && (
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Remember your password? </span>
                <Link 
                  to="/login" 
                  className="text-primary hover:underline font-medium"
                >
                  Sign in instead
                </Link>
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="text-center text-sm">
            <p className="text-muted-foreground">
              Still having trouble? {' '}
              <Link 
                to="/contact" 
                className="text-primary hover:underline font-medium"
              >
                Contact Support
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;