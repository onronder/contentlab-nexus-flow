export type ChartPreset = {
  id: string;
  name: string;
  config: any;
};

const PRESETS_KEY = "analytics.chartPresets";

export function loadPresets(): ChartPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? (JSON.parse(raw) as ChartPreset[]) : [];
  } catch {
    return [];
  }
}

export function savePresets(presets: ChartPreset[]) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
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
