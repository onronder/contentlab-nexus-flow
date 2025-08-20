import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LineChart, Line, AreaChart, Area, Scatter, ScatterChart, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea, Brush 
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Zap, AlertTriangle } from 'lucide-react';

interface ConfidenceIntervalProps {
  data: Array<{
    x: number | string;
    y: number;
    upperBound: number;
    lowerBound: number;
    confidence: number;
  }>;
  title: string;
  showBrush?: boolean;
}

export function ConfidenceIntervalChart({ data, title, showBrush = false }: ConfidenceIntervalProps) {
  const [confidenceLevel, setConfidenceLevel] = useState([95]);
  
  const processedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      confidenceRange: point.upperBound - point.lowerBound,
      confidenceWidth: (point.upperBound - point.lowerBound) / 2
    }));
  }, [data]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Confidence:</span>
            <Badge variant="outline">{confidenceLevel[0]}%</Badge>
          </div>
        </div>
        <div className="px-3">
          <Slider
            value={confidenceLevel}
            onValueChange={setConfidenceLevel}
            max={99}
            min={50}
            step={5}
            className="w-32"
          />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="x" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-medium">{label}</p>
                      <p className="text-sm">
                        <span className="text-primary">Predicted:</span> {data.y.toFixed(2)}
                      </p>
                      <p className="text-sm">
                        <span className="text-blue-600">Upper:</span> {data.upperBound.toFixed(2)}
                      </p>
                      <p className="text-sm">
                        <span className="text-blue-600">Lower:</span> {data.lowerBound.toFixed(2)}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Confidence:</span> {data.confidence}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            
            <Area
              dataKey="upperBound"
              stroke="none"
              fill="hsl(var(--primary))"
              fillOpacity={0.1}
              name="Confidence Band"
            />
            <Area
              dataKey="lowerBound"
              stroke="none"
              fill="hsl(var(--background))"
              fillOpacity={1}
            />
            <Line
              dataKey="y"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              name="Predicted Value"
            />
            
            {showBrush && <Brush dataKey="x" height={30} />}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface StatisticalModelDiagnosticsProps {
  metrics: {
    rsquared: number;
    mae: number;
    rmse: number;
    mape: number;
    residuals: number[];
    predictions: number[];
    actual: number[];
  };
}

export function StatisticalModelDiagnostics({ metrics }: StatisticalModelDiagnosticsProps) {
  const [activeView, setActiveView] = useState('overview');

  const residualData = useMemo(() => {
    return metrics.residuals.map((residual, index) => ({
      index,
      residual,
      predicted: metrics.predictions[index],
      actual: metrics.actual[index]
    }));
  }, [metrics]);

  const getModelQuality = (rsquared: number) => {
    if (rsquared >= 0.9) return { label: 'Excellent', color: 'text-green-600', variant: 'secondary' as const };
    if (rsquared >= 0.8) return { label: 'Good', color: 'text-blue-600', variant: 'default' as const };
    if (rsquared >= 0.7) return { label: 'Fair', color: 'text-yellow-600', variant: 'outline' as const };
    return { label: 'Poor', color: 'text-red-600', variant: 'destructive' as const };
  };

  const quality = getModelQuality(metrics.rsquared);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Model Performance Diagnostics
          </CardTitle>
          <Badge variant={quality.variant} className={quality.color}>
            {quality.label}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeView === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('overview')}
          >
            Overview
          </Button>
          <Button
            variant={activeView === 'residuals' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('residuals')}
          >
            Residuals
          </Button>
          <Button
            variant={activeView === 'predictions' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('predictions')}
          >
            Predictions
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeView === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {(metrics.rsquared * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">R²</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.mae.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">MAE</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {metrics.rmse.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">RMSE</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {(metrics.mape * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">MAPE</div>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height={300}>
          {activeView === 'residuals' ? (
            <ScatterChart data={residualData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="predicted" 
                name="Predicted"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                dataKey="residual" 
                name="Residual"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="text-sm">Predicted: {data.predicted.toFixed(2)}</p>
                        <p className="text-sm">Actual: {data.actual.toFixed(2)}</p>
                        <p className="text-sm">Residual: {data.residual.toFixed(2)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Zero residual line */}
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              <Scatter dataKey="residual" fill="hsl(var(--primary))" />
            </ScatterChart>
          ) : (
            <LineChart data={residualData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="index" 
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                dataKey="actual"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="Actual"
                dot={{ r: 3 }}
              />
              <Line
                dataKey="predicted"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Predicted"
                dot={{ r: 3 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface InteractiveTrendAnalysisProps {
  data: Array<{
    date: string;
    value: number;
    trend: number;
    seasonal: number;
    residual: number;
  }>;
  title: string;
}

export function InteractiveTrendAnalysis({ data, title }: InteractiveTrendAnalysisProps) {
  const [selectedComponents, setSelectedComponents] = useState(['value', 'trend']);
  const [dateRange, setDateRange] = useState<[number, number]>([0, data.length - 1]);

  const filteredData = useMemo(() => {
    return data.slice(dateRange[0], dateRange[1] + 1);
  }, [data, dateRange]);

  const toggleComponent = (component: string) => {
    setSelectedComponents(prev => 
      prev.includes(component) 
        ? prev.filter(c => c !== component)
        : [...prev, component]
    );
  };

  const componentColors = {
    value: 'hsl(var(--primary))',
    trend: 'hsl(var(--secondary))',
    seasonal: 'hsl(var(--accent))',
    residual: 'hsl(var(--muted-foreground))'
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          {Object.entries(componentColors).map(([component, color]) => (
            <Button
              key={component}
              variant={selectedComponents.includes(component) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleComponent(component)}
              className="capitalize"
            >
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: color }}
              />
              {component}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-medium mb-2">{label}</p>
                      {payload.map((entry, index) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                          <span className="capitalize">{entry.dataKey}:</span> {Number(entry.value).toFixed(2)}
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            
            {selectedComponents.map(component => (
              <Line
                key={component}
                dataKey={component}
                stroke={componentColors[component as keyof typeof componentColors]}
                strokeWidth={component === 'value' ? 3 : 2}
                strokeDasharray={component === 'residual' ? '3 3' : 'none'}
                name={component.charAt(0).toUpperCase() + component.slice(1)}
                dot={false}
              />
            ))}
            
            <Brush 
              dataKey="date" 
              height={30}
              onChange={(range) => range && setDateRange([range.startIndex || 0, range.endIndex || data.length - 1])}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}