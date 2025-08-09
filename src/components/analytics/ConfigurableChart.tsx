import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartBuilderConfig } from "./ChartConfigPanel";
import { applyNormalization, computeFormula } from "./dataTransforms";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

function linearRegression(points: Array<{ x: number; y: number }>) {
  const n = points.length;
  if (n < 2) return { m: 0, b: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumXX += p.x * p.x;
  }
  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const b = (sumY - m * sumX) / n;
  return { m, b };
}

function buildTrendline(data: any[], xKey: string, yKey: string) {
  const pts = data.map((d, i) => ({ x: typeof d[xKey] === "number" ? d[xKey] : i, y: Number(d[yKey] ?? 0) }));
  const { m, b } = linearRegression(pts);
  return pts.map(p => ({ [xKey]: p.x, [yKey]: m * p.x + b, __trend: true }));
}

function keyColors(keys: string[], palette: string[]) {
  return keys.reduce<Record<string, string>>((acc, k, i) => {
    acc[k] = palette[i % palette.length];
    return acc;
  }, {});
}

export interface ConfigurableChartProps {
  title: string;
  description?: string;
  data: any[];
  config: ChartBuilderConfig;
  onSelectNames?: (names: string[]) => void;
}

const ConfigurableChart: React.FC<ConfigurableChartProps> = ({ title, description, data, config, onSelectNames }) => {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const palette = useMemo(() => {
    const fromCss = (i: number) => getComputedStyle(document.documentElement).getPropertyValue(`--chart-${i+1}`);
    if (config.palette === "default") {
      return [1,2,3,4,5].map(i => `hsl(${fromCss(i) || "217 91% 60%"})`);
    }
    if (config.palette === "mono") {
      const p = getComputedStyle(document.documentElement).getPropertyValue("--primary");
      return [1,0.85,0.7,0.55,0.4].map(a => `hsl(${p} / ${a})`);
    }
    if (config.palette === "custom") return config.customColors.filter(Boolean);
    // cool / warm defined explicitly
    return config.palette === "cool"
      ? ["hsl(217 91% 60%)","hsl(197 63% 55%)","hsl(180 70% 45%)","hsl(200 80% 50%)","hsl(220 70% 50%)"]
      : ["hsl(12 76% 61%)","hsl(27 87% 55%)","hsl(43 74% 50%)","hsl(0 84% 60%)","hsl(15 75% 55%)"];  
  }, [config.palette, config.customColors]);

  const colorsByKey = useMemo(() => keyColors(config.yKeys.length ? config.yKeys : ["value"], palette), [config.yKeys, palette]);

  const addOrRemoveSelected = (name: string) => {
    if (!config.selectionEnabled) return;
    setSelectedNames(prev => {
      const exists = prev.includes(name);
      const next = exists ? prev.filter(n => n !== name) : [...prev, name];
      onSelectNames?.(next);
      return next;
    });
  };

  const chartConfig = useMemo(() => {
    // Map series labels for tooltip/legend
    const entries = (config.yKeys.length ? config.yKeys : ["value"]).map(k => ([k, { label: k, color: colorsByKey[k] }] as const));
    return Object.fromEntries(entries);
  }, [config.yKeys, colorsByKey]);

  const withTrend = useMemo(() => {
    if (!config.showTrendline || config.chartType === "pie" || config.yKeys.length !== 1) return null;
    return buildTrendline(data, config.xKey, config.yKeys[0]);
  }, [config.showTrendline, config.chartType, config.yKeys, data, config.xKey]);

  const commonAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={config.xKey} label={config.xLabel ? { value: config.xLabel, position: "insideBottom", offset: -5 } : undefined} />
      <YAxis label={config.yLabel ? { value: config.yLabel, angle: -90, position: "insideLeft" } : undefined} />
      <ChartTooltip content={<ChartTooltipContent />} />
      {config.showLegend && <Legend />}
      {config.showBrush && <Brush dataKey={config.xKey} height={24} travellerWidth={8} />}
      {config.annotations.map((a, i) => (
        <ReferenceLine key={i} x={isNaN(Number(a.x)) ? a.x : Number(a.x)} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={a.label || undefined} />
      ))}
    </>
  );

  const heightStyle = { height: `${config.height || 300}px` } as React.CSSProperties;

  const renderByType = () => {
    if (config.chartType === "pie") {
      const valueKey = config.yKeys[0] || "value";
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart onClick={(e: any) => e?.activePayload?.[0]?.payload?.name && addOrRemoveSelected(e.activePayload[0].payload.name)}>
            <Tooltip />
            <Pie data={data} dataKey={valueKey} nameKey={config.xKey} cx="50%" cy="50%" outerRadius={Math.min(120, (config.height || 300) / 2 - 20)} label>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={palette[index % palette.length]} opacity={selectedNames.length ? (selectedNames.includes(entry[config.xKey]) ? 1 : 0.4) : 1} />
              ))}
            </Pie>
            {config.showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      );
    }

    const LinesOrAreas = config.yKeys.map((k, i) => {
      const color = colorsByKey[k];
      if (config.chartType === "area") {
        return <Area key={k} type="monotone" dataKey={k} stroke={color} fill={color} fillOpacity={0.25} strokeWidth={2} />;
      }
      if (config.chartType === "bar") {
        return <Bar key={k} dataKey={k} fill={color} onClick={(d: any) => d?.activeLabel && addOrRemoveSelected(String(d.activeLabel))} />;
      }
      return <Line key={k} type="monotone" dataKey={k} stroke={color} strokeWidth={2} dot={false} />;
    });

    const trend = withTrend && (
      <>
        <Line type="monotone" dataKey={config.yKeys[0]} data={withTrend} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} isAnimationActive={false} />
      </>
    );

    if (config.chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} onClick={(d: any) => d?.activeLabel && addOrRemoveSelected(String(d.activeLabel))}>
            {commonAxes}
            {LinesOrAreas}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (config.chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            {commonAxes}
            {LinesOrAreas}
            {trend}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          {commonAxes}
          {LinesOrAreas}
          {trend}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="interactive-lift">
      <CardHeader>
        <CardTitle>{config.title || title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full" style={heightStyle}>
          {renderByType()}
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default ConfigurableChart;
