const PLUGIN_NAME = "AwayTimer";
const ACTIVE_TIMER_KEY = "activeManualTimer";

class ManualStatusTimer {
  constructor({settings, statusAdapter, notify, logger}) {
    this.settings = settings;
    this.statusAdapter = statusAdapter;
    this.notify = notify;
    this.logger = logger;
    this.timer = null;
  }

  start() {
    this.resumeActiveTimer();
  }

  stop() {
    this.clearTimer();
  }

  setIdleForMinutes(minutes) {
    const durationMinutes = clampMinutes(minutes);
    const previousStatus = this.statusAdapter.currentStatus();
    const expiresAt = Date.now() + durationMinutes * 60 * 1000;

    if (!this.statusAdapter.canUpdateStatus()) {
      this.notify("AwayTimer cannot change status in this Discord build.");
      return false;
    }

    if (!this.statusAdapter.updateStatus("idle")) return false;
    BdApi.Data.save(PLUGIN_NAME, ACTIVE_TIMER_KEY, {
      expiresAt,
      previousStatus: previousStatus === "unknown" ? "online" : previousStatus,
      restoreStatus: this.settings.get("restoreManualTimersToOnline") ? "online" : previousStatus
    });
    this.scheduleRestore(expiresAt);
    this.notify(`Idle for ${formatMinutes(durationMinutes)}.`);
    return true;
  }

  setIdleUntil(timeValue) {
    const expiresAt = nextTimeTodayOrTomorrow(timeValue);
    if (!expiresAt) {
      this.notify("Enter a valid time first.");
      return false;
    }

    const minutes = Math.max(1, Math.round((expiresAt - Date.now()) / 60000));
    return this.setIdleForMinutes(minutes);
  }

  setIdleForever() {
    if (!this.statusAdapter.canUpdateStatus()) {
      this.notify("AwayTimer cannot change status in this Discord build.");
      return false;
    }

    this.clearTimer();
    BdApi.Data.delete?.(PLUGIN_NAME, ACTIVE_TIMER_KEY);
    if (!this.statusAdapter.updateStatus("idle")) return false;
    this.notify("Idle forever.");
    return true;
  }

  cancel({restore = false} = {}) {
    const active = BdApi.Data.load(PLUGIN_NAME, ACTIVE_TIMER_KEY);
    this.clearTimer();
    BdApi.Data.delete?.(PLUGIN_NAME, ACTIVE_TIMER_KEY);
    if (restore && active?.previousStatus && this.statusAdapter.currentStatus() === "idle") {
      this.statusAdapter.updateStatus(active.previousStatus);
    }
    this.notify("AwayTimer manual timer cancelled.");
  }

  getActiveTimer() {
    const active = BdApi.Data.load(PLUGIN_NAME, ACTIVE_TIMER_KEY);
    if (!active?.expiresAt) return null;
    if (active.expiresAt <= Date.now()) return null;

    return {
      ...active,
      remainingMs: active.expiresAt - Date.now()
    };
  }

  resumeActiveTimer() {
    const active = BdApi.Data.load(PLUGIN_NAME, ACTIVE_TIMER_KEY);
    if (!active?.expiresAt) return;

    if (active.expiresAt <= Date.now()) {
      this.restoreFromTimer(active);
      return;
    }
    this.scheduleRestore(active.expiresAt);
  }

  scheduleRestore(expiresAt) {
    this.clearTimer();
    this.timer = window.setTimeout(() => this.restoreFromTimer(), Math.max(0, expiresAt - Date.now()));
  }

  restoreFromTimer(timerData = BdApi.Data.load(PLUGIN_NAME, ACTIVE_TIMER_KEY)) {
    this.clearTimer();
    BdApi.Data.delete?.(PLUGIN_NAME, ACTIVE_TIMER_KEY);
    const restoreStatus = timerData?.restoreStatus || timerData?.previousStatus;
    if (!restoreStatus || this.statusAdapter.currentStatus() !== "idle") return;

    if (this.statusAdapter.updateStatus(restoreStatus)) {
      this.notify(`AwayTimer restored ${humanStatus(restoreStatus)}.`);
    }
  }

  clearTimer() {
    if (!this.timer) return;
    window.clearTimeout(this.timer);
    this.timer = null;
  }
}

function clampMinutes(minutes) {
  const value = Math.round(Number(minutes));
  if (!Number.isFinite(value)) return 30;
  return Math.min(Math.max(value, 1), 4320);
}

function nextTimeTodayOrTomorrow(timeValue) {
  const match = String(timeValue || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
  return target.getTime();
}

function formatMinutes(minutes) {
  const totalMinutes = Number(minutes);
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  if (totalMinutes % 1440 === 0) {
    const days = totalMinutes / 1440;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remainder = totalMinutes % 60;
  if (!remainder) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours}h ${remainder}m`;
}

function formatClockTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function humanStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

module.exports = {
  ManualStatusTimer,
  formatClockTime,
  formatMinutes,
  nextTimeTodayOrTomorrow
};
