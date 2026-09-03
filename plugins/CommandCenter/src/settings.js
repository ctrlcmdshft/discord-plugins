const PLUGIN_NAME = "CommandCenter";

const DEFAULTS = {
  showNavigation: true,
  showClipboard: true,
  showServers: true,
  showChannels: true,
  showDirectMessages: true,
  showDevelopment: false,
  resultLimit: 12
};

class SettingsStore {
  constructor({onChange = () => {}} = {}) {
    this.onChange = onChange;
    this.values = normalizeSettings(BdApi.Data.load(PLUGIN_NAME, "settings"));
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    this.values = normalizeSettings({...this.values, [key]: value});
    BdApi.Data.save(PLUGIN_NAME, "settings", this.values);
    this.onChange(this.values);
  }
}

function normalizeSettings(raw) {
  const values = raw && typeof raw === "object" ? raw : {};
  return {
    ...DEFAULTS,
    ...Object.fromEntries(
      Object.keys(DEFAULTS)
        .filter((key) => key !== "resultLimit" && typeof values[key] === "boolean")
        .map((key) => [key, values[key]])
    ),
    resultLimit: clampResultLimit(values.resultLimit)
  };
}

function clampResultLimit(value) {
  const numeric = Math.round(Number(value));
  return Number.isFinite(numeric) ? Math.min(Math.max(numeric, 5), 30) : DEFAULTS.resultLimit;
}

module.exports = {SettingsStore, DEFAULTS, normalizeSettings};
