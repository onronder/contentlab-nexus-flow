import { Parser } from "expr-eval";

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
