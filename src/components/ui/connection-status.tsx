import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isOnline: boolean;
  hasError?: boolean;
  errorMessage?: string;
  className?: string;
}

export function ConnectionStatus({ 
  isOnline, 
  hasError = false, 
  errorMessage,
  className 
}: ConnectionStatusProps) {
  if (isOnline && !hasError) {
    return null; // Don't show when everything is fine
  }

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        variant: 'destructive' as const,
        title: 'Connection Lost',
        message: 'Check your internet connection. Data may be outdated.',
        badgeText: 'Offline'
      };
    }
    
    if (hasError) {
      return {
        icon: AlertTriangle,
        variant: 'destructive' as const,
        title: 'Service Unavailable',
        message: errorMessage || 'Some features may be temporarily unavailable.',
        badgeText: 'Limited'
      };
    }

    return {
      icon: CheckCircle,
      variant: 'default' as const,
      title: 'Connected',
      message: 'All systems operational.',
      badgeText: 'Online'
    };
  };

  const { icon: Icon, variant, title, message, badgeText } = getStatusConfig();

  return (
    <Alert variant={variant} className={cn('mb-4', className)}>
      <Icon className="h-4 w-4" />
      <div className="flex items-center justify-between">
        <div>
          <AlertDescription className="font-medium">
            {title}
          </AlertDescription>
          <AlertDescription className="text-sm opacity-90">
            {message}
          </AlertDescription>
        </div>
        <Badge variant={variant === 'destructive' ? 'destructive' : 'secondary'}>
          {badgeText}
        </Badge>
      </div>
    </Alert>
  );
}