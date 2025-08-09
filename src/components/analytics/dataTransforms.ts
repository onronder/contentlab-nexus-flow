import { Parser } from "expr-eval";
import { startOfDay, startOfWeek, startOfMonth, format } from "date-fns";

export type Normalization = "none" | "minmax" | "zscore";

export function applyNormalization<T extends Record<string, any>>(data: T[], keys: string[], method: Normalization): T[] {
  if (!data?.length || method === "none" || !keys.length) return data;
  const result = data.map((d) => ({ ...d }));
  for (const key of keys) {
    const values = data.map((d) => Number((d as any)[key] ?? 0));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    const std = Math.sqrt(values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length || 1)) || 1;
    (result as any[]).forEach((row, i) => {
      const v = values[i];
      if (method === "minmax") {
        row[key] = max === min ? 0 : (v - min) / (max - min);
      } else if (method === "zscore") {
        row[key] = (v - mean) / std;
      }
    });
  }
  return result as T[];
}

export function computeFormula<T extends Record<string, any>>(data: T[], formula?: { name: string; expression: string } | null): { data: T[]; addedKey?: string } {
  if (!data?.length || !formula?.name || !formula.expression) return { data };
  const parser = new Parser();
  let expr;
  try {
    expr = parser.parse(formula.expression);
  } catch (e) {
    return { data };
  }
  const outKey = formula.name;
  const result = data.map((row) => {
    const scope = { ...row } as Record<string, number>;
    let value = 0;
    try {
      value = Number(expr.evaluate(scope)) || 0;
    } catch {
      value = 0;
    }
    return { ...row, [outKey]: value } as T;
  });
  return { data: result, addedKey: outKey };
}

export function rSquared(points: Array<{ x: number; y: number }>, m: number, b: number) {
  const yMean = points.reduce((a, p) => a + p.y, 0) / (points.length || 1);
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const yPred = m * p.x + b;
    ssTot += Math.pow(p.y - yMean, 2);
    ssRes += Math.pow(p.y - yPred, 2);
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return Number.isFinite(r2) ? r2 : 0;
}

export type TimeBucket = "none" | "day" | "week" | "month";

export function bucketByTime<T extends Record<string, any>>(data: T[], xKey: string, yKeys: string[], mode: TimeBucket): T[] {
  if (!data?.length || mode === "none") return data;
  const parseDate = (v: any): Date | null => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };
  // If xKey cannot be parsed as dates, return original
  const parsed = data.map((row) => parseDate((row as any)[xKey]));
  if (parsed.some((d) => d === null)) return data;

  const normalize = (d: Date) => {
    if (mode === "day") return startOfDay(d);
    if (mode === "week") return startOfWeek(d, { weekStartsOn: 1 });
    return startOfMonth(d);
  };

  const map = new Map<string, any>();
  data.forEach((row, i) => {
    const d = normalize(parsed[i]!);
    const key = format(d, mode === "month" ? "yyyy-MM" : mode === "week" ? "yyyy-ww" : "yyyy-MM-dd");
    if (!map.has(key)) {
      const base: any = { [xKey]: key };
      for (const y of yKeys) base[y] = 0;
      base.__count = 0;
      map.set(key, base);
    }
    const acc = map.get(key)!;
    for (const y of yKeys) acc[y] += Number((row as any)[y] ?? 0);
    acc.__count += 1;
  });
  // average values within bucket
  const out = Array.from(map.values()).map((row: any) => {
    for (const y of yKeys) row[y] = row.__count ? row[y] / row.__count : row[y];
    delete row.__count;
    return row as T;
  });
  return out;
}

export function movingAverage<T extends Record<string, any>>(data: T[], yKeys: string[], windowSize?: number): T[] {
  if (!data?.length || !windowSize || windowSize <= 1) return data;
  const half = Math.floor(windowSize / 2);
  const out = data.map((row) => ({ ...row }));
  for (const key of yKeys) {
    for (let i = 0; i < data.length; i++) {
      let sum = 0, count = 0;
      for (let j = i - half; j <= i + half; j++) {
        if (j >= 0 && j < data.length) { sum += Number((data[j] as any)[key] ?? 0); count++; }
      }
      (out[i] as any)[key] = count ? sum / count : (data[i] as any)[key];
    }
  }
  return out as T[];
}

