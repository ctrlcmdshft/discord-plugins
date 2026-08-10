/**
 * @name AwayTimer
 * @author ctrlcmdshft
 * @description Choose exactly when Discord should show you as away/idle.
 * @version 0.3.0
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// src/manualStatusTimer.js
var require_manualStatusTimer = __commonJS({
  "src/manualStatusTimer.js"(exports2, module2) {
    var PLUGIN_NAME = "AwayTimer";
    var ACTIVE_TIMER_KEY = "activeManualTimer";
    var ManualStatusTimer2 = class {
      constructor({ settings, statusAdapter, notify, logger }) {
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
        const expiresAt = Date.now() + durationMinutes * 60 * 1e3;
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
        const minutes = Math.max(1, Math.round((expiresAt - Date.now()) / 6e4));
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
      cancel({ restore = false } = {}) {
        const active = BdApi.Data.load(PLUGIN_NAME, ACTIVE_TIMER_KEY);
        this.clearTimer();
        BdApi.Data.delete?.(PLUGIN_NAME, ACTIVE_TIMER_KEY);
        if (restore && active?.previousStatus && this.statusAdapter.currentStatus() === "idle") {
          this.statusAdapter.updateStatus(active.previousStatus);
        }
        this.notify("AwayTimer manual timer cancelled.");
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
    };
    function clampMinutes(minutes) {
      const value = Math.round(Number(minutes));
      if (!Number.isFinite(value)) return 30;
      return Math.min(Math.max(value, 1), 1440);
    }
    function nextTimeTodayOrTomorrow(timeValue) {
      const match = String(timeValue || "").match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      if (hours > 23 || minutes > 59) return null;
      const target = /* @__PURE__ */ new Date();
      target.setHours(hours, minutes, 0, 0);
      if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
      return target.getTime();
    }
    function formatMinutes(minutes) {
      if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
      const hours = Math.floor(minutes / 60);
      const remainder = minutes % 60;
      if (!remainder) return `${hours} hour${hours === 1 ? "" : "s"}`;
      return `${hours}h ${remainder}m`;
    }
    function humanStatus(status) {
      return status.charAt(0).toUpperCase() + status.slice(1);
    }
    module2.exports = {
      ManualStatusTimer: ManualStatusTimer2,
      formatMinutes,
      nextTimeTodayOrTomorrow
    };
  }
});

// src/menuInjector.js
var require_menuInjector = __commonJS({
  "src/menuInjector.js"(exports2, module2) {
    var { formatMinutes } = require_manualStatusTimer();
    var MenuInjector2 = class {
      constructor({ settings, manualTimer }) {
        this.settings = settings;
        this.manualTimer = manualTimer;
        this.observer = null;
        this.pending = false;
      }
      start() {
        this.observer = new MutationObserver(() => this.scheduleInject());
        this.observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        this.scheduleInject();
      }
      stop() {
        this.observer?.disconnect();
        this.observer = null;
        this.pending = false;
        for (const node of document.querySelectorAll(".awaytimer-native-menu-group")) {
          node.remove();
        }
        for (const node of document.querySelectorAll(".awaytimer-hidden-native-menu-item")) {
          node.classList.remove("awaytimer-hidden-native-menu-item");
          node.hidden = false;
        }
      }
      refresh() {
        for (const node of document.querySelectorAll(".awaytimer-native-menu-group")) {
          node.remove();
        }
        for (const node of document.querySelectorAll(".awaytimer-hidden-native-menu-item")) {
          node.classList.remove("awaytimer-hidden-native-menu-item");
          node.hidden = false;
        }
        this.scheduleInject();
      }
      scheduleInject() {
        if (this.pending) return;
        this.pending = true;
        requestAnimationFrame(() => {
          this.pending = false;
          this.injectIntoDurationMenus();
        });
      }
      injectIntoDurationMenus() {
        for (const menu of findCandidateMenus()) {
          if (menu.querySelector(".awaytimer-native-menu-group")) continue;
          const nativeItems = getNativeIdleDurationItems(menu);
          if (!nativeItems.length) continue;
          const firstNativeItem = nativeItems[0];
          firstNativeItem.before(this.createMenuGroup(firstNativeItem));
          for (const item of nativeItems) {
            item.classList.add("awaytimer-hidden-native-menu-item");
            item.hidden = true;
          }
        }
      }
      createMenuGroup(templateItem) {
        const group = document.createElement("div");
        group.className = "awaytimer-native-menu-group";
        group.setAttribute("role", "group");
        for (const minutes of this.settings.get("manualPresets")) {
          const item = templateItem.cloneNode(true);
          item.classList.add("awaytimer-native-menu-item");
          item.classList.remove("awaytimer-hidden-native-menu-item");
          item.hidden = false;
          item.removeAttribute("id");
          item.setAttribute("data-awaytimer-minutes", String(minutes));
          replaceVisibleText(item, `For ${formatMinutes(minutes)}`);
          item.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.manualTimer.setIdleForMinutes(minutes);
            closeDiscordMenu();
          });
          group.append(item);
        }
        const foreverItem = templateItem.cloneNode(true);
        foreverItem.classList.add("awaytimer-native-menu-item");
        foreverItem.classList.remove("awaytimer-hidden-native-menu-item");
        foreverItem.hidden = false;
        foreverItem.removeAttribute("id");
        foreverItem.setAttribute("data-awaytimer-forever", "true");
        replaceVisibleText(foreverItem, "Forever");
        foreverItem.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.manualTimer.setIdleForever();
          closeDiscordMenu();
        });
        group.append(foreverItem);
        return group;
      }
    };
    function findCandidateMenus() {
      return Array.from(document.querySelectorAll('[role="menu"]')).filter((node) => node instanceof HTMLElement).filter((node) => !node.closest(".awaytimer-native-menu-group"));
    }
    function getNativeIdleDurationItems(menu) {
      const labels = [
        "For 15 Minutes",
        "For 1 Hour",
        "For 8 Hours",
        "For 24 Hours",
        "For 3 Days",
        "Forever"
      ];
      const labelSet = new Set(labels);
      return Array.from(menu.querySelectorAll('[role="menuitem"], button')).filter((node) => node instanceof HTMLElement).filter((node) => !node.classList.contains("awaytimer-native-menu-item")).filter((node) => !node.closest(".awaytimer-native-menu-group")).filter((node) => !node.classList.contains("awaytimer-hidden-native-menu-item")).filter((node) => labelSet.has(normalizeText(node.textContent)));
    }
    function replaceVisibleText(node, label) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      const target = textNodes.find((textNode) => normalizeText(textNode.textContent));
      if (target) {
        target.textContent = label;
        for (const textNode of textNodes) {
          if (textNode !== target) textNode.textContent = "";
        }
        return;
      }
      node.textContent = label;
    }
    function normalizeText(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    }
    function closeDiscordMenu() {
      document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true
      }));
    }
    module2.exports = {
      MenuInjector: MenuInjector2
    };
  }
});

// src/quickLauncher.js
var require_quickLauncher = __commonJS({
  "src/quickLauncher.js"(exports2, module2) {
    var { formatMinutes } = require_manualStatusTimer();
    var QuickLauncher2 = class {
      constructor({ settings, manualTimer }) {
        this.settings = settings;
        this.manualTimer = manualTimer;
        this.root = null;
        this.isOpen = false;
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
      }
      start() {
        this.root = document.createElement("div");
        this.root.className = "awaytimer-launcher";
        this.root.innerHTML = `
      <button class="awaytimer-launcher-button" title="AwayTimer" aria-haspopup="true" aria-expanded="false">
        Away
      </button>
      <div class="awaytimer-popover" hidden></div>
    `;
        this.root.querySelector(".awaytimer-launcher-button").addEventListener("click", (event) => {
          event.stopPropagation();
          this.toggle();
        });
        this.root.addEventListener("click", (event) => this.handlePopoverClick(event));
        document.addEventListener("click", this.handleDocumentClick);
        document.addEventListener("keydown", this.handleKeyDown);
        document.body.append(this.root);
      }
      stop() {
        document.removeEventListener("click", this.handleDocumentClick);
        document.removeEventListener("keydown", this.handleKeyDown);
        this.root?.remove();
        this.root = null;
        this.isOpen = false;
      }
      toggle() {
        if (this.isOpen) this.close();
        else this.open();
      }
      open() {
        this.isOpen = true;
        this.renderPopover();
        this.root.querySelector(".awaytimer-launcher-button").setAttribute("aria-expanded", "true");
        this.root.querySelector(".awaytimer-popover").hidden = false;
      }
      close() {
        if (!this.root) return;
        this.isOpen = false;
        this.root.querySelector(".awaytimer-launcher-button").setAttribute("aria-expanded", "false");
        this.root.querySelector(".awaytimer-popover").hidden = true;
      }
      renderPopover() {
        const popover = this.root.querySelector(".awaytimer-popover");
        popover.innerHTML = `
      <div class="awaytimer-popover-title">Set Idle</div>
      <div class="awaytimer-popover-grid">
        ${this.settings.get("manualPresets").map((minutes) => `
          <button class="awaytimer-popover-button" data-minutes="${minutes}">${formatMinutes(minutes)}</button>
        `).join("")}
        <button class="awaytimer-popover-button" data-forever>Forever</button>
      </div>
      <div class="awaytimer-popover-row">
        <input class="awaytimer-popover-input" type="number" min="1" max="1440" value="${this.settings.get("customDurationMinutes")}" data-custom-minutes />
        <button class="awaytimer-popover-button primary" data-custom-start>Start</button>
      </div>
      <div class="awaytimer-popover-row">
        <input class="awaytimer-popover-input" type="time" data-until-time />
        <button class="awaytimer-popover-button primary" data-until-start>Until</button>
      </div>
      <button class="awaytimer-popover-button secondary full" data-cancel-timer>Cancel Timer</button>
    `;
      }
      handlePopoverClick(event) {
        const minutesButton = event.target.closest("[data-minutes]");
        if (minutesButton) {
          this.manualTimer.setIdleForMinutes(minutesButton.dataset.minutes);
          this.close();
          return;
        }
        if (event.target.closest("[data-forever]")) {
          this.manualTimer.setIdleForever();
          this.close();
          return;
        }
        if (event.target.closest("[data-custom-start]")) {
          const input = this.root.querySelector("[data-custom-minutes]");
          this.settings.set("customDurationMinutes", input.value);
          this.manualTimer.setIdleForMinutes(input.value);
          this.close();
          return;
        }
        if (event.target.closest("[data-until-start]")) {
          const input = this.root.querySelector("[data-until-time]");
          if (this.manualTimer.setIdleUntil(input.value)) this.close();
          return;
        }
        if (event.target.closest("[data-cancel-timer]")) {
          this.manualTimer.cancel({ restore: true });
          this.close();
        }
      }
      handleDocumentClick(event) {
        if (!this.root || this.root.contains(event.target)) return;
        this.close();
      }
      handleKeyDown(event) {
        if (event.key === "Escape") this.close();
      }
    };
    module2.exports = {
      QuickLauncher: QuickLauncher2
    };
  }
});

// src/settings.js
var require_settings = __commonJS({
  "src/settings.js"(exports2, module2) {
    var PLUGIN_NAME = "AwayTimer";
    var DEFAULT_SETTINGS = Object.freeze({
      manualPresets: [20, 45, 120, 240, 1440],
      customDurationMinutes: 30,
      restoreManualTimersToOnline: true,
      showQuickButton: false,
      showToasts: true
    });
    function normalizeSettings(value = {}) {
      return {
        manualPresets: normalizePresets(value.manualPresets),
        customDurationMinutes: clampNumber(value.customDurationMinutes, DEFAULT_SETTINGS.customDurationMinutes, 1, 1440),
        restoreManualTimersToOnline: value.restoreManualTimersToOnline !== void 0 ? Boolean(value.restoreManualTimersToOnline) : DEFAULT_SETTINGS.restoreManualTimersToOnline,
        showQuickButton: value.showQuickButton !== void 0 ? Boolean(value.showQuickButton) : DEFAULT_SETTINGS.showQuickButton,
        showToasts: value.showToasts !== void 0 ? Boolean(value.showToasts) : DEFAULT_SETTINGS.showToasts
      };
    }
    function normalizePresets(value) {
      const presets = Array.isArray(value) ? value : DEFAULT_SETTINGS.manualPresets;
      const normalized = presets.map((item) => Math.round(Number(item))).filter((item) => Number.isFinite(item) && item > 0 && item <= 1440);
      return Array.from(new Set(normalized)).slice(0, 12);
    }
    function parsePresetText(value) {
      return normalizePresets(String(value).split(/[\s,]+/));
    }
    function clampNumber(value, fallback, min, max) {
      const number = Number(value);
      if (!Number.isFinite(number)) return fallback;
      return Math.min(Math.max(number, min), max);
    }
    var SettingsStore2 = class {
      constructor({ onChange } = {}) {
        this.onChange = onChange;
        this.values = normalizeSettings(BdApi.Data.load(PLUGIN_NAME, "settings"));
      }
      get all() {
        return { ...this.values };
      }
      get(key) {
        return this.values[key];
      }
      set(key, value) {
        this.values = normalizeSettings({ ...this.values, [key]: value });
        BdApi.Data.save(PLUGIN_NAME, "settings", this.values);
        this.onChange?.(this.all);
      }
      getSettingsPanel() {
        return BdApi.UI.buildSettingsPanel({
          settings: [
            {
              type: "switch",
              id: "restoreManualTimersToOnline",
              name: "Manual Timers Return To Online",
              note: "When a custom Idle timer ends, set your status back to Online instead of restoring the previous status.",
              value: this.values.restoreManualTimersToOnline
            },
            {
              type: "switch",
              id: "showQuickButton",
              name: "Show Floating Quick Button",
              note: "Shows the old Away button near the lower-left user panel as a fallback.",
              value: this.values.showQuickButton
            },
            {
              type: "switch",
              id: "showToasts",
              name: "Show Toasts",
              note: "Shows a small notice when AwayTimer changes your status.",
              value: this.values.showToasts
            }
          ],
          onChange: (_, id, value) => this.set(id, value)
        });
      }
    };
    module2.exports = {
      DEFAULT_SETTINGS,
      SettingsStore: SettingsStore2,
      normalizeSettings,
      parsePresetText
    };
  }
});

// src/settingsPanel.js
var require_settingsPanel = __commonJS({
  "src/settingsPanel.js"(exports2, module2) {
    var { parsePresetText } = require_settings();
    var { formatMinutes } = require_manualStatusTimer();
    function createSettingsPanel2({ settings, manualTimer }) {
      const root = document.createElement("div");
      root.className = "awaytimer-panel";
      const render = () => {
        root.innerHTML = `
      <style>
        .awaytimer-panel { color: var(--text-normal); display: grid; gap: 22px; padding: 8px 0; }
        .awaytimer-section { display: grid; gap: 12px; }
        .awaytimer-title { font-size: 16px; font-weight: 700; color: var(--header-primary, #f2f3f5); }
        .awaytimer-note { color: var(--text-muted); font-size: 13px; line-height: 1.4; }
        .awaytimer-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
        .awaytimer-button { min-height: 38px; border: 0; border-radius: 6px; padding: 8px 14px; background: var(--brand-500, #5865f2); color: white; cursor: pointer; font-weight: 700; font-size: 14px; }
        .awaytimer-button:hover { filter: brightness(1.08); }
        .awaytimer-button.secondary { justify-self: start; min-width: 132px; background: var(--brand-500, #5865f2); color: white; }
        .awaytimer-field { display: grid; gap: 6px; }
        .awaytimer-input { width: min(520px, 100%); box-sizing: border-box; border: 1px solid var(--background-modifier-accent); border-radius: 6px; padding: 10px 12px; background: var(--input-background); color: var(--text-normal); font: inherit; font-size: 15px; }
        .awaytimer-setting { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; align-items: center; padding-top: 4px; }
        .awaytimer-switch { position: relative; width: 42px; height: 24px; border: 0; border-radius: 999px; background: var(--background-modifier-accent, #4e5058); cursor: pointer; }
        .awaytimer-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 140ms ease; }
        .awaytimer-switch.is-on { background: var(--brand-500, #5865f2); }
        .awaytimer-switch.is-on::after { transform: translateX(18px); }
      </style>
      <div class="awaytimer-section">
        <div class="awaytimer-title">Custom Idle Timers</div>
        <div class="awaytimer-note">Set Idle for your own durations instead of Discord's fixed 15m, 1h, 8h, 24h, 3d, and Forever choices.</div>
        <div class="awaytimer-buttons">
          ${settings.get("manualPresets").map((minutes) => `
            <button class="awaytimer-button" data-minutes="${minutes}">${formatMinutes(minutes)}</button>
          `).join("")}
        </div>
      </div>
      <div class="awaytimer-section">
        <div class="awaytimer-field">
          <label class="awaytimer-title" for="awaytimer-presets">Preset minutes</label>
          <div class="awaytimer-note">Comma-separated minutes. Default: 20, 45, 120, 240, 1440</div>
          <input id="awaytimer-presets" class="awaytimer-input" value="${escapeAttribute(settings.get("manualPresets").join(", "))}" />
        </div>
        <button class="awaytimer-button secondary" data-save-presets>Save Presets</button>
      </div>
      <div class="awaytimer-section">
        ${renderSwitch("restoreManualTimersToOnline", "Manual Timers Return To Online", "When a custom Idle timer ends, set your status back to Online instead of restoring the previous status.", settings.get("restoreManualTimersToOnline"))}
        ${renderSwitch("showQuickButton", "Show Floating Quick Button", "Shows the old Away button near the lower-left user panel as a fallback.", settings.get("showQuickButton"))}
        ${renderSwitch("showToasts", "Show Toasts", "Shows a small notice when AwayTimer changes your status.", settings.get("showToasts"))}
      </div>
    `;
      };
      root.addEventListener("click", (event) => {
        const minutesButton = event.target.closest("[data-minutes]");
        if (minutesButton) manualTimer.setIdleForMinutes(minutesButton.dataset.minutes);
        if (event.target.closest("[data-save-presets]")) {
          const input = root.querySelector("#awaytimer-presets");
          settings.set("manualPresets", parsePresetText(input.value));
          render();
        }
        if (event.target.closest("[data-cancel-timer]")) manualTimer.cancel({ restore: true });
        const switchButton = event.target.closest("[data-toggle-setting]");
        if (switchButton) {
          const key = switchButton.dataset.toggleSetting;
          settings.set(key, !settings.get(key));
          render();
        }
      });
      render();
      return root;
    }
    function renderSwitch(id, title, note, enabled) {
      return `
    <div class="awaytimer-setting">
      <div>
        <div class="awaytimer-title">${escapeAttribute(title)}</div>
        <div class="awaytimer-note">${escapeAttribute(note)}</div>
      </div>
      <button class="awaytimer-switch ${enabled ? "is-on" : ""}" data-toggle-setting="${escapeAttribute(id)}" aria-label="${escapeAttribute(title)}" aria-pressed="${enabled}"></button>
    </div>
  `;
    }
    function escapeAttribute(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]);
    }
    module2.exports = {
      createSettingsPanel: createSettingsPanel2
    };
  }
});

// src/statusAdapter.js
var require_statusAdapter = __commonJS({
  "src/statusAdapter.js"(exports2, module2) {
    var StatusAdapter2 = class {
      constructor({ logger }) {
        this.logger = logger;
        this.userSettingsStore = null;
        this.userSettingsUtils = null;
        this.selectedChannelStore = null;
      }
      start() {
        this.userSettingsStore = BdApi.Webpack.getModule(
          (module3) => module3 && typeof module3.getName === "function" && module3.getName() === "UserSettingsProtoStore",
          { first: true, searchExports: true }
        );
        this.userSettingsUtils = BdApi.Webpack.getModule(
          (module3) => module3?.ProtoClass?.typeName?.endsWith(".PreloadedUserSettings"),
          { first: true, searchExports: true }
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
    };
    module2.exports = {
      StatusAdapter: StatusAdapter2
    };
  }
});

// src/styles.js
var require_styles = __commonJS({
  "src/styles.js"(exports2, module2) {
    module2.exports = `
.awaytimer-launcher {
  position: fixed;
  left: 18px;
  bottom: 78px;
  z-index: 10000;
  font-family: var(--font-primary, "gg sans", "Helvetica Neue", Helvetica, Arial, sans-serif);
}

.awaytimer-launcher-button,
.awaytimer-popover-button {
  border: 0;
  border-radius: 6px;
  background: var(--brand-500, #5865f2);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
}

.awaytimer-launcher-button {
  min-width: 58px;
  height: 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}

.awaytimer-launcher-button:hover,
.awaytimer-popover-button:hover {
  filter: brightness(1.08);
}

.awaytimer-popover {
  position: absolute;
  left: 0;
  bottom: 42px;
  width: 260px;
  display: grid;
  gap: 10px;
  padding: 12px;
  color: var(--text-normal, #dbdee1);
  background: var(--background-floating, #111214);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
}

.awaytimer-popover[hidden] {
  display: none;
}

.awaytimer-popover-title {
  font-size: 14px;
  font-weight: 800;
}

.awaytimer-popover-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.awaytimer-popover-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 76px;
  gap: 8px;
}

.awaytimer-popover-button {
  min-height: 34px;
  padding: 7px 10px;
  background: var(--background-modifier-selected, rgba(255, 255, 255, 0.1));
  color: var(--text-normal, #f2f3f5);
}

.awaytimer-popover-button.primary {
  background: var(--brand-500, #5865f2);
  color: #fff;
}

.awaytimer-popover-button.secondary {
  background: var(--button-secondary-background, #4e5058);
}

.awaytimer-popover-button.full {
  width: 100%;
}

.awaytimer-popover-input {
  min-width: 0;
  height: 34px;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-accent, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  padding: 0 9px;
  background: var(--input-background, #1e1f22);
  color: var(--text-normal, #dbdee1);
  font: inherit;
  font-size: 13px;
}

.awaytimer-native-menu-group {
  display: contents;
}

.awaytimer-native-menu-item {
  cursor: pointer;
}

.awaytimer-hidden-native-menu-item {
  display: none !important;
}
`;
  }
});

// src/index.js
var { ManualStatusTimer } = require_manualStatusTimer();
var { MenuInjector } = require_menuInjector();
var { QuickLauncher } = require_quickLauncher();
var { SettingsStore } = require_settings();
var { createSettingsPanel } = require_settingsPanel();
var { StatusAdapter } = require_statusAdapter();
var styles = require_styles();
var AwayTimer = class {
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
};
module.exports = AwayTimer;
