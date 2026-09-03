class StatusAdapter {
  start() {
    this.store = BdApi.Webpack.getModule((module) => module?.getName?.() === "UserSettingsProtoStore", {first: true, searchExports: true});
    this.utils = BdApi.Webpack.getModule((module) => module?.ProtoClass?.typeName?.endsWith(".PreloadedUserSettings"), {first: true, searchExports: true});
  }
  stop() { this.store = null; this.utils = null; }
  currentStatus() { return this.store?.settings?.status?.status?.value || "online"; }
  currentCustomStatus() {
    const custom = this.store?.settings?.status?.customStatus;
    if (!custom) return null;
    return {text: custom.text || "", emojiId: custom.emojiId || 0, emojiName: custom.emojiName || "", expiresAtMs: custom.expiresAtMs || 0, createdAtMs: custom.createdAtMs || 0};
  }
  updateStatus(status, customStatus = undefined) {
    if (!this.utils?.updateAsync || !this.store?.settings?.status?.status) return false;
    this.utils.updateAsync("status", (setting) => {
      setting.status.value = status;
      if (customStatus !== undefined) setting.customStatus = {...(setting.customStatus || {}), ...customStatus};
    }, 0);
    return true;
  }
}
module.exports = {StatusAdapter};
