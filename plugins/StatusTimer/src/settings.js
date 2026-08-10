const PLUGIN_NAME = "StatusTimer";
const LEGACY_PLUGIN_NAME = "AwayTimer";

const DEFAULT_SETTINGS = Object.freeze({
  idlePresets: [15, 60, 480, 1440, 4320],
  dndPresets: [15, 60, 480, 1440, 4320],
  customDurationMinutes: 30,
  restoreManualTimersToOnline: true,
  showToasts: true
});

function normalizeSettings(value = {}) {
  const legacyPresets = value.manualPresets;
  return {
    idlePresets: normalizePresets(value.idlePresets || legacyPresets),
    dndPresets: normalizePresets(value.dndPresets || legacyPresets),
    customDurationMinutes: clampNumber(value.customDurationMinutes, DEFAULT_SETTINGS.customDurationMinutes, 1, 4320),
    restoreManualTimersToOnline: value.restoreManualTimersToOnline !== undefined ? Boolean(value.restoreManualTimersToOnline) : DEFAULT_SETTINGS.restoreManualTimersToOnline,
    showToasts: value.showToasts !== undefined ? Boolean(value.showToasts) : DEFAULT_SETTINGS.showToasts
  };
}

function normalizePresets(value) {
  const presets = Array.isArray(value) ? value : DEFAULT_SETTINGS.idlePresets;
  const normalized = presets
    .map((item) => Math.round(Number(item)))
    .filter((item) => Number.isFinite(item) && item > 0 && item <= 4320);

  return Array.from(new Set(normalized)).slice(0, 12);
}

function parsePresetText(value) {
  return normalizePresets(String(value).split(/[\s,]+/));
}

function parsePresetTextDetailed(value) {
  const parts = String(value).split(/[\s,]+/).filter(Boolean);
  const valid = [];
  const invalid = [];

  for (const part of parts) {
    const number = Number(part);
    const minutes = Math.round(number);
    if (!Number.isFinite(number) || minutes <= 0 || minutes > 4320) {
      invalid.push(part);
      continue;
    }
    valid.push(minutes);
  }

  return {
    presets: normalizePresets(valid),
    invalidCount: invalid.length
  };
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

class SettingsStore {
  constructor({onChange} = {}) {
    this.onChange = onChange;
    const stored = BdApi.Data.load(PLUGIN_NAME, "settings");
    const legacyStored = stored ? null : BdApi.Data.load(LEGACY_PLUGIN_NAME, "settings");
    this.values = normalizeSettings(stored || legacyStored);
    if (!stored && legacyStored) BdApi.Data.save(PLUGIN_NAME, "settings", this.values);
  }

  get all() {
    return {...this.values};
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    this.values = normalizeSettings({...this.values, [key]: value});
    BdApi.Data.save(PLUGIN_NAME, "settings", this.values);
    this.onChange?.(this.all);
  }

  getSettingsPanel() {
    return BdApi.UI.buildSettingsPanel({
      settings: [
        {
          type: "switch",
          id: "restoreManualTimersToOnline",
          name: "Manual Timers Return To Online",
          note: "When a custom Idle timer ends, set your status back to Online instead of restoring the previous status.",
          value: this.values.restoreManualTimersToOnline
        },
        {
          type: "switch",
          id: "showToasts",
          name: "Show Toasts",
          note: "Shows a small notice when StatusTimer changes your status.",
          value: this.values.showToasts
        }
      ],
      onChange: (_, id, value) => this.set(id, value)
    });
  }
}

module.exports = {
  DEFAULT_SETTINGS,
  SettingsStore,
  normalizeSettings,
  parsePresetText,
  parsePresetTextDetailed
};
