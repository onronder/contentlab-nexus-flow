import { downloadExport } from "@/utils/exportUtils";

function sanitizeFilename(name: string, fallback = "export") {
  const base = (name || fallback)
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_\.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || fallback;
}

export async function exportChartPNG(node: HTMLElement, filename = "chart.png") {
  try {
    const { toPng } = await import("html-to-image");
    const bg = getComputedStyle(node).backgroundColor || "#ffffff";
    const pixelRatio = Math.max(1, Math.min(3, (window as any).devicePixelRatio || 2));
    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio,
      backgroundColor: bg,
      filter: (el) => !(el as HTMLElement).getAttribute || (el as HTMLElement).getAttribute("data-no-export") !== "true",
    });
    const link = document.createElement("a");
    link.download = sanitizeFilename(filename);
    link.href = dataUrl;
    link.click();
  } catch {
    // Swallow errors silently; caller may toast
  }
}

function csvEscape(value: any) {
  const s = value === null || value === undefined ? "" : String(value);
  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function buildCSV(data: any[], xKey: string, yKeys: string[]) {
  const headers = [xKey, ...yKeys];
  const headerLine = headers.map(csvEscape).join(",");
  const lines = data.map((row) => headers.map((h) => csvEscape((row as any)[h])).join(","));
  return [headerLine, ...lines].join("\r\n");
}

export function exportChartCSV(data: any[], xKey: string, yKeys: string[], filename = "chart.csv") {
  const csv = "\ufeff" + buildCSV(data, xKey, yKeys);
  downloadExport(csv, sanitizeFilename(filename), "text/csv;charset=utf-8;");
}

export function exportChartJSON(data: any[], xKey: string, yKeys: string[], filename = "chart.json") {
  const filtered = data.map((row) => {
    const out: Record<string, any> = {};
    out[xKey] = (row as any)[xKey];
    for (const k of yKeys) out[k] = (row as any)[k];
    return out;
  });
  const json = JSON.stringify(filtered, null, 2);
  downloadExport(json, sanitizeFilename(filename), "application/json");
}
