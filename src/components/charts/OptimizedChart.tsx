
import React, { Suspense, memo } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OptimizedChartProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  height?: number;
  className?: string;
}

const ChartSkeleton = memo(({ height = 300 }: { height?: number }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Skeleton className="h-5 w-5" />
      <Skeleton className="h-4 w-32" />
    </div>
    <Skeleton className="h-3 w-48" />
    <Skeleton className={`w-full`} style={{ height: `${height}px` }} />
  </div>
));

const ChartErrorFallback = memo(({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-64 text-center">
    <div className="text-muted-foreground mb-2">⚠️</div>
    <h3 className="font-medium mb-1">Chart Error</h3>
    <p className="text-sm text-muted-foreground">Failed to load {title}</p>
  </div>
));

class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const OptimizedChart = memo(({ 
  title, 
  description, 
  icon, 
  children, 
  height = 300,
  className = ""
}: OptimizedChartProps) => {
  return (
    <Card className={`interactive-lift ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartErrorBoundary fallback={<ChartErrorFallback title={title} />}>
          <Suspense fallback={<ChartSkeleton height={height} />}>
            <div style={{ height: `${height}px` }}>
              {children}
            </div>
          </Suspense>
        </ChartErrorBoundary>
      </CardContent>
    </Card>
  );
});

OptimizedChart.displayName = 'OptimizedChart';
