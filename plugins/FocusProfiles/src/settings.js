const PLUGIN_NAME = "FocusProfiles";

const DEFAULT_PROFILES = Object.freeze([
  {id: "work", name: "Work", status: "dnd", durationMinutes: 60, mutedChannelIds: [], hiddenChannelIds: []},
  {id: "gaming", name: "Gaming", status: "online", durationMinutes: 0, mutedChannelIds: [], hiddenChannelIds: []},
  {id: "away", name: "Away", status: "idle", durationMinutes: 120, mutedChannelIds: [], hiddenChannelIds: []}
]);

function normalizeChannelIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter((id) => /^\d{5,}$/.test(id)))];
}

function normalizeProfile(value, index) {
  const fallback = DEFAULT_PROFILES[index] || DEFAULT_PROFILES[0];
  const status = ["online", "idle", "dnd", "invisible"].includes(value?.status) ? value.status : fallback.status;
  const duration = Math.round(Number(value?.durationMinutes));
  return {
    id: /^[a-z0-9_-]+$/i.test(value?.id || "") ? value.id : `profile-${index + 1}`,
    name: String(value?.name || fallback.name).trim().slice(0, 32) || fallback.name,
    status,
    durationMinutes: Number.isFinite(duration) ? Math.min(Math.max(duration, 0), 4320) : fallback.durationMinutes,
    dndText: String(value?.dndText || "").slice(0, 128),
    enableMode: value?.enableMode === "scheduled" ? "scheduled" : "now",
    enableTime: normalizeTime(value?.enableTime, "09:00"),
    disableMode: value?.disableMode === "scheduled" ? "scheduled" : "manual",
    disableTime: normalizeTime(value?.disableTime, "17:00"),
    mutedGuildIds: normalizeChannelIds(value?.mutedGuildIds),
    hiddenGuildIds: normalizeChannelIds(value?.hiddenGuildIds)
  };
}

function normalizeTime(value, fallback) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || "")) ? value : fallback; }

function normalizeSettings(value = {}) {
  const profiles = Array.isArray(value.profiles) && value.profiles.length ? value.profiles : DEFAULT_PROFILES;
  return {profiles: profiles.slice(0, 8).map(normalizeProfile), showToasts: value.showToasts !== false};
}

class SettingsStore {
  constructor({onChange} = {}) {
    this.onChange = onChange;
    this.values = normalizeSettings(BdApi.Data.load(PLUGIN_NAME, "settings"));
  }
  get(key) { return this.values[key]; }
  set(key, value) {
    this.values = normalizeSettings({...this.values, [key]: value});
    BdApi.Data.save(PLUGIN_NAME, "settings", this.values);
    this.onChange?.(this.values);
  }
  updateProfile(id, changes) { this.set("profiles", this.values.profiles.map((profile) => profile.id === id ? {...profile, ...changes} : profile)); }
}

module.exports = {PLUGIN_NAME, DEFAULT_PROFILES, SettingsStore, normalizeProfile, normalizeSettings, normalizeTime};
