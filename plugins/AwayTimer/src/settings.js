const PLUGIN_NAME = "AwayTimer";

const DEFAULT_SETTINGS = Object.freeze({
  manualPresets: [15, 60, 480, 1440, 4320],
  customDurationMinutes: 30,
  restoreManualTimersToOnline: true,
  showQuickButton: false,
  showToasts: true
});

function normalizeSettings(value = {}) {
  return {
    manualPresets: normalizePresets(value.manualPresets),
    customDurationMinutes: clampNumber(value.customDurationMinutes, DEFAULT_SETTINGS.customDurationMinutes, 1, 4320),
    restoreManualTimersToOnline: value.restoreManualTimersToOnline !== undefined ? Boolean(value.restoreManualTimersToOnline) : DEFAULT_SETTINGS.restoreManualTimersToOnline,
    showQuickButton: value.showQuickButton !== undefined ? Boolean(value.showQuickButton) : DEFAULT_SETTINGS.showQuickButton,
    showToasts: value.showToasts !== undefined ? Boolean(value.showToasts) : DEFAULT_SETTINGS.showToasts
  };
}

function normalizePresets(value) {
  const presets = Array.isArray(value) ? value : DEFAULT_SETTINGS.manualPresets;
  const normalized = presets
    .map((item) => Math.round(Number(item)))
    .filter((item) => Number.isFinite(item) && item > 0 && item <= 4320);

  return Array.from(new Set(normalized)).slice(0, 12);
}

function parsePresetText(value) {
  return normalizePresets(String(value).split(/[\s,]+/));
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

class SettingsStore {
  constructor({onChange} = {}) {
    this.onChange = onChange;
    this.values = normalizeSettings(BdApi.Data.load(PLUGIN_NAME, "settings"));
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
          id: "showQuickButton",
          name: "Show Floating Quick Button",
          note: "Shows the old Away button near the lower-left user panel as a fallback.",
          value: this.values.showQuickButton
        },
        {
          type: "switch",
          id: "showToasts",
          name: "Show Toasts",
          note: "Shows a small notice when AwayTimer changes your status.",
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
  parsePresetText
};
