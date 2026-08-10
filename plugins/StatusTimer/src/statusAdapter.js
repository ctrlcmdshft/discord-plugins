class StatusAdapter {
  constructor({logger}) {
    this.logger = logger;
    this.userSettingsStore = null;
    this.userSettingsUtils = null;
    this.selectedChannelStore = null;
  }

  start() {
    this.userSettingsStore = BdApi.Webpack.getModule(
      (module) => module && typeof module.getName === "function" && module.getName() === "UserSettingsProtoStore",
      {first: true, searchExports: true}
    );
    this.userSettingsUtils = BdApi.Webpack.getModule(
      (module) => module?.ProtoClass?.typeName?.endsWith(".PreloadedUserSettings"),
      {first: true, searchExports: true}
    );
    this.selectedChannelStore = BdApi.Webpack.getByKeys("getVoiceChannelId", "getChannelId");

    if (!this.canUpdateStatus()) {
      this.logger("Could not find Discord status settings module.", "warn");
    }
  }

  stop() {
    this.userSettingsStore = null;
    this.userSettingsUtils = null;
    this.selectedChannelStore = null;
  }

  canUpdateStatus() {
    return Boolean(this.userSettingsStore?.settings?.status?.status && this.userSettingsUtils?.updateAsync);
  }

  currentStatus() {
    return this.userSettingsStore?.settings?.status?.status?.value || "unknown";
  }

  inVoiceChannel() {
    try {
      return Boolean(this.selectedChannelStore?.getVoiceChannelId?.());
    } catch (error) {
      this.logger(`Voice state check failed: ${error.message}`, "warn");
      return false;
    }
  }

  updateStatus(status) {
    if (!this.canUpdateStatus()) return false;

    this.userSettingsUtils.updateAsync(
      "status",
      (statusSetting) => {
        statusSetting.status.value = status;
      },
      0
    );
    return true;
  }
}

module.exports = {
  StatusAdapter
};
