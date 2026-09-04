const {NAME} = require("./settings");
class Timer {
  constructor({adapter, notify}) { this.adapter = adapter; this.notify = notify; this.handle = null; }
  start() { const active = this.active(); if (active?.expiresAt > Date.now()) this.schedule(active.expiresAt); else if (active) this.finish(active); }
  stop() { window.clearTimeout(this.handle); this.handle = null; }
  activate(status, minutes) {
    const previousStatus = this.adapter.current();
    if (!this.adapter.set(status)) { this.notify("StatusDurations cannot update your status in this Discord build."); return false; }
    const active = {status, previousStatus, activatedAt: Date.now(), expiresAt: Date.now() + minutes * 60000};
    BdApi.Data.save(NAME, "active", active); this.schedule(active.expiresAt); this.notify(`${label(status)} for ${format(minutes)}.`); return true;
  }
  active() {
    const active = BdApi.Data.load(NAME, "active");
    if (!active) return null;
    // Discord's local settings store can take a moment to reflect the status
    // we just set. After that small grace period, a mismatch is a manual
    // status change and should cancel the timer rather than leaving stale UI.
    if (shouldCancelForStatusChange(active, this.adapter.current(), Date.now())) {
      this.stop();
      BdApi.Data.delete?.(NAME, "active");
      return null;
    }
    return active;
  }
  schedule(expiresAt) { this.stop(); this.handle = window.setTimeout(() => this.finish(), Math.max(0, expiresAt - Date.now())); }
  finish(saved = this.active()) { this.stop(); BdApi.Data.delete?.(NAME, "active"); if (saved?.previousStatus && this.adapter.current() === saved.status) this.adapter.set(saved.previousStatus); }
}
function format(minutes) { if (minutes < 60) return `${minutes} minutes`; if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`; if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`; return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
function shouldCancelForStatusChange(active, currentStatus, now) {
  return Boolean(active?.status && currentStatus && active.status !== currentStatus && now - Number(active.activatedAt || 0) > 2_000);
}
function label(status) { return {idle:"Idle",dnd:"Do Not Disturb",invisible:"Invisible"}[status] || status; }
module.exports = {Timer, format, shouldCancelForStatusChange};
