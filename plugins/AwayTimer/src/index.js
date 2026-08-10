const {ManualStatusTimer} = require("./manualStatusTimer");
const {MenuInjector} = require("./menuInjector");
const {QuickLauncher} = require("./quickLauncher");
const {SettingsStore} = require("./settings");
const {createSettingsPanel} = require("./settingsPanel");
const {StatusAdapter} = require("./statusAdapter");
const styles = require("./styles");

class AwayTimer {
  constructor(meta) {
    this.meta = meta;
    this.settings = null;
    this.statusAdapter = null;
    this.manualTimer = null;
    this.menuInjector = null;
    this.quickLauncher = null;
  }

  start() {
    BdApi.DOM.addStyle(this.meta.name, styles);
    this.settings = new SettingsStore({
      onChange: () => {
        this.menuInjector?.refresh();
        this.syncQuickLauncher();
      }
    });
    this.statusAdapter = new StatusAdapter({
      logger: (message, level) => this.log(message, level)
    });
    this.statusAdapter.start();
    this.manualTimer = new ManualStatusTimer({
      settings: this.settings,
      statusAdapter: this.statusAdapter,
      notify: (message) => this.notify(message),
      logger: (message, level) => this.log(message, level)
    });
    this.manualTimer.start();
    this.menuInjector = new MenuInjector({
      settings: this.settings,
      manualTimer: this.manualTimer
    });
    this.menuInjector.start();
    this.quickLauncher = new QuickLauncher({
      settings: this.settings,
      manualTimer: this.manualTimer
    });
    this.syncQuickLauncher();

    this.notify("AwayTimer loaded. Custom times appear in Discord's Idle menu.");
  }

  stop() {
    this.menuInjector?.stop();
    this.quickLauncher?.stop();
    this.manualTimer?.stop();
    this.statusAdapter?.stop();
    this.menuInjector = null;
    this.quickLauncher = null;
    this.manualTimer = null;
    this.statusAdapter = null;
    this.settings = null;
    BdApi.DOM.removeStyle(this.meta.name);
  }

  syncQuickLauncher() {
    if (!this.quickLauncher || !this.settings) return;
    if (this.settings.get("showQuickButton")) {
      if (!this.quickLauncher.root) this.quickLauncher.start();
      return;
    }
    if (this.quickLauncher.root) this.quickLauncher.stop();
  }

  getSettingsPanel() {
    if (!this.settings || !this.manualTimer) return document.createElement("div");
    return createSettingsPanel({
      settings: this.settings,
      manualTimer: this.manualTimer
    });
  }

  notify(message) {
    if (this.settings?.get("showToasts") === false) return;
    BdApi.UI?.showToast?.(message);
  }

  log(message, level = "debug") {
    const logger = level === "warn" ? console.warn : console.debug;
    logger(`[${this.meta.name}] ${message}`);
  }
}

module.exports = AwayTimer;
