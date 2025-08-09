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

// Legacy buildCSV/exportChartCSV moved below with options support

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

// Extended CSV builder with options
export type CsvOptions = {
  delimiter?: string; // default ","
  includeHeaders?: boolean; // default true
};

export function buildCSV(
  data: any[],
  xKey: string,
  yKeys: string[],
  options: CsvOptions = {}
) {
  const { delimiter = ",", includeHeaders = true } = options;
  const headers = [xKey, ...yKeys];
  const headerLine = headers.map(csvEscape).join(delimiter);
  const lines = data.map((row) => headers.map((h) => csvEscape((row as any)[h])).join(delimiter));
  return [includeHeaders ? headerLine : null, ...lines].filter(Boolean).join("\r\n");
}

export function exportChartCSV(
  data: any[],
  xKey: string,
  yKeys: string[],
  filename = "chart.csv",
  options: CsvOptions = {}
) {
  const csv = "\ufeff" + buildCSV(data, xKey, yKeys, options);
  downloadExport(csv, sanitizeFilename(filename), "text/csv;charset=utf-8;");
}

// Image exports: PNG (existing), JPEG, SVG
export async function exportChartJPEG(node: HTMLElement, filename = "chart.jpg") {
  try {
    const { toJpeg } = await import("html-to-image");
    const bg = getComputedStyle(node).backgroundColor || "#ffffff";
    const pixelRatio = Math.max(1, Math.min(3, (window as any).devicePixelRatio || 2));
    const dataUrl = await toJpeg(node, {
      cacheBust: true,
      pixelRatio,
      backgroundColor: bg,
      quality: 0.95,
      filter: (el) => !(el as HTMLElement).getAttribute || (el as HTMLElement).getAttribute("data-no-export") !== "true",
    });
    const link = document.createElement("a");
    link.download = sanitizeFilename(filename);
    link.href = dataUrl;
    link.click();
  } catch {}
}

export async function exportChartSVG(node: HTMLElement, filename = "chart.svg") {
  try {
    const { toSvg } = await import("html-to-image");
    const dataUrl = await toSvg(node, {
      cacheBust: true,
      filter: (el) => !(el as HTMLElement).getAttribute || (el as HTMLElement).getAttribute("data-no-export") !== "true",
    });
    // Convert data URL to raw SVG string for cleaner file
    const svgText = decodeURIComponent(dataUrl.split(",")[1]);
    downloadExport(svgText, sanitizeFilename(filename), "image/svg+xml;charset=utf-8");
  } catch {}
}

// PDF export (single or multi-node)
export type PdfOptions = {
  orientation?: "p" | "l"; // portrait | landscape
  unit?: "pt" | "mm" | "cm" | "in";
  format?: string | number[]; // e.g., 'a4'
  margin?: number; // in unit
};

async function nodeToPngDataUrl(node: HTMLElement) {
  const { toPng } = await import("html-to-image");
  const bg = getComputedStyle(node).backgroundColor || "#ffffff";
  const pixelRatio = Math.max(1, Math.min(3, (window as any).devicePixelRatio || 2));
  return toPng(node, {
    cacheBust: true,
    pixelRatio,
    backgroundColor: bg,
    filter: (el) => !(el as HTMLElement).getAttribute || (el as HTMLElement).getAttribute("data-no-export") !== "true",
  });
}

export async function exportChartPDF(
  nodes: HTMLElement | HTMLElement[],
  filename = "chart.pdf",
  options: PdfOptions = {}
) {
  try {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
      orientation: options.orientation || "p",
      unit: options.unit || "pt",
      format: options.format || "a4",
      compress: true,
    });

    const margin = options.margin ?? 24;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const nodeList = Array.isArray(nodes) ? nodes : [nodes];

    for (let i = 0; i < nodeList.length; i++) {
      if (i > 0) pdf.addPage();
      const url = await nodeToPngDataUrl(nodeList[i]);
      // Compute scaled size to fit within page margins
      const img = new Image();
      await new Promise((res) => {
        img.onload = res as any;
        img.src = url;
      });
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;
      let w = img.width;
      let h = img.height;
      const scale = Math.min(maxW / w, maxH / h, 1);
      w = w * scale;
      h = h * scale;
      pdf.addImage(url, "PNG", margin, margin, w, h, undefined, "FAST");
    }

    pdf.save(sanitizeFilename(filename));
  } catch {}
}

// HTML snapshot export
export function exportChartHTML(node: HTMLElement, filename = "chart.html") {
  try {
    const bg = getComputedStyle(node).backgroundColor || "#ffffff";
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${sanitizeFilename(filename)}</title><style>body{margin:0;padding:24px;background:${bg};font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif} .container{max-width:1200px;margin:0 auto}</style></head><body><div class="container">${node.outerHTML}</div></body></html>`;
    downloadExport(html, sanitizeFilename(filename), "text/html;charset=utf-8");
  } catch {}
}

// Print-optimized export
export function exportChartPrint(node: HTMLElement) {
  try {
    const bg = getComputedStyle(node).backgroundColor || "#ffffff";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Print Chart</title><style>@media print{body{margin:0}} body{margin:0;padding:24px;background:${bg}}</style></head><body>${node.outerHTML}<script>window.onload=()=>{setTimeout(()=>window.print(),50)}</script></body></html>`);
    w.document.close();
  } catch {}
}

// Excel export (XLSX)
export async function exportChartXLSX(
  data: any[],
  xKey: string,
  yKeys: string[],
  filename = "chart.xlsx"
) {
  try {
    const XLSX = await import("xlsx");
    const rows = data.map((row) => {
      const out: Record<string, any> = {};
      out[xKey] = (row as any)[xKey];
      for (const k of yKeys) out[k] = (row as any)[k];
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sanitizeFilename(filename);
    a.click();
    URL.revokeObjectURL(url);
  } catch {}
}

// SQL export
export function exportChartSQL(
  data: any[],
  xKey: string,
  yKeys: string[],
  tableName = "chart_export",
  filename = "chart.sql"
) {
  if (!data?.length) return;
  const keys = [xKey, ...yKeys];
  // Infer simple types from first row
  const first = data[0] as any;
  const typeOf = (v: any) => (typeof v === "number" ? "NUMERIC" : typeof v === "boolean" ? "BOOLEAN" : "TEXT");
  const columnDefs = keys.map((k) => `  "${k}" ${typeOf(first[k])}`).join(",\n");
  const create = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n${columnDefs}\n);`;
  const values = data
    .map((row: any) =>
      `(${keys
        .map((k) => {
          const v = row[k];
          if (v === null || v === undefined) return "NULL";
          if (typeof v === "number") return String(v);
          if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
          return `'${String(v).replace(/'/g, "''")}'`;
        })
        .join(", ")})`
    )
    .join(",\n");
  const insert = `INSERT INTO "${tableName}" (${keys.map((k) => `"${k}"`).join(", ")}) VALUES\n${values};`;
  const sql = `${create}\n\n${insert}\n`;
  downloadExport(sql, sanitizeFilename(filename), "application/sql;charset=utf-8");
}

// Custom format export via template function
export function exportChartCustom(
  data: any[],
  xKey: string,
  yKeys: string[],
  template: (rows: Record<string, any>[]) => string,
  filename = "chart.txt",
  mime = "text/plain;charset=utf-8"
) {
  const rows = data.map((row) => {
    const out: Record<string, any> = {};
    out[xKey] = (row as any)[xKey];
    for (const k of yKeys) out[k] = (row as any)[k];
    return out;
  });
  const content = template(rows);
  downloadExport(content, sanitizeFilename(filename), mime);
}

