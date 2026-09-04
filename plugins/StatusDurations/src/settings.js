const NAME = "StatusDurations";
const DEFAULTS = [15, 60, 480, 1440, 4320];
function normalize(value) {
  const values = Array.isArray(value?.durations) ? value.durations : DEFAULTS;
  const durations = [...new Set(values.map((item) => Math.round(Number(item))).filter((item) => Number.isFinite(item) && item > 0 && item <= 4320))].sort((a, b) => a - b).slice(0, 5);
  return {durations: durations.length === 5 ? durations : DEFAULTS};
}
class Settings {
  constructor(onChange) { this.onChange = onChange; this.values = normalize(BdApi.Data.load(NAME, "settings")); }
  get durations() { return this.values.durations; }
  setDurations(value) { this.values = normalize({durations: value}); BdApi.Data.save(NAME, "settings", this.values); this.onChange?.(); }
}
function parseDurations(text) { return String(text).split(/[\s,]+/).filter(Boolean).map(Number); }
module.exports = {NAME, DEFAULTS, Settings, normalize, parseDurations};
