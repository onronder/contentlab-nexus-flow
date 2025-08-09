export type ChartPreset = {
  id: string;
  name: string;
  config: any;
};

const PRESETS_KEY = "analytics.chartPresets";
const PRESETS_VERSION = 1;
const PRESETS_MAX = 50;

export function loadPresets(): ChartPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ChartPreset[]; // backward compat
    if (parsed && Array.isArray(parsed.items)) return parsed.items as ChartPreset[];
    return [];
  } catch {
    return [];
  }
}

export function savePresets(presets: ChartPreset[]) {
  try {
    const items = presets.slice(-PRESETS_MAX);
    localStorage.setItem(PRESETS_KEY, JSON.stringify({ version: PRESETS_VERSION, items }));
  } catch {}
}

export function upsertPreset(preset: ChartPreset) {
  const list = loadPresets();
  const idx = list.findIndex((p) => p.id === preset.id);
  if (idx >= 0) list[idx] = preset; else list.push(preset);
  savePresets(list);
}

export function deletePreset(id: string) {
  const list = loadPresets().filter((p) => p.id !== id);
  savePresets(list);
}

export function generatePresetId() {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2);
}
