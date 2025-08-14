import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertTriangle, Info, Shield, Database } from 'lucide-react';
import { validateSettings, ValidationError } from '@/validation/settingsValidation';

interface SettingsValidationIndicatorProps {
  settingType: string;
  data: any;
  context?: any;
  showDetails?: boolean;
}

export const SettingsValidationIndicator: React.FC<SettingsValidationIndicatorProps> = ({
  settingType,
  data,
  context,
  showDetails = false
}) => {
  const validationResult = validateSettings(settingType, data, context);
  
  const getValidationIcon = () => {
    if (validationResult.success) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getValidationBadge = () => {
    if (validationResult.success) {
      return (
        <Badge variant="outline" className="border-green-600 text-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Valid
        </Badge>
      );
    }
    
    const errorCount = validationResult.errors?.length || 0;
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        {errorCount} Error{errorCount !== 1 ? 's' : ''}
      </Badge>
    );
  };

  const getErrorSeverityIcon = (code: string) => {
    switch (code) {
      case 'SECURITY_CONSTRAINT':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'BUSINESS_RULE_VIOLATION':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'DEPENDENCY_VIOLATION':
        return <Database className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getErrorSeverityColor = (code: string) => {
    switch (code) {
      case 'SECURITY_CONSTRAINT':
        return 'border-red-600 bg-red-50';
      case 'BUSINESS_RULE_VIOLATION':
        return 'border-orange-600 bg-orange-50';
      case 'DEPENDENCY_VIOLATION':
        return 'border-blue-600 bg-blue-50';
      default:
        return 'border-gray-600 bg-gray-50';
    }
  };

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        {getValidationIcon()}
        {getValidationBadge()}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getValidationIcon()}
          Settings Validation
        </CardTitle>
        <CardDescription>
          {validationResult.success 
            ? 'All settings are valid and meet requirements'
            : `Found ${validationResult.errors?.length || 0} validation issue(s)`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {validationResult.success ? (
          <Alert className="border-green-600 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              All settings have been validated successfully. No issues found.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {validationResult.errors?.length || 0} validation error(s) found. 
                Please fix these issues before saving.
              </AlertDescription>
            </Alert>
            
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {validationResult.errors?.map((error, index) => (
                  <div 
                    key={index}
                    className={`border rounded-lg p-3 ${getErrorSeverityColor(error.code)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getErrorSeverityIcon(error.code)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {error.field}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {error.code.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">
                          {error.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Validation Summary */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Validation Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Errors:</span>
                  <span className="ml-2 font-medium">{validationResult.errors?.length || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Security Issues:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {validationResult.errors?.filter(e => e.code === 'SECURITY_CONSTRAINT').length || 0}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Business Rules:</span>
                  <span className="ml-2 font-medium text-orange-600">
                    {validationResult.errors?.filter(e => e.code === 'BUSINESS_RULE_VIOLATION').length || 0}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Dependencies:</span>
                  <span className="ml-2 font-medium text-blue-600">
                    {validationResult.errors?.filter(e => e.code === 'DEPENDENCY_VIOLATION').length || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Inline validation component for individual fields
export const FieldValidationIndicator: React.FC<{
  error?: ValidationError;
  className?: string;
}> = ({ error, className = '' }) => {
  if (!error) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <CheckCircle className="h-3 w-3 text-green-600" />
        <span className="text-xs text-green-600">Valid</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <XCircle className="h-3 w-3 text-red-600" />
      <span className="text-xs text-red-600">{error.message}</span>
    </div>
  );
};

// Real-time validation hook
export const useRealtimeValidation = (settingType: string, data: any, context?: any) => {
  const [validationState, setValidationState] = React.useState({
    isValid: true,
    errors: [] as ValidationError[],
    isValidating: false
  });

  React.useEffect(() => {
    if (!data) return;

    setValidationState(prev => ({ ...prev, isValidating: true }));
    
    // Debounce validation
    const timeoutId = setTimeout(() => {
      const result = validateSettings(settingType, data, context);
      setValidationState({
        isValid: result.success,
        errors: result.errors || [],
        isValidating: false
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [settingType, data, context]);

  return validationState;
};