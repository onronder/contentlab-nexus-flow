import React, { useState, useRef, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { Download, Maximize2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BaseChartProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  onExport?: () => void;
  className?: string;
  height?: number;
}

interface PieChartData {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface BarChartData {
  name: string;
  value: number;
  color?: string;
}

interface LineChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

// Color palette for charts (accessible colors)
const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(210, 100%, 50%)', // Blue
  'hsl(150, 60%, 45%)',  // Green
  'hsl(45, 90%, 55%)',   // Yellow
  'hsl(15, 85%, 55%)',   // Orange
  'hsl(270, 70%, 60%)',  // Purple
  'hsl(345, 80%, 55%)',  // Pink
];

// Custom tooltip component with accessibility
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="bg-background border border-border rounded-lg shadow-lg p-3"
        role="tooltip"
        aria-label={`Chart data for ${label}`}
      >
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p 
            key={index} 
            className="text-sm"
            style={{ color: entry.color }}
          >
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            {entry.payload.percentage && ` (${entry.payload.percentage}%)`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Base chart wrapper with common functionality
function ChartWrapper({ 
  title, 
  description, 
  isLoading, 
  error, 
  onRetry, 
  onExport, 
  className, 
  children,
  height = 300
}: BaseChartProps & { children: React.ReactNode }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  const renderError = () => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive mb-3" aria-hidden="true" />
      <h3 className="font-medium text-foreground mb-2">Failed to Load Chart</h3>
      <p className="text-sm text-muted-foreground mb-4" role="alert">
        {error || 'An error occurred while loading the chart data.'}
      </p>
      {onRetry && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          aria-label={`Retry loading ${title} chart`}
        >
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  );

  const renderLoading = () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" role="status">
        <span className="sr-only">Loading chart data...</span>
      </div>
    </div>
  );

  const chartContent = error ? renderError() : isLoading ? renderLoading() : children;

  const cardContent = (
    <Card 
      ref={chartRef}
      className={cn(
        'transition-all duration-200',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
      role="img"
      aria-label={`${title} chart`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {description}
            </CardDescription>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              aria-label={`Export ${title} chart`}
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
            className="h-8 w-8 p-0"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: isFullscreen ? 'calc(100vh - 200px)' : height }}>
          {chartContent}
        </div>
      </CardContent>
    </Card>
  );

  if (isFullscreen) {
    return (
      <>
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" />
        {cardContent}
      </>
    );
  }

  return cardContent;
}

// Pie Chart Component
interface ProjectPieChartProps extends BaseChartProps {
  data: PieChartData[];
  showPercentages?: boolean;
}

export function ProjectPieChart({ 
  data, 
  showPercentages = true, 
  ...props 
}: ProjectPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartWrapper {...props}>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>No data available</p>
        </div>
      </ChartWrapper>
    );
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (!showPercentages || percent < 0.05) return null; // Don't show labels for slices < 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ChartWrapper {...props}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            role="img"
            aria-label={`Pie chart showing ${props.title}`}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry) => (
              <span style={{ color: entry.color }} className="text-sm">
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// Bar Chart Component
interface ProjectBarChartProps extends BaseChartProps {
  data: BarChartData[];
  horizontal?: boolean;
  showValues?: boolean;
}

export function ProjectBarChart({ 
  data, 
  horizontal = false, 
  showValues = true,
  ...props 
}: ProjectBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartWrapper {...props}>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>No data available</p>
        </div>
      </ChartWrapper>
    );
  }

  const ChartComponent = horizontal ? BarChart : BarChart;
  const dataKeyX = horizontal ? "value" : "name";
  const dataKeyY = horizontal ? "name" : "value";

  return (
    <ChartWrapper {...props}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={data}
          layout={horizontal ? "horizontal" : "vertical"}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey={dataKeyX}
            type={horizontal ? "number" : "category"}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            dataKey={horizontal ? dataKeyY : undefined}
            type={horizontal ? "category" : "number"}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="value"
            fill="hsl(var(--primary))"
            radius={2}
            role="img"
            aria-label={`Bar chart showing ${props.title}`}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Bar>
        </ChartComponent>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// Line Chart Component
interface ProjectLineChartProps extends BaseChartProps {
  data: LineChartData[];
  lines: Array<{
    dataKey: string;
    name: string;
    color?: string;
    strokeWidth?: number;
  }>;
  showArea?: boolean;
}

export function ProjectLineChart({ 
  data, 
  lines, 
  showArea = false,
  ...props 
}: ProjectLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartWrapper {...props}>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>No data available</p>
        </div>
      </ChartWrapper>
    );
  }

  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <ChartWrapper {...props}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {lines.map((line, index) => {
            const color = line.color || CHART_COLORS[index % CHART_COLORS.length];
            
            return showArea ? (
              <Area
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={color}
                fill={color}
                fillOpacity={0.3}
                strokeWidth={line.strokeWidth || 2}
                name={line.name}
              />
            ) : (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={color}
                strokeWidth={line.strokeWidth || 2}
                name={line.name}
                dot={{ fill: color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
              />
            );
          })}
        </ChartComponent>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}