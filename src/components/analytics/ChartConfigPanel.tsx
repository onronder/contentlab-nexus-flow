import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export type ChartType = "line" | "bar" | "area" | "pie" | "map";

export type Annotation = { x: string | number; label: string };

export interface ChartBuilderConfig {
  chartType: ChartType;
  palette: "default" | "cool" | "warm" | "mono" | "colorblind" | "custom";
  customColors: string[];
  height: number;
  title: string;
  xLabel: string;
  yLabel: string;
  xKey: string;
  yKeys: string[];
  rightAxisKeys?: string[];
  normalization?: "none" | "minmax" | "zscore";
  formula?: { name: string; expression: string } | null;
  showBrush: boolean;
  showLegend: boolean;
  showTrendline: boolean;
  ciLowerKey?: string;
  ciUpperKey?: string;
  annotations: Annotation[];
  selectionEnabled: boolean;
  playbackEnabled?: boolean;
  refreshInterval?: number;
  dataset: "performance" | "engagement" | "content";
  timeBucket?: "none" | "day" | "week" | "month";
  movingAverageWindow?: number;
}

interface ChartConfigPanelProps {
  config: ChartBuilderConfig;
  onChange: (partial: Partial<ChartBuilderConfig>) => void;
  availableXKeys: string[];
  availableYKeys: string[];
}

const PRESET_PALETTES: Record<ChartBuilderConfig["palette"], string[]> = {
  default: [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ],
  cool: [
    "hsl(217 91% 60%)",
    "hsl(197 63% 55%)",
    "hsl(180 70% 45%)",
    "hsl(200 80% 50%)",
    "hsl(220 70% 50%)",
  ],
  warm: [
    "hsl(12 76% 61%)",
    "hsl(27 87% 55%)",
    "hsl(43 74% 50%)",
    "hsl(0 84% 60%)",
    "hsl(15 75% 55%)",
  ],
  mono: [
    "hsl(var(--primary))",
    "hsl(var(--primary) / 0.85)",
    "hsl(var(--primary) / 0.7)",
    "hsl(var(--primary) / 0.55)",
    "hsl(var(--primary) / 0.4)",
  ],
  colorblind: [
    "hsl(205 100% 40%)", // blue
    "hsl(35 90% 55%)",   // orange
    "hsl(54 80% 62%)",   // yellow
    "hsl(156 59% 34%)",  // green
    "hsl(199 68% 63%)",  // sky
  ],
  custom: [],
};

export function getPaletteColors(palette: ChartBuilderConfig["palette"], customColors: string[]) {
  return palette === "custom" && customColors.length ? customColors : PRESET_PALETTES[palette];
}

export const ChartConfigPanel: React.FC<ChartConfigPanelProps> = ({ config, onChange, availableXKeys, availableYKeys }) => {
  const update = (partial: Partial<ChartBuilderConfig>) => onChange(partial);
  const NONE = "__none__";

  const handleCustomColorChange = (idx: number, value: string) => {
    const updated = [...config.customColors];
    updated[idx] = value;
    update({ customColors: updated });
  };

  const toggleYKey = (key: string) => {
    const exists = config.yKeys.includes(key);
    update({ yKeys: exists ? config.yKeys.filter(k => k !== key) : [...config.yKeys, key] });
  };

  const addAnnotation = () => {
    update({ annotations: [...config.annotations, { x: "", label: "" }] });
  };

  const updateAnnotation = (index: number, field: keyof Annotation, value: string) => {
    const next = config.annotations.map((a, i) => (i === index ? { ...a, [field]: value } : a));
    update({ annotations: next });
  };

  const removeAnnotation = (index: number) => {
    const next = config.annotations.filter((_, i) => i !== index);
    update({ annotations: next });
  };

  return (
    <Card className="interactive-lift">
      <CardHeader>
        <CardTitle>Chart Configuration</CardTitle>
        <CardDescription>Customize appearance, data and interactions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Dataset</Label>
            <Select value={config.dataset} onValueChange={(v) => update({ dataset: v as ChartBuilderConfig["dataset"] })}>
              <SelectTrigger>
                <SelectValue placeholder="Select dataset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
                <SelectItem value="content">Content</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Chart Type</Label>
            <Select value={config.chartType} onValueChange={(v) => update({ chartType: v as ChartType })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="pie">Pie</SelectItem>
                <SelectItem value="map">Map</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Palette</Label>
            <Select value={config.palette} onValueChange={(v) => update({ palette: v as ChartBuilderConfig["palette"] })}>
              <SelectTrigger>
                <SelectValue placeholder="Select palette" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="cool">Cool</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="mono">Monochrome</SelectItem>
                <SelectItem value="colorblind">Colorblind-safe</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {config.palette === "custom" && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Label>Color {i + 1}</Label>
                <Input type="color" value={config.customColors[i] || "#3b82f6"} onChange={(e) => handleCustomColorChange(i, e.target.value)} />
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={config.title} onChange={(e) => update({ title: e.target.value })} placeholder="Chart title" />
          </div>
          <div className="space-y-2">
            <Label>X Axis Label</Label>
            <Input value={config.xLabel} onChange={(e) => update({ xLabel: e.target.value })} placeholder="X label" />
          </div>
          <div className="space-y-2">
            <Label>Y Axis Label</Label>
            <Input value={config.yLabel} onChange={(e) => update({ yLabel: e.target.value })} placeholder="Y label" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>X Key</Label>
            <Select value={config.xKey} onValueChange={(v) => update({ xKey: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableXKeys.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Series (Y Keys)</Label>
            <div className="flex flex-wrap gap-3">
              {availableYKeys.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.yKeys.includes(k)}
                    onChange={() => toggleYKey(k)}
                    aria-label={`Toggle series ${k}`}
                  />
                  {k}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Normalization</Label>
            <Select value={config.normalization || "none"} onValueChange={(v) => update({ normalization: v as any })}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="minmax">Min-Max</SelectItem>
                <SelectItem value="zscore">Z-Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Right Axis Series</Label>
            <div className="flex flex-wrap gap-3">
              {config.yKeys.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!config.rightAxisKeys?.includes(k)}
                    onChange={() => {
                      const set = new Set(config.rightAxisKeys || []);
                      if (set.has(k)) set.delete(k); else set.add(k);
                      update({ rightAxisKeys: Array.from(set) });
                    }}
                    aria-label={`Toggle right axis for ${k}`}
                  />
                  {k}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>CI Lower Key</Label>
            <Select value={config.ciLowerKey ?? NONE} onValueChange={(v) => update({ ciLowerKey: v === NONE ? undefined : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select lower bound" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {availableYKeys.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>CI Upper Key</Label>
            <Select value={config.ciUpperKey ?? NONE} onValueChange={(v) => update({ ciUpperKey: v === NONE ? undefined : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select upper bound" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {availableYKeys.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Height (px)</Label>
            <Input type="number" value={config.height} onChange={(e) => update({ height: Number(e.target.value || 300) })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Computed Metric Name</Label>
            <Input value={config.formula?.name || ""} onChange={(e) => update({ formula: { ...(config.formula || { expression: "" }), name: e.target.value } })} placeholder="e.g. engagementScore" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Formula</Label>
            <Input value={config.formula?.expression || ""} onChange={(e) => update({ formula: { ...(config.formula || { name: "" }), expression: e.target.value } })} placeholder="likes + shares * 0.5" />
            <p className="text-xs text-muted-foreground">Use field names and math operators. Example: (likes + comments*0.5) / shares</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="brush">Zoom/Brush</Label>
            <Switch id="brush" checked={config.showBrush} onCheckedChange={(v) => update({ showBrush: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="legend">Legend</Label>
            <Switch id="legend" checked={config.showLegend} onCheckedChange={(v) => update({ showLegend: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="trend">Trendline</Label>
            <Switch id="trend" checked={config.showTrendline} onCheckedChange={(v) => update({ showTrendline: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="select">Selection</Label>
            <Switch id="select" checked={config.selectionEnabled} onCheckedChange={(v) => update({ selectionEnabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="playback">Playback</Label>
            <Switch id="playback" checked={!!config.playbackEnabled} onCheckedChange={(v) => update({ playbackEnabled: v })} />
          </div>
        </div>

        {/* Time bucketing and smoothing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Group by time</Label>
            <Select value={config.timeBucket || "none"} onValueChange={(v) => update({ timeBucket: v as any })}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Moving average window</Label>
            <Input type="number" min={1} value={Number(config.movingAverageWindow || 1)} onChange={(e) => update({ movingAverageWindow: Math.max(1, Number(e.target.value || 1)) })} />
            <p className="text-xs text-muted-foreground">Smooths series by averaging over N points</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Annotations</Label>
              <p className="text-xs text-muted-foreground">Add vertical markers for key events</p>
            </div>
            <Button variant="outline" size="sm" onClick={addAnnotation}>Add</Button>
          </div>
          {config.annotations.map((a, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs">X Value</Label>
                <Input value={String(a.x)} onChange={(e) => updateAnnotation(i, "x", e.target.value)} placeholder="e.g. Jan 21 or 10" />
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs">Label</Label>
                <Input value={a.label} onChange={(e) => updateAnnotation(i, "label", e.target.value)} placeholder="Milestone reached" />
              </div>
              <div className="flex items-end">
                <Button variant="ghost" onClick={() => removeAnnotation(i)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartConfigPanel;
