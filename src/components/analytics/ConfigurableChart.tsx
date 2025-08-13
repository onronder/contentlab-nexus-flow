import React, { useMemo, useState, useEffect } from "react";
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
  
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartBuilderConfig } from "./ChartConfigPanel";
import { applyNormalization, computeFormula, bucketByTime, movingAverage } from "./dataTransforms";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, Mail, Share, History } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { exportChartPNG, exportChartCSV, exportChartJSON, exportChartJPEG, exportChartSVG, exportChartPDF, exportChartHTML, exportChartPrint, exportChartXLSX, exportChartSQL, buildCSV } from "@/utils/chartExport";
import { sendChartEmail, createShare, createSchedule } from "@/services/reportingService";
import { ChartShareDialog } from "./ChartShareDialog";
import { ReportHistoryDialog } from "./ReportHistoryDialog";

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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const safeFilename = (name: string) =>
    (name || "chart")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "chart";

  const filenameBase = useMemo(() => safeFilename(config.title || title || "chart"), [config.title, title]);

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
    if (config.palette === "cool") {
      return ["hsl(217 91% 60%)","hsl(197 63% 55%)","hsl(180 70% 45%)","hsl(200 80% 50%)","hsl(220 70% 50%)"];
    }
    if (config.palette === "warm") {
      return ["hsl(12 76% 61%)","hsl(27 87% 55%)","hsl(43 74% 50%)","hsl(0 84% 60%)","hsl(15 75% 55%)"];
    }
    // colorblind-safe
    return ["hsl(205 100% 40%)","hsl(35 90% 55%)","hsl(54 80% 62%)","hsl(156 59% 34%)","hsl(199 68% 63%)"];  
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

const transformed = useMemo(() => {
  let out = data;
  const f = computeFormula(out, config.formula);
  out = f.data;
  const addedKey = f.addedKey;

  // Optional time bucketing before other series transforms
  if (config.timeBucket && config.timeBucket !== "none") {
    const keysForBucket = [...config.yKeys, ...(addedKey ? [addedKey] : [])];
    out = bucketByTime(out, config.xKey, keysForBucket, config.timeBucket);
  }

  const normKeys = config.normalization && config.normalization !== "none" ? [...config.yKeys, ...(addedKey ? [addedKey] : [])] : [];
  if (normKeys.length) {
    out = applyNormalization(out, normKeys, config.normalization!);
  }
  if (config.ciLowerKey && config.ciUpperKey) {
    out = out.map((row: any) => {
      const lower = Number(row[config.ciLowerKey!]) || 0;
      const upper = Number(row[config.ciUpperKey!]) || 0;
      return { ...row, __ciWidth: Math.max(0, upper - lower) };
    });
  }

  if (config.movingAverageWindow && config.movingAverageWindow > 1) {
    out = movingAverage(out, config.yKeys, config.movingAverageWindow);
  }

  return out;
}, [data, config.formula, config.normalization, config.yKeys, config.ciLowerKey, config.ciUpperKey, config.timeBucket, config.movingAverageWindow, config.xKey]);

  const [frame, setFrame] = useState<number>(-1);
  useEffect(() => {
    if (!config.playbackEnabled) { setFrame(-1); return; }
    let i = 1;
    const id = window.setInterval(() => {
      i = (i + 1) % (transformed.length + 1);
      setFrame(i);
    }, config.refreshInterval || 1000);
    return () => window.clearInterval(id);
  }, [config.playbackEnabled, config.refreshInterval, transformed.length]);

  const vizData = useMemo(() => {
    if (frame <= 0) return transformed;
    return transformed.slice(0, frame);
  }, [transformed, frame]);

  const withTrend = useMemo(() => {
    if (!config.showTrendline || config.chartType === "pie" || config.yKeys.length !== 1) return null;
    return buildTrendline(vizData, config.xKey, config.yKeys[0]);
  }, [config.showTrendline, config.chartType, config.yKeys, vizData, config.xKey]);

  const commonAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={config.xKey} label={config.xLabel ? { value: config.xLabel, position: "insideBottom", offset: -5 } : undefined} />
      <YAxis yAxisId="left" label={config.yLabel ? { value: config.yLabel, angle: -90, position: "insideLeft" } : undefined} />
      {config.rightAxisKeys?.length ? (
        <YAxis yAxisId="right" orientation="right" />
      ) : null}
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
    if (config.chartType === "map") {
      const valueKey = config.yKeys[0] || "value";
      const values = vizData.map((d: any) => Number(d[valueKey] ?? 0));
      const min = Math.min(...values, 0);
      const max = Math.max(...values, 1);
      const getOpacity = (v: number) => {
        if (!isFinite(v) || max === min) return 0.3;
        const t = (v - min) / (max - min);
        return 0.2 + t * 0.7;
      };
      return (
        <div style={{ width: "100%", height: "100%" }}>
          <ComposableMap projectionConfig={{ scale: 140 }}>
            <Geographies geography="/maps/countries-110m.json">
              {({ geographies }) =>
                geographies.map((geo) => {
                  const props: any = geo.properties as any;
                  const gName = props.name || props.NAME || props.NAME_LONG || "";
                  const row = vizData.find((r: any) => String(r[config.xKey]) === gName);
                  const v = row ? Number(row[valueKey] ?? 0) : 0;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={palette[0]}
                      fillOpacity={getOpacity(v)}
                      stroke="hsl(var(--border))"
                      strokeWidth={0.3}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>
      );
    }

    if (config.chartType === "pie") {
      const valueKey = config.yKeys[0] || "value";
      return (
        <PieChart onClick={(e: any) => e?.activePayload?.[0]?.payload?.name && addOrRemoveSelected(e.activePayload[0].payload.name)}>
          <Tooltip />
          <Pie data={vizData} dataKey={valueKey} nameKey={config.xKey} cx="50%" cy="50%" outerRadius={Math.min(120, (config.height || 300) / 2 - 20)} label>
            {vizData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={palette[index % palette.length]} opacity={selectedNames.length ? (selectedNames.includes(entry[config.xKey]) ? 1 : 0.4) : 1} />
            ))}
          </Pie>
          {config.showLegend && <Legend />}
        </PieChart>
      );
    }

    const LinesOrAreas = config.yKeys.map((k) => {
      const color = colorsByKey[k];
      const yAxisId = config.rightAxisKeys?.includes(k) ? "right" : "left";
      if (config.chartType === "area") {
        return <Area key={k} yAxisId={yAxisId} type="monotone" dataKey={k} stroke={color} fill={color} fillOpacity={0.25} strokeWidth={2} />;
      }
      if (config.chartType === "bar") {
        return <Bar key={k} yAxisId={yAxisId} dataKey={k} fill={color} onClick={(d: any) => d?.activeLabel && addOrRemoveSelected(String(d.activeLabel))} />;
      }
      return <Line key={k} yAxisId={yAxisId} type="monotone" dataKey={k} stroke={color} strokeWidth={2} dot={false} />;
    });

    const ciBand = config.ciLowerKey && config.ciUpperKey ? (
      <>
        <Area yAxisId="left" type="monotone" dataKey={config.ciLowerKey} stroke="transparent" fill="transparent" isAnimationActive={false} stackId="ci" />
        <Area yAxisId="left" type="monotone" dataKey="__ciWidth" stroke="none" fill={colorsByKey[config.yKeys[0]] || palette[0]} fillOpacity={0.15} isAnimationActive={false} stackId="ci" />
      </>
    ) : null;

    const trend = withTrend && (
      <>
        <Line type="monotone" dataKey={config.yKeys[0]} data={withTrend} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} isAnimationActive={false} />
      </>
    );

    if (config.chartType === "bar") {
      return (
        <BarChart data={vizData} onClick={(d: any) => d?.activeLabel && addOrRemoveSelected(String(d.activeLabel))}>
          {commonAxes}
          {LinesOrAreas}
        </BarChart>
      );
    }

    if (config.chartType === "area") {
      return (
        <AreaChart data={vizData}>
          {commonAxes}
          {ciBand}
          {LinesOrAreas}
          {trend}
        </AreaChart>
      );
    }

    return (
      <LineChart data={vizData}>
        {commonAxes}
        {ciBand}
        {LinesOrAreas}
        {trend}
      </LineChart>
    );
  };

  return (
    <Card className="interactive-lift">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{config.title || title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareDialogOpen(true)}
          >
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryDialogOpen(true)}
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
          
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Export chart" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => chartRef.current && exportChartPNG(chartRef.current, `${filenameBase}.png`)}>PNG</DropdownMenuItem>
            <DropdownMenuItem onClick={() => chartRef.current && exportChartJPEG(chartRef.current, `${filenameBase}.jpg`)}>JPEG</DropdownMenuItem>
            <DropdownMenuItem onClick={() => chartRef.current && exportChartSVG(chartRef.current, `${filenameBase}.svg`)}>SVG</DropdownMenuItem>
            <DropdownMenuItem onClick={() => chartRef.current && exportChartPDF(chartRef.current, `${filenameBase}.pdf`, { orientation: (config.height || 300) > 400 ? 'p' : 'l' })}>PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => chartRef.current && exportChartHTML(chartRef.current, `${filenameBase}.html`)}>HTML (snapshot)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => chartRef.current && exportChartPrint(chartRef.current)}>Print…</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportChartXLSX(vizData, config.xKey, config.yKeys, `${filenameBase}.xlsx`)}>Excel (.xlsx)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportChartCSV(vizData, config.xKey, config.yKeys, `${filenameBase}.csv`)}>CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportChartJSON(vizData, config.xKey, config.yKeys, `${filenameBase}.json`)}>JSON</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportChartSQL(vizData, config.xKey, config.yKeys, `${filenameBase}`, `${filenameBase}.sql`)}>SQL</DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              const email = window.prompt('Send CSV to email:');
              if (!email) return;
              const csv = buildCSV(vizData, config.xKey, config.yKeys);
              const pre = csv.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              await sendChartEmail({
                recipients: [email],
                subject: `${config.title || title} – CSV export`,
                html: `<h2>${config.title || title}</h2><p>CSV export is included below.</p><pre style=\"white-space:pre-wrap;font-family:ui-monospace,Menlo,Monaco,Consolas,\'Liberation Mono\',\'Courier New\',monospace;font-size:12px;line-height:1.4;\">${pre}</pre>`,
                text: `${config.title || title} - CSV export\n\n${csv}`,
              });
            }}>Email CSV…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartRef}>
          <ChartContainer config={chartConfig} className="w-full" style={heightStyle}>
            {renderByType()}
          </ChartContainer>
        </div>
      </CardContent>
      
      <ChartShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        chartTitle={config.title || title}
        chartData={vizData}
        chartConfig={config}
      />
      
      <ReportHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
      />
    </Card>
  );
};

export default ConfigurableChart;
