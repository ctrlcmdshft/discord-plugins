const {SettingsStore} = require("./settings");
const {StatusAdapter} = require("./statusAdapter");
const {ChannelVisibility} = require("./channelVisibility");
const {NotificationAdapter} = require("./notificationAdapter");
const {ProfileController} = require("./profileController");
const {MenuInjector} = require("./menuInjector");
const {createSettingsPanel} = require("./settingsPanel");

class FocusProfiles {
  constructor(meta) { this.meta = meta; }
  start() {
    this.status = new StatusAdapter(); this.status.start();
    this.visibility = new ChannelVisibility(); this.visibility.start();
    this.notifications = new NotificationAdapter(); this.notifications.start();
    this.settings = new SettingsStore({onChange: () => { this.menu?.refresh(); this.controller?.refreshSchedules(); }});
    this.controller = new ProfileController({settings: this.settings, statusAdapter: this.status, visibility: this.visibility, notifications: this.notifications, notify: (message) => this.notify(message)});
    this.controller.start();
    this.menu = new MenuInjector({settings: this.settings, controller: this.controller}); this.menu.start();
    this.notify("Focus Profiles loaded. Open your status menu to switch profiles.");
  }
  stop() { this.menu?.stop(); this.controller?.stop(); this.notifications?.stop(); this.visibility?.stop(); this.status?.stop(); }
  getSettingsPanel() {
    const selected = BdApi.Webpack.getByKeys("getChannelId");
    const channels = BdApi.Webpack.getByKeys("getChannel", "getDMFromUserId");
    const guilds = BdApi.Webpack.getByKeys("getGuild", "getGuilds");
    return createSettingsPanel({
      settings: this.settings,
      controller: this.controller,
      getCurrentServer: () => { const channel = channels?.getChannel?.(selected?.getChannelId?.()); const id = channel?.guild_id; return id ? {id, name: guilds?.getGuild?.(id)?.name} : null; },
      describeServer: (id) => guilds?.getGuild?.(id)?.name || `Server ${id}`
    });
  }
  notify(message) { if (this.settings?.get("showToasts") !== false) BdApi.UI.showToast(message); }
}
module.exports = FocusProfiles;
