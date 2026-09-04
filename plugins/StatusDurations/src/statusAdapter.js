class StatusAdapter {
  start() { this.resolve(); }
  resolve() {
    this.store = BdApi.Webpack.getModule(
      (module) => module?.getName?.() === "UserSettingsProtoStore" || Boolean(module?.settings?.status?.status),
      {first:true, searchExports:true}
    );
    this.actions = BdApi.Webpack.getModule(
      (module) => module?.ProtoClass?.typeName?.endsWith(".PreloadedUserSettings"),
      {first:true, searchExports:true}
    ) || BdApi.Webpack.getByKeys("updateAsync", "getCurrentValue") || BdApi.Webpack.getByKeys("updateAsync");
  }
  stop() { this.store = null; this.actions = null; }
  current() {
    const status = this.store?.settings?.status?.status?.value;
    return typeof status === "string" && status ? status : null;
  }
  set(status) {
    if (!this.store?.settings?.status?.status || !this.actions?.updateAsync) this.resolve();
    if (!this.store?.settings?.status?.status || !this.actions?.updateAsync) return false;
    try {
      const result = this.actions.updateAsync("status", (data) => { data.status.value = status; }, 0);
      result?.catch?.((error) => console.error("[StatusDurations] Failed to update status", error));
      return true;
    } catch (error) {
      console.error("[StatusDurations] Failed to update status", error);
      return false;
    }
  }
}
module.exports = {StatusAdapter};
