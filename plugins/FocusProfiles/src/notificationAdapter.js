class NotificationAdapter {
  start() {
    this.actions = BdApi.Webpack.getByKeys("updateGuildNotificationSettings") || BdApi.Webpack.getModule((module) => typeof module?.updateGuildNotificationSettings === "function", {first: true, searchExports: true});
    this.settingsStore = BdApi.Webpack.getByKeys("getGuildNotificationSettings") || BdApi.Webpack.getModule((module) => typeof module?.getGuildNotificationSettings === "function", {first: true, searchExports: true});
  }
  stop() { this.actions = null; this.settingsStore = null; }
  getMuted(guildId) {
    if (typeof this.settingsStore?.getGuildNotificationSettings !== "function") return null;
    try {
      const settings = this.settingsStore.getGuildNotificationSettings(guildId);
      return typeof settings?.muted === "boolean" ? settings.muted : null;
    } catch { return null; }
  }
  setMuted(guildId, muted) {
    if (typeof this.actions?.updateGuildNotificationSettings !== "function") return false;
    try {
      this.actions.updateGuildNotificationSettings(guildId, {muted: Boolean(muted)});
      return true;
    } catch { return false; }
  }
}
module.exports = {NotificationAdapter};
