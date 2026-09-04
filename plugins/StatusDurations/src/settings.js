const NAME = "StatusDurations";
const DEFAULTS = [15, 60, 480, 1440, 4320];
function normalize(value) {
  const values = Array.isArray(value?.durations) ? value.durations : DEFAULTS;
  const durations = [...new Set(values.map((item) => Math.round(Number(item))).filter((item) => Number.isFinite(item) && item > 0 && item <= 4320))].sort((a, b) => a - b).slice(0, 5);
  return {durations: durations.length === 5 ? durations : DEFAULTS};
}
class Settings {
  constructor(onChange, data) { this.onChange = onChange; this.data = data || unboundData(); this.values = normalize(this.data.load("settings")); }
  get durations() { return this.values.durations; }
  setDurations(value) { this.values = normalize({durations: value}); this.data.save("settings", this.values); this.onChange?.(); }
}
function unboundData() { return {load:(key)=>BdApi.Data.load(NAME,key),save:(key,value)=>BdApi.Data.save(NAME,key,value),delete:(key)=>BdApi.Data.delete?.(NAME,key)}; }
function parseDurations(text) { return String(text).split(/[\s,]+/).filter(Boolean).map(Number); }
module.exports = {NAME, DEFAULTS, Settings, normalize, parseDurations};
