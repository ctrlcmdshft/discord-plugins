const styles = require("./styles");
const {createDefaultCommands} = require("./commandRegistry");
const {DiscordBridge} = require("./discordBridge");
const {CommandPalette} = require("./palette");
const {SettingsStore} = require("./settings");
const {createSettingsPanel} = require("./settingsPanel");

class CommandCenter {
  constructor(meta) {
    this.meta = meta;
    this.discord = null;
    this.palette = null;
    this.registry = null;
    this.settings = null;
    this.handleGlobalKeyDown = null;
  }

  start() {
    BdApi.DOM.addStyle(this.meta.name, styles);
    this.settings = new SettingsStore({
      onChange: () => this.palette?.updateResults()
    });
    this.discord = new DiscordBridge({notify: (message, options) => this.notify(message, options)});
    this.discord.start();

    const context = {
      meta: this.meta,
      notify: (message, options) => this.notify(message, options),
      discord: this.discord,
      settings: this.settings,
      palette: null
    };

    this.registry = createDefaultCommands(context);
    this.palette = new CommandPalette({
      registry: this.registry,
      notify: context.notify
    });
    context.palette = this.palette;

    this.handleGlobalKeyDown = (event) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifierPressed = isMac ? event.metaKey : event.ctrlKey;
      if (!modifierPressed || event.shiftKey || event.altKey || event.key.toLowerCase() !== "k") return;

      event.preventDefault();
      event.stopPropagation();
      this.palette.toggle();
    };

    document.addEventListener("keydown", this.handleGlobalKeyDown, true);
    this.notify("Command Center loaded. Press Cmd/Ctrl+K.");
  }

  onSwitch() {
    this.discord?.onSwitch();
    if (this.palette?.isOpen) this.palette.updateResults();
  }

  stop() {
    if (this.handleGlobalKeyDown) {
      document.removeEventListener("keydown", this.handleGlobalKeyDown, true);
      this.handleGlobalKeyDown = null;
    }

    this.palette?.destroy();
    this.palette = null;
    this.registry = null;
    this.settings = null;
    this.discord?.stop();
    this.discord = null;
    BdApi.DOM.removeStyle(this.meta.name);
  }

  getSettingsPanel() {
    return this.settings ? createSettingsPanel({settings: this.settings}) : document.createElement("div");
  }

  notify(message, options = {}) {
    const type = options.type || "info";
    if (BdApi.UI?.showToast) {
      BdApi.UI.showToast(message, {type});
      return;
    }
    console.log(`[CommandCenter] ${message}`);
  }
}

module.exports = CommandCenter;
