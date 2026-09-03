const {PLUGIN_NAME} = require("./settings");
const ACTIVE_KEY = "activeProfile";

class ProfileController {
  constructor({settings, statusAdapter, visibility, notifications, notify}) {
    Object.assign(this, {settings, statusAdapter, visibility, notifications, notify});
    this.timeout = null;
  }
  start() {
    this.refreshSchedules();
    const active = BdApi.Data.load(PLUGIN_NAME, ACTIVE_KEY);
    if (!active) return;
    if (active.expiresAt && active.expiresAt <= Date.now()) return this.clear({restoreStatus: true, silent: true});
    this.applyState(active);
    if (active.expiresAt) this.schedule(active.expiresAt);
  }
  stop() { window.clearTimeout(this.timeout); this.timeout = null; for (const timer of this.scheduleTimers?.values?.() || []) window.clearTimeout(timer); this.scheduleTimers?.clear?.(); this.visibility.setHidden([]); }
  refreshSchedules() {
    if (!this.scheduleTimers) this.scheduleTimers = new Map();
    for (const timer of this.scheduleTimers.values()) window.clearTimeout(timer);
    this.scheduleTimers.clear();
    for (const profile of this.settings.get("profiles")) if (profile.enableMode === "scheduled") this.scheduleStart(profile);
  }
  getActive() { return BdApi.Data.load(PLUGIN_NAME, ACTIVE_KEY) || null; }
  activate(profileId) {
    const profile = this.settings.get("profiles").find((item) => item.id === profileId);
    if (!profile) return false;
    const previous = this.getActive();
    if (previous) this.undoMuted(previous);
    const state = {
      profileId: profile.id,
      previousStatus: this.statusAdapter.currentStatus(),
      previousCustomStatus: null,
      status: profile.status,
      customStatus: profile.status === "dnd" && profile.dndText ? {text: profile.dndText} : null,
      mutedGuildIds: profile.mutedGuildIds,
      hiddenGuildIds: profile.hiddenGuildIds,
      previousMuteStates: {},
      expiresAt: earliestTime(profile.durationMinutes ? Date.now() + profile.durationMinutes * 60000 : null, profile.disableMode === "scheduled" ? nextOccurrence(profile.disableTime) : null)
    };
    for (const guildId of state.mutedGuildIds) {
      const muted = this.notifications.getMuted(guildId);
      if (muted === false) state.previousMuteStates[guildId] = false;
    }
    if (state.customStatus) state.previousCustomStatus = this.statusAdapter.currentCustomStatus();
    this.applyState(state);
    BdApi.Data.save(PLUGIN_NAME, ACTIVE_KEY, state);
    if (state.expiresAt) this.schedule(state.expiresAt);
    this.notify(`${profile.name} focus profile enabled${state.expiresAt ? ` for ${formatMinutes(profile.durationMinutes)}` : ""}.`);
    return true;
  }
  clear({restoreStatus = true, silent = false} = {}) {
    const active = this.getActive();
    window.clearTimeout(this.timeout); this.timeout = null;
    this.visibility.setHidden([]);
    if (!active) return;
    this.undoMuted(active);
    if (restoreStatus && active.previousStatus && this.statusAdapter.currentStatus() === active.status) this.statusAdapter.updateStatus(active.previousStatus, active.previousCustomStatus || {text: "", emojiId: 0, emojiName: "", expiresAtMs: 0, createdAtMs: 0});
    BdApi.Data.delete?.(PLUGIN_NAME, ACTIVE_KEY);
    if (!silent) this.notify("Focus profile cleared.");
  }
  applyState(state) {
    this.visibility.setHidden(state.hiddenGuildIds || []);
    for (const channelId of Object.keys(state.previousMuteStates || {})) this.notifications.setMuted(channelId, true);
    if (state.status) this.statusAdapter.updateStatus(state.status, state.customStatus || undefined);
  }
  undoMuted(state) { for (const channelId of Object.keys(state.previousMuteStates || {})) this.notifications.setMuted(channelId, false); }
  schedule(expiresAt) {
    window.clearTimeout(this.timeout);
    this.timeout = window.setTimeout(() => this.clear({restoreStatus: true, silent: false}), Math.max(0, expiresAt - Date.now()));
  }
  scheduleStart(profile) {
    const runAt = nextOccurrence(profile.enableTime);
    const timer = window.setTimeout(() => {
      this.activate(profile.id);
      const current = this.settings.get("profiles").find((item) => item.id === profile.id);
      if (current?.enableMode === "scheduled") this.scheduleStart(current);
    }, Math.max(0, runAt - Date.now()));
    this.scheduleTimers.set(profile.id, timer);
  }
}

function formatMinutes(minutes) { return minutes < 60 ? `${minutes} min` : minutes % 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes / 60} hour${minutes === 60 ? "" : "s"}`; }
function nextOccurrence(timeValue, now = new Date()) {
  const [hours, minutes] = String(timeValue).split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  const target = new Date(now); target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime();
}
function earliestTime(...times) { const valid = times.filter((time) => Number.isFinite(time)); return valid.length ? Math.min(...valid) : null; }
module.exports = {ProfileController, formatMinutes, nextOccurrence, earliestTime};
