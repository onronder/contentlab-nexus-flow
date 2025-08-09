import { toPng } from "html-to-image";
import { downloadExport } from "@/utils/exportUtils";

export function exportChartPNG(node: HTMLElement, filename = "chart.png") {
  return toPng(node, { cacheBust: true, pixelRatio: 2 })
    .then((dataUrl) => {
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
    })
    .catch(() => {
      // Swallow errors silently; caller may toast
    });
}

export function buildCSV(data: any[], xKey: string, yKeys: string[]) {
  const headers = [xKey, ...yKeys];
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")));
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  return csv;
}

export function exportChartCSV(data: any[], xKey: string, yKeys: string[], filename = "chart.csv") {
  const csv = buildCSV(data, xKey, yKeys);
  downloadExport(csv, filename, "text/csv;charset=utf-8;");
}

export function exportChartJSON(data: any[], xKey: string, yKeys: string[], filename = "chart.json") {
  const filtered = data.map((row) => {
    const out: Record<string, any> = {};
    out[xKey] = row[xKey];
    for (const k of yKeys) out[k] = row[k];
    return out;
  });
  const json = JSON.stringify(filtered, null, 2);
  downloadExport(json, filename, "application/json");
}
