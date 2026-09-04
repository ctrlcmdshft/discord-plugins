class StatusAdapter {
  constructor({webpack, logger} = {}) { this.webpack = webpack || globalThis.BdApi?.Webpack; this.logger = logger || globalThis.BdApi?.Logger || console; }
  start() { return this.resolve(); }
  resolve() {
    if (!this.webpack) return this.health();
    this.store = this.webpack.getModule(
      (module) => module?.getName?.() === "UserSettingsProtoStore" || Boolean(module?.settings?.status?.status),
      {first:true, searchExports:true, cacheId:"StatusDurations:status-store"}
    );
    this.actions = this.webpack.getModule(
      (module) => module?.ProtoClass?.typeName?.endsWith(".PreloadedUserSettings"),
      {first:true, searchExports:true, cacheId:"StatusDurations:status-actions"}
    ) || this.webpack.getByKeys("updateAsync", "getCurrentValue") || this.webpack.getByKeys("updateAsync");
    return this.health();
  }
  stop() { this.store = null; this.actions = null; }
  health() {
    const canRead = typeof this.store?.settings?.status?.status?.value === "string";
    const canWrite = typeof this.actions?.updateAsync === "function";
    return {available:canRead && canWrite, canRead, canWrite};
  }
  current() {
    const status = this.store?.settings?.status?.status?.value;
    return typeof status === "string" && status ? status : null;
  }
  set(status) {
    if (!["online", "idle", "dnd", "invisible"].includes(status)) return false;
    if (!this.store?.settings?.status?.status || !this.actions?.updateAsync) this.resolve();
    if (!this.store?.settings?.status?.status || !this.actions?.updateAsync) return false;
    try {
      const result = this.actions.updateAsync("status", (data) => { data.status.value = status; }, 0);
      result?.catch?.((error) => this.logger.error("Failed to update status", error));
      return true;
    } catch (error) {
      this.logger.error("Failed to update status", error);
      return false;
    }
  }
}
module.exports = {StatusAdapter};
