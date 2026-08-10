const PLUGIN_NAME = "AwayTimer";

const DEFAULT_SETTINGS = Object.freeze({
  enableAutoAway: false,
  awayMinutes: 15,
  restoreDelaySeconds: 5,
  manualPresets: [20, 45, 90, 150, 360],
  customDurationMinutes: 30,
  restoreManualTimersToOnline: true,
  showQuickButton: false,
  skipVoice: true,
  onlyWhenOnline: true,
  showToasts: true,
  debugFastMode: false
});

function normalizeSettings(value = {}) {
  return {
    enableAutoAway: value.enableAutoAway !== undefined ? Boolean(value.enableAutoAway) : DEFAULT_SETTINGS.enableAutoAway,
    awayMinutes: clampNumber(value.awayMinutes, DEFAULT_SETTINGS.awayMinutes, 1, 240),
    restoreDelaySeconds: clampNumber(value.restoreDelaySeconds, DEFAULT_SETTINGS.restoreDelaySeconds, 0, 120),
    manualPresets: normalizePresets(value.manualPresets),
    customDurationMinutes: clampNumber(value.customDurationMinutes, DEFAULT_SETTINGS.customDurationMinutes, 1, 1440),
    restoreManualTimersToOnline: value.restoreManualTimersToOnline !== undefined ? Boolean(value.restoreManualTimersToOnline) : DEFAULT_SETTINGS.restoreManualTimersToOnline,
    showQuickButton: value.showQuickButton !== undefined ? Boolean(value.showQuickButton) : DEFAULT_SETTINGS.showQuickButton,
    skipVoice: value.skipVoice !== undefined ? Boolean(value.skipVoice) : DEFAULT_SETTINGS.skipVoice,
    onlyWhenOnline: value.onlyWhenOnline !== undefined ? Boolean(value.onlyWhenOnline) : DEFAULT_SETTINGS.onlyWhenOnline,
    showToasts: value.showToasts !== undefined ? Boolean(value.showToasts) : DEFAULT_SETTINGS.showToasts,
    debugFastMode: value.debugFastMode !== undefined ? Boolean(value.debugFastMode) : DEFAULT_SETTINGS.debugFastMode
  };
}

function normalizePresets(value) {
  const presets = Array.isArray(value) ? value : DEFAULT_SETTINGS.manualPresets;
  const normalized = presets
    .map((item) => Math.round(Number(item)))
    .filter((item) => Number.isFinite(item) && item > 0 && item <= 1440);

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
          id: "enableAutoAway",
          name: "Enable Auto-Away",
          note: "Automatically set Idle after no Discord activity. Leave this off if you only want manual custom timers.",
          value: this.values.enableAutoAway
        },
        {
          type: "slider",
          id: "awayMinutes",
          name: "Show Away After",
          note: "Minutes of no Discord activity before changing your status to Idle.",
          value: this.values.awayMinutes,
          min: 1,
          max: 240,
          units: "min",
          markers: [1, 5, 10, 15, 30, 60, 120, 240]
        },
        {
          type: "slider",
          id: "restoreDelaySeconds",
          name: "Return Online Delay",
          note: "Seconds to wait after Discord activity before returning to Online.",
          value: this.values.restoreDelaySeconds,
          min: 0,
          max: 120,
          units: "s",
          markers: [0, 5, 10, 30, 60, 120]
        },
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
          id: "skipVoice",
          name: "Do Not Change Status While In Voice",
          note: "Keeps your current status untouched when you are connected to a voice channel.",
          value: this.values.skipVoice
        },
        {
          type: "switch",
          id: "onlyWhenOnline",
          name: "Only Change From Online",
          note: "Prevents overriding Do Not Disturb, Invisible, or a manual Idle status.",
          value: this.values.onlyWhenOnline
        },
        {
          type: "switch",
          id: "showToasts",
          name: "Show Toasts",
          note: "Shows a small notice when AwayTimer changes your status.",
          value: this.values.showToasts
        },
        {
          type: "switch",
          id: "debugFastMode",
          name: "Test Mode",
          note: "Uses seconds instead of minutes for the away timer.",
          value: this.values.debugFastMode
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
