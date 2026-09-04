const {NAME} = require("./settings");
class Timer {
  constructor({adapter, notify, data, clock = window}) { this.adapter = adapter; this.notify = notify; this.data = data || unboundData(); this.clock = clock; this.handle = null; }
  start() { const active = this.active(); if (active?.expiresAt > Date.now()) this.schedule(active.expiresAt); else if (active) this.finish(active); }
  stop() { this.clock.clearTimeout(this.handle); this.handle = null; }
  activate(status, minutes) {
    const previousStatus = this.adapter.current();
    if (!this.adapter.set(status)) { this.notify("StatusDurations cannot update your status in this Discord build."); return false; }
    const active = {status, previousStatus, activatedAt: Date.now(), expiresAt: Date.now() + minutes * 60000};
    this.data.save("active", active); this.schedule(active.expiresAt); this.notify(`${label(status)} for ${format(minutes)}.`); return true;
  }
  active() {
    const active = this.data.load("active");
    if (!active) return null;
    // Discord's local settings store can take a moment to reflect the status
    // we just set. After that small grace period, a mismatch is a manual
    // status change and should cancel the timer rather than leaving stale UI.
    if (shouldCancelForStatusChange(active, this.adapter.current(), Date.now())) {
      this.stop();
      this.data.delete?.("active");
      return null;
    }
    return active;
  }
  schedule(expiresAt) { this.stop(); this.handle = this.clock.setTimeout(() => this.finish(), Math.max(0, expiresAt - Date.now())); }
  finish(saved = this.active()) { this.stop(); this.data.delete?.("active"); if (saved?.previousStatus && this.adapter.current() === saved.status) this.adapter.set(saved.previousStatus); }
}
function unboundData() { return {load:(key)=>BdApi.Data.load(NAME,key),save:(key,value)=>BdApi.Data.save(NAME,key,value),delete:(key)=>BdApi.Data.delete?.(NAME,key)}; }
function format(minutes) { if (minutes < 60) return `${minutes} minutes`; if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`; if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`; return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
function shouldCancelForStatusChange(active, currentStatus, now) {
  return Boolean(active?.status && currentStatus && active.status !== currentStatus && now - Number(active.activatedAt || 0) > 2_000);
}
function label(status) { return {idle:"Idle",dnd:"Do Not Disturb",invisible:"Invisible"}[status] || status; }
module.exports = {Timer, format, shouldCancelForStatusChange};
