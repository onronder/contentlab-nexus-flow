import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
  // Accessibility
  ariaLabel?: string;
  ariaDescription?: string;
}

const variantStyles = {
  default: 'border-border',
  success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
  warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
  error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
};

const valueTextStyles = {
  default: 'text-foreground',
  success: 'text-green-700 dark:text-green-300',
  warning: 'text-yellow-700 dark:text-yellow-300',
  error: 'text-red-700 dark:text-red-300'
};

export function AnalyticsCard({
  title,
  value,
  description,
  trend,
  icon,
  variant = 'default',
  isLoading = false,
  error,
  onRetry,
  className,
  ariaLabel,
  ariaDescription
}: AnalyticsCardProps) {
  const renderTrendIndicator = () => {
    if (!trend) return null;
    
    const { value: trendValue, label } = trend;
    const isPositive = trendValue > 0;
    const isNegative = trendValue < 0;
    const isNeutral = trendValue === 0;
    
    const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    const trendColor = isPositive 
      ? 'text-green-600 dark:text-green-400' 
      : isNegative 
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground';
    
    return (
      <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
        <TrendIcon className="h-3 w-3" aria-hidden="true" />
        <span className="font-medium">
          {Math.abs(trendValue)}%
        </span>
        <span className="text-muted-foreground">{label}</span>
      </div>
    );
  };

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center h-24 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive mb-2" aria-hidden="true" />
      <p className="text-sm text-muted-foreground mb-2" role="alert">
        {error || 'Failed to load data'}
      </p>
      {onRetry && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="h-7 text-xs"
          aria-label={`Retry loading ${title} data`}
        >
          <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  );

  const renderLoadingState = () => (
    <div className="flex flex-col space-y-2">
      <div className="h-8 bg-muted rounded animate-pulse" role="status" aria-label="Loading data" />
      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
      <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
    </div>
  );

  const renderContent = () => {
    if (error) return renderErrorState();
    if (isLoading) return renderLoadingState();

    return (
      <>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={cn(
              'text-2xl font-bold tracking-tight',
              valueTextStyles[variant]
            )}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {description && (
              <p 
                className="text-sm text-muted-foreground mt-1"
                id={`${title.replace(/\s+/g, '-').toLowerCase()}-description`}
              >
                {description}
              </p>
            )}
          </div>
          {icon && (
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              variant === 'success' && 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
              variant === 'warning' && 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
              variant === 'error' && 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
              variant === 'default' && 'bg-muted text-muted-foreground'
            )} aria-hidden="true">
              {icon}
            </div>
          )}
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          {renderTrendIndicator()}
          {variant !== 'default' && (
            <Badge 
              variant={variant === 'success' ? 'default' : variant === 'warning' ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              {variant === 'success' && 'Good'}
              {variant === 'warning' && 'Attention'}
              {variant === 'error' && 'Critical'}
            </Badge>
          )}
        </div>
      </>
    );
  };

  return (
    <Card 
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        variantStyles[variant],
        className
      )}
      role="article"
      aria-label={ariaLabel || `${title} analytics card`}
      aria-describedby={description ? `${title.replace(/\s+/g, '-').toLowerCase()}-description` : undefined}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
}

// Specialized analytics cards with built-in configurations
export function ProjectCountCard({ 
  count, 
  isLoading, 
  error, 
  onRetry 
}: { 
  count: number; 
  isLoading?: boolean; 
  error?: string; 
  onRetry?: () => void; 
}) {
  return (
    <AnalyticsCard
      title="Total Projects"
      value={count}
      description="All projects you have access to"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      ariaLabel="Total number of projects"
    />
  );
}

export function ActiveProjectsCard({ 
  count, 
  trend, 
  isLoading, 
  error, 
  onRetry 
}: { 
  count: number; 
  trend?: { value: number; label: string }; 
  isLoading?: boolean; 
  error?: string; 
  onRetry?: () => void; 
}) {
  return (
    <AnalyticsCard
      title="Active Projects"
      value={count}
      description="Currently in progress"
      trend={trend}
      variant={count > 0 ? 'success' : 'default'}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      ariaLabel="Number of active projects"
    />
  );
}

export function CompletionRateCard({ 
  rate, 
  trend, 
  isLoading, 
  error, 
  onRetry 
}: { 
  rate: number; 
  trend?: { value: number; label: string }; 
  isLoading?: boolean; 
  error?: string; 
  onRetry?: () => void; 
}) {
  const variant = rate >= 80 ? 'success' : rate >= 60 ? 'warning' : 'error';
  
  return (
    <AnalyticsCard
      title="Completion Rate"
      value={`${rate}%`}
      description="Projects completed successfully"
      trend={trend}
      variant={variant}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      ariaLabel={`Project completion rate: ${rate} percent`}
    />
  );
}

export function TeamMembersCard({ 
  count, 
  isLoading, 
  error, 
  onRetry 
}: { 
  count: number; 
  isLoading?: boolean; 
  error?: string; 
  onRetry?: () => void; 
}) {
  return (
    <AnalyticsCard
      title="Team Members"
      value={count}
      description="Active collaborators"
      variant={count > 0 ? 'default' : 'warning'}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      ariaLabel="Number of team members"
    />
  );
}