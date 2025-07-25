import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/contexts';
import { Eye, EyeOff, Check, X, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

const Signup = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const user = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    { label: 'At least 8 characters', test: (p) => p.length >= 8, met: false },
    { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p), met: false },
    { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p), met: false },
    { label: 'Contains number', test: (p) => /\d/.test(p), met: false },
    { label: 'Contains special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p), met: false }
  ]);

  const [validationErrors, setValidationErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: ''
  });

  // Redirect if authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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
      case 'fullName':
        if (!value.trim()) error = 'Full name is required';
        else if (value.trim().length < 2) error = 'Full name must be at least 2 characters';
        break;
      case 'email':
        if (!value.trim()) error = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Please enter a valid email address';
        break;
      case 'password':
        if (!value) error = 'Password is required';
        else if (requirements.filter(req => req.test(value)).length < 3) error = 'Password must meet at least 3 requirements';
        break;
      case 'confirmPassword':
        if (!value) error = 'Please confirm your password';
        else if (value !== formData.password) error = 'Passwords do not match';
        break;
      case 'acceptTerms':
        if (!formData.acceptTerms) error = 'You must accept the terms of service to continue';
        break;
    }
    
    setValidationErrors(prev => ({ ...prev, [name]: error }));
    return error === '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Clear previous errors and validate
    if (validationErrors[name as keyof typeof validationErrors]) {
      validateField(name, type === 'checkbox' ? (checked ? 'true' : '') : value);
    }

    // Also validate confirm password when password changes
    if (name === 'password' && formData.confirmPassword) {
      validateField('confirmPassword', formData.confirmPassword);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    validateField(name, type === 'checkbox' ? (formData.acceptTerms ? 'true' : '') : value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const isValidForm = [
      validateField('fullName', formData.fullName),
      validateField('email', formData.email),
      validateField('password', formData.password),
      validateField('confirmPassword', formData.confirmPassword),
      validateField('acceptTerms', formData.acceptTerms ? 'true' : '')
    ].every(Boolean);

    if (!isValidForm) return;

    setIsSubmitting(true);
    setOperationError(null);

    const { error } = await signUp(formData.email, formData.password, formData.fullName);
    
    if (!error) {
      // Show success message and redirect
      navigate('/login', { 
        state: { 
          message: 'Account created successfully! Please check your email to confirm your account before signing in.',
          email: formData.email
        }
      });
    } else {
      setOperationError(error);
    }
    
    setIsSubmitting(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
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
          <CardTitle className="text-2xl font-bold">Join Us</CardTitle>
          <CardDescription>
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyPress={handleKeyPress}
                className={cn(
                  validationErrors.fullName && "border-destructive focus-visible:ring-destructive"
                )}
                autoFocus
                disabled={isSubmitting}
                aria-describedby={validationErrors.fullName ? "fullName-error" : undefined}
              />
              {validationErrors.fullName && (
                <p id="fullName-error" className="text-sm text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {validationErrors.fullName}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyPress={handleKeyPress}
                className={cn(
                  validationErrors.email && "border-destructive focus-visible:ring-destructive"
                )}
                disabled={isSubmitting}
                aria-describedby={validationErrors.email ? "email-error" : undefined}
              />
              {validationErrors.email && (
                <p id="email-error" className="text-sm text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Password should meet at least 3 requirements</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  onKeyPress={handleKeyPress}
                  className={cn(
                    "pr-10",
                    validationErrors.password && "border-destructive focus-visible:ring-destructive"
                  )}
                  disabled={isSubmitting}
                  aria-describedby="password-requirements"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
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
                  <Progress 
                    value={passwordStrength} 
                    className="h-2"
                  />
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
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  onKeyPress={handleKeyPress}
                  className={cn(
                    "pr-10",
                    validationErrors.confirmPassword && "border-destructive focus-visible:ring-destructive",
                    formData.confirmPassword && formData.confirmPassword === formData.password && "border-green-500 focus-visible:ring-green-500"
                  )}
                  disabled={isSubmitting}
                  aria-describedby={validationErrors.confirmPassword ? "confirmPassword-error" : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
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

            {/* Terms and Conditions */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => 
                    handleInputChange({
                      target: { name: 'acceptTerms', type: 'checkbox', checked }
                    } as any)
                  }
                  disabled={isSubmitting}
                  className={cn(
                    validationErrors.acceptTerms && "border-destructive"
                  )}
                  aria-describedby={validationErrors.acceptTerms ? "terms-error" : undefined}
                />
                <Label 
                  htmlFor="acceptTerms" 
                  className="text-sm leading-tight cursor-pointer"
                >
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {validationErrors.acceptTerms && (
                <p id="terms-error" className="text-sm text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {validationErrors.acceptTerms}
                </p>
              )}
            </div>

            {/* Error Message */}
            {operationError && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {operationError}
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            {/* Login Link */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link 
                to="/login" 
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;