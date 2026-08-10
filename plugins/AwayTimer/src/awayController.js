const PLUGIN_NAME = "AwayTimer";
const PLUGIN_SET_IDLE_KEY = "pluginSetIdle";
const VALID_ACTIVITY_EVENTS = ["keydown", "pointerdown", "wheel"];

class AwayController {
  constructor({settings, statusAdapter, notify, logger}) {
    this.settings = settings;
    this.statusAdapter = statusAdapter;
    this.notify = notify;
    this.logger = logger;
    this.awayTimer = null;
    this.restoreTimer = null;
    this.lastActivityAt = Date.now();
    this.handleActivity = this.handleActivity.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
  }

  start() {
    for (const eventName of VALID_ACTIVITY_EVENTS) {
      window.addEventListener(eventName, this.handleActivity, {passive: true});
    }
    window.addEventListener("blur", this.handleBlur);
    window.addEventListener("focus", this.handleFocus);
    this.scheduleAway();
  }

  stop() {
    for (const eventName of VALID_ACTIVITY_EVENTS) {
      window.removeEventListener(eventName, this.handleActivity);
    }
    window.removeEventListener("blur", this.handleBlur);
    window.removeEventListener("focus", this.handleFocus);
    this.clearTimers();
  }

  refreshSchedule() {
    this.clearTimers();
    this.scheduleAway();
  }

  handleActivity() {
    this.lastActivityAt = Date.now();
    this.cancelAwayTimer();
    this.scheduleRestoreIfNeeded();
    this.scheduleAway();
  }

  handleBlur() {
    this.lastActivityAt = Date.now();
    this.cancelRestoreTimer();
    this.cancelAwayTimer();
    this.scheduleAway();
  }

  handleFocus() {
    this.handleActivity();
  }

  scheduleAway() {
    if (!this.settings.get("enableAutoAway")) return;
    const delay = this.awayDelayMs();
    this.awayTimer = window.setTimeout(() => this.goAwayIfAllowed(), delay);
  }

  goAwayIfAllowed() {
    this.awayTimer = null;
    const currentStatus = this.statusAdapter.currentStatus();

    if (!this.statusAdapter.canUpdateStatus()) {
      this.logger("AwayTimer cannot update status with this Discord build.", "warn");
      return;
    }
    if (this.settings.get("skipVoice") && this.statusAdapter.inVoiceChannel()) {
      this.logger("Skipped away status because you are in voice.");
      this.scheduleAway();
      return;
    }
    if (this.settings.get("onlyWhenOnline") && currentStatus !== "online") {
      this.logger(`Skipped away status because current status is ${currentStatus}.`);
      this.scheduleAway();
      return;
    }
    if (currentStatus === "idle") {
      this.logger("Already idle; leaving status unchanged.");
      return;
    }

    if (this.statusAdapter.updateStatus("idle")) {
      BdApi.Data.save(PLUGIN_NAME, PLUGIN_SET_IDLE_KEY, true);
      this.notify("AwayTimer set your status to Idle.");
    }
  }

  scheduleRestoreIfNeeded() {
    if (BdApi.Data.load(PLUGIN_NAME, PLUGIN_SET_IDLE_KEY) !== true) return;
    if (this.statusAdapter.currentStatus() !== "idle") {
      BdApi.Data.save(PLUGIN_NAME, PLUGIN_SET_IDLE_KEY, false);
      return;
    }

    this.cancelRestoreTimer();
    this.restoreTimer = window.setTimeout(() => this.restoreOnlineIfAllowed(), this.settings.get("restoreDelaySeconds") * 1000);
  }

  restoreOnlineIfAllowed() {
    this.restoreTimer = null;
    if (BdApi.Data.load(PLUGIN_NAME, PLUGIN_SET_IDLE_KEY) !== true) return;
    if (this.statusAdapter.currentStatus() !== "idle") {
      BdApi.Data.save(PLUGIN_NAME, PLUGIN_SET_IDLE_KEY, false);
      return;
    }

    if (this.statusAdapter.updateStatus("online")) {
      BdApi.Data.save(PLUGIN_NAME, PLUGIN_SET_IDLE_KEY, false);
      this.notify("AwayTimer restored your status to Online.");
    }
  }

  awayDelayMs() {
    const unit = this.settings.get("debugFastMode") ? 1000 : 60 * 1000;
    return this.settings.get("awayMinutes") * unit;
  }

  clearTimers() {
    this.cancelAwayTimer();
    this.cancelRestoreTimer();
  }

  cancelAwayTimer() {
    if (!this.awayTimer) return;
    window.clearTimeout(this.awayTimer);
    this.awayTimer = null;
  }

  cancelRestoreTimer() {
    if (!this.restoreTimer) return;
    window.clearTimeout(this.restoreTimer);
    this.restoreTimer = null;
  }
}

module.exports = {
  AwayController
};
