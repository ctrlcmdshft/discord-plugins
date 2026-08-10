/**
 * @name StatusTimer
 * @author ctrlcmdshft
 * @description Custom duration presets for Discord status timers.
 * @version 0.9.4
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
    var PLUGIN_NAME = "StatusTimer";
    var LEGACY_PLUGIN_NAME = "AwayTimer";
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
      setStatusForMinutes(status, minutes) {
        const durationMinutes = clampMinutes(minutes);
        const previousStatus = this.statusAdapter.currentStatus();
        const expiresAt = Date.now() + durationMinutes * 60 * 1e3;
        if (!this.statusAdapter.canUpdateStatus()) {
          this.notify("StatusTimer cannot change status in this Discord build.");
          return false;
        }
        if (!this.statusAdapter.updateStatus(status)) return false;
        BdApi.Data.save(PLUGIN_NAME, ACTIVE_TIMER_KEY, {
          expiresAt,
          status,
          previousStatus: previousStatus === "unknown" ? "online" : previousStatus,
          restoreStatus: this.settings.get("restoreManualTimersToOnline") ? "online" : previousStatus
        });
        this.scheduleRestore(expiresAt);
        this.notify(`${humanStatus(status)} for ${formatMinutes(durationMinutes)}.`);
        return true;
      }
      setIdleForMinutes(minutes) {
        return this.setStatusForMinutes("idle", minutes);
      }
      setDndForMinutes(minutes) {
        return this.setStatusForMinutes("dnd", minutes);
      }
      setInvisibleForMinutes(minutes) {
        return this.setStatusForMinutes("invisible", minutes);
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
      setStatusForever(status) {
        if (!this.statusAdapter.canUpdateStatus()) {
          this.notify("StatusTimer cannot change status in this Discord build.");
          return false;
        }
        this.clearTimer();
        BdApi.Data.delete?.(PLUGIN_NAME, ACTIVE_TIMER_KEY);
        BdApi.Data.delete?.(LEGACY_PLUGIN_NAME, ACTIVE_TIMER_KEY);
        if (!this.statusAdapter.updateStatus(status)) return false;
        this.notify(`${humanStatus(status)} forever.`);
        return true;
      }
      setIdleForever() {
        return this.setStatusForever("idle");
      }
      setDndForever() {
        return this.setStatusForever("dnd");
      }
      setInvisibleForever() {
        return this.setStatusForever("invisible");
      }
      cancel({ restore = false } = {}) {
        const active = BdApi.Data.load(PLUGIN_NAME, ACTIVE_TIMER_KEY);
        this.clearTimer();
        BdApi.Data.delete?.(PLUGIN_NAME, ACTIVE_TIMER_KEY);
        BdApi.Data.delete?.(LEGACY_PLUGIN_NAME, ACTIVE_TIMER_KEY);
        if (restore && active?.previousStatus && this.statusAdapter.currentStatus() === active.status) {
          this.statusAdapter.updateStatus(active.previousStatus);
        }
        this.notify("StatusTimer manual timer cancelled.");
      }
      getActiveTimer(status = null) {
        const active = BdApi.Data.load(PLUGIN_NAME, ACTIVE_TIMER_KEY) || BdApi.Data.load(LEGACY_PLUGIN_NAME, ACTIVE_TIMER_KEY);
        if (!active?.expiresAt) return null;
        if (active.expiresAt <= Date.now()) return null;
        const activeStatus = active.status || "idle";
        if (status && activeStatus !== status) return null;
        return {
          ...active,
          status: activeStatus,
          remainingMs: active.expiresAt - Date.now()
        };
      }
      resumeActiveTimer() {
        const active = BdApi.Data.load(PLUGIN_NAME, ACTIVE_TIMER_KEY) || BdApi.Data.load(LEGACY_PLUGIN_NAME, ACTIVE_TIMER_KEY);
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
        BdApi.Data.delete?.(LEGACY_PLUGIN_NAME, ACTIVE_TIMER_KEY);
        const restoreStatus = timerData?.restoreStatus || timerData?.previousStatus;
        const timerStatus = timerData?.status || "idle";
        if (!restoreStatus || this.statusAdapter.currentStatus() !== timerStatus) return;
        if (this.statusAdapter.updateStatus(restoreStatus)) {
          this.notify(`StatusTimer restored ${humanStatus(restoreStatus)}.`);
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
      return Math.min(Math.max(value, 1), 4320);
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
      const totalMinutes = Number(minutes);
      if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
      if (totalMinutes % 1440 === 0) {
        const days = totalMinutes / 1440;
        return `${days} day${days === 1 ? "" : "s"}`;
      }
      const hours = Math.floor(totalMinutes / 60);
      const remainder = totalMinutes % 60;
      if (!remainder) return `${hours} hour${hours === 1 ? "" : "s"}`;
      return `${hours}h ${remainder}m`;
    }
    function formatClockTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      });
    }
    function humanStatus(status) {
      return {
        dnd: "Do Not Disturb",
        idle: "Idle",
        invisible: "Invisible",
        online: "Online"
      }[status] || String(status).charAt(0).toUpperCase() + String(status).slice(1);
    }
    module2.exports = {
      ManualStatusTimer: ManualStatusTimer2,
      formatClockTime,
      formatMinutes,
      nextTimeTodayOrTomorrow
    };
  }
});

// src/menuInjector.js
var require_menuInjector = __commonJS({
  "src/menuInjector.js"(exports2, module2) {
    var { formatClockTime, formatMinutes } = require_manualStatusTimer();
    var MenuInjector2 = class {
      constructor({ settings, manualTimer }) {
        this.settings = settings;
        this.manualTimer = manualTimer;
        this.observer = null;
        this.pending = false;
        this.lastStatusKind = null;
        this.handlePointerOver = this.handlePointerOver.bind(this);
      }
      start() {
        this.observer = new MutationObserver(() => this.scheduleInject());
        this.observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        document.addEventListener("pointerover", this.handlePointerOver, true);
        this.scheduleInject();
      }
      stop() {
        this.observer?.disconnect();
        this.observer = null;
        this.pending = false;
        document.removeEventListener("pointerover", this.handlePointerOver, true);
        for (const node of document.querySelectorAll(".awaytimer-native-menu-group")) {
          node.remove();
        }
        for (const node of document.querySelectorAll(".awaytimer-hidden-native-menu-item")) {
          node.classList.remove("awaytimer-hidden-native-menu-item");
          node.hidden = false;
        }
        removeParentStatusSubtitles();
      }
      refresh() {
        for (const node of document.querySelectorAll(".awaytimer-native-menu-group")) {
          node.remove();
        }
        for (const node of document.querySelectorAll(".awaytimer-hidden-native-menu-item")) {
          node.classList.remove("awaytimer-hidden-native-menu-item");
          node.hidden = false;
        }
        removeParentStatusSubtitles();
        this.scheduleInject();
      }
      scheduleInject() {
        if (this.pending) return;
        this.pending = true;
        requestAnimationFrame(() => {
          this.pending = false;
          this.decorateParentStatusItems();
          this.injectIntoDurationMenus();
        });
      }
      handlePointerOver(event) {
        const item = event.target?.closest?.('[role="menuitem"], button, [class*="item"]');
        if (!item) return;
        const text = normalizeText(item.textContent);
        const statusKind = statusKindFromText(text);
        if (statusKind) this.lastStatusKind = statusKind;
      }
      injectIntoDurationMenus() {
        for (const menu of findCandidateMenus()) {
          if (menu.querySelector(".awaytimer-native-menu-group")) continue;
          const nativeItems = getNativeIdleDurationItems(menu);
          if (!nativeItems.length) continue;
          const firstNativeItem = nativeItems[0];
          const statusKind = inferStatusKind(menu, this.lastStatusKind);
          if (!statusKind) continue;
          firstNativeItem.before(this.createMenuGroup(firstNativeItem, statusKind));
          for (const item of nativeItems) {
            item.classList.add("awaytimer-hidden-native-menu-item");
            item.hidden = true;
          }
        }
      }
      decorateParentStatusItems() {
        const activeSubtitles = /* @__PURE__ */ new Set();
        for (const item of findParentStatusItems()) {
          const statusKind = statusKindFromText(normalizeText(item.textContent));
          if (!["idle", "dnd", "invisible"].includes(statusKind)) continue;
          const activeTimer = this.manualTimer.getActiveTimer(statusKind);
          if (!activeTimer) continue;
          const label = `Until ${formatClockTime(activeTimer.expiresAt)}`;
          const subtitle = ensureParentStatusSubtitle(item);
          if (subtitle.textContent !== label) subtitle.textContent = label;
          activeSubtitles.add(subtitle);
        }
        for (const subtitle of document.querySelectorAll(".awaytimer-parent-subtitle")) {
          if (!activeSubtitles.has(subtitle)) subtitle.remove();
        }
      }
      createMenuGroup(templateItem, statusKind) {
        const group = document.createElement("div");
        group.className = "awaytimer-native-menu-group";
        group.setAttribute("role", "group");
        const activeTimer = this.manualTimer.getActiveTimer(statusKind);
        if (activeTimer) {
          const activeItem = createClonedMenuItem(templateItem, "awaytimer-active-timer");
          activeItem.setAttribute("aria-disabled", "true");
          activeItem.style.pointerEvents = "none";
          replaceVisibleText(activeItem, `Active until ${formatClockTime(activeTimer.expiresAt)}`);
          group.append(activeItem);
          const cancelItem = createClonedMenuItem(templateItem, "awaytimer-cancel-timer");
          replaceVisibleText(cancelItem, "Cancel Timer");
          cancelItem.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.manualTimer.cancel({ restore: true });
            closeDiscordMenu();
          });
          group.append(cancelItem);
        }
        for (const minutes of this.settings.get(`${statusKind}Presets`)) {
          const item = createClonedMenuItem(templateItem, "awaytimer-minutes");
          item.setAttribute("data-awaytimer-minutes", String(minutes));
          replaceVisibleText(item, `For ${formatMinutes(minutes)}`);
          item.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.manualTimer.setStatusForMinutes(statusKind, minutes);
            closeDiscordMenu();
          });
          group.append(item);
        }
        const foreverItem = createClonedMenuItem(templateItem, "awaytimer-forever");
        foreverItem.setAttribute("data-awaytimer-forever", "true");
        replaceVisibleText(foreverItem, "Forever");
        foreverItem.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.manualTimer.setStatusForever(statusKind);
          closeDiscordMenu();
        });
        group.append(foreverItem);
        return group;
      }
    };
    function inferStatusKind(menu, fallback) {
      if (!["idle", "dnd", "invisible"].includes(fallback)) return null;
      return fallback;
    }
    function statusKindFromText(text) {
      if (text.includes("Online")) return "unsupported";
      if (text.includes("Invisible")) return "invisible";
      if (text.includes("Do Not Disturb")) return "dnd";
      if (text.includes("Idle")) return "idle";
      return null;
    }
    function createClonedMenuItem(templateItem, kind) {
      const item = templateItem.cloneNode(true);
      item.classList.add("awaytimer-native-menu-item", kind);
      item.classList.remove("awaytimer-hidden-native-menu-item");
      item.hidden = false;
      item.removeAttribute("id");
      return item;
    }
    function findCandidateMenus() {
      return Array.from(document.querySelectorAll('[role="menu"]')).filter((node) => node instanceof HTMLElement).filter((node) => !node.closest(".awaytimer-native-menu-group"));
    }
    function findParentStatusItems() {
      return Array.from(document.querySelectorAll('[role="menuitem"], button, [class*="item"]')).filter((node) => node instanceof HTMLElement).filter((node) => !node.closest(".awaytimer-native-menu-group")).filter((node) => !node.classList.contains("awaytimer-native-menu-item")).filter((node) => !node.classList.contains("awaytimer-hidden-native-menu-item")).filter((node) => {
        const text = normalizeText(node.textContent);
        if (isNativeDurationLabel(text)) return false;
        return ["idle", "dnd", "invisible"].includes(statusKindFromText(text));
      });
    }
    function ensureParentStatusSubtitle(item) {
      const existing = item.querySelector(".awaytimer-parent-subtitle");
      if (existing) return existing;
      const subtitle = document.createElement("div");
      subtitle.className = "awaytimer-parent-subtitle";
      subtitle.style.color = "var(--text-muted)";
      subtitle.style.fontSize = "12px";
      subtitle.style.lineHeight = "16px";
      subtitle.style.fontWeight = "500";
      const textContainer = findStatusTextContainer(item);
      textContainer.append(subtitle);
      return subtitle;
    }
    function findStatusTextContainer(item) {
      const textNodes = getTextNodes(item).filter((node) => ["idle", "dnd", "invisible"].includes(statusKindFromText(normalizeText(node.textContent))));
      const textNode = textNodes[0];
      const parent = textNode?.parentElement;
      if (parent && parent !== item) return parent;
      return item;
    }
    function getTextNodes(node) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      return textNodes;
    }
    function removeParentStatusSubtitles() {
      for (const node of document.querySelectorAll(".awaytimer-parent-subtitle")) {
        node.remove();
      }
    }
    function getNativeIdleDurationItems(menu) {
      return Array.from(menu.querySelectorAll('[role="menuitem"], button')).filter((node) => node instanceof HTMLElement).filter((node) => !node.classList.contains("awaytimer-native-menu-item")).filter((node) => !node.closest(".awaytimer-native-menu-group")).filter((node) => !node.classList.contains("awaytimer-hidden-native-menu-item")).filter((node) => isNativeDurationLabel(normalizeText(node.textContent)));
    }
    function isNativeDurationLabel(text) {
      return [
        "For 15 Minutes",
        "For 1 Hour",
        "For 8 Hours",
        "For 24 Hours",
        "For 3 Days",
        "Forever"
      ].includes(text);
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
      MenuInjector: MenuInjector2,
      inferStatusKind,
      statusKindFromText
    };
  }
});

// src/settings.js
var require_settings = __commonJS({
  "src/settings.js"(exports2, module2) {
    var PLUGIN_NAME = "StatusTimer";
    var LEGACY_PLUGIN_NAME = "AwayTimer";
    var DEFAULT_SETTINGS = Object.freeze({
      idlePresets: [15, 60, 480, 1440, 4320],
      dndPresets: [15, 60, 480, 1440, 4320],
      invisiblePresets: [15, 60, 480, 1440, 4320],
      customDurationMinutes: 30,
      restoreManualTimersToOnline: true,
      showToasts: true
    });
    function normalizeSettings(value = {}) {
      const legacyPresets = value.manualPresets;
      return {
        idlePresets: normalizePresets(value.idlePresets || legacyPresets),
        dndPresets: normalizePresets(value.dndPresets || legacyPresets),
        invisiblePresets: normalizePresets(value.invisiblePresets || legacyPresets),
        customDurationMinutes: clampNumber(value.customDurationMinutes, DEFAULT_SETTINGS.customDurationMinutes, 1, 4320),
        restoreManualTimersToOnline: value.restoreManualTimersToOnline !== void 0 ? Boolean(value.restoreManualTimersToOnline) : DEFAULT_SETTINGS.restoreManualTimersToOnline,
        showToasts: value.showToasts !== void 0 ? Boolean(value.showToasts) : DEFAULT_SETTINGS.showToasts
      };
    }
    function normalizePresets(value) {
      const presets = Array.isArray(value) ? value : DEFAULT_SETTINGS.idlePresets;
      const normalized = presets.map((item) => Math.round(Number(item))).filter((item) => Number.isFinite(item) && item > 0 && item <= 4320);
      return Array.from(new Set(normalized)).slice(0, 12);
    }
    function parsePresetText(value) {
      return normalizePresets(String(value).split(/[\s,]+/));
    }
    function parsePresetTextDetailed(value) {
      const parts = String(value).split(/[\s,]+/).filter(Boolean);
      const valid = [];
      const invalid = [];
      for (const part of parts) {
        const number = Number(part);
        const minutes = Math.round(number);
        if (!Number.isFinite(number) || minutes <= 0 || minutes > 4320) {
          invalid.push(part);
          continue;
        }
        valid.push(minutes);
      }
      return {
        presets: normalizePresets(valid),
        invalidCount: invalid.length
      };
    }
    function clampNumber(value, fallback, min, max) {
      const number = Number(value);
      if (!Number.isFinite(number)) return fallback;
      return Math.min(Math.max(number, min), max);
    }
    var SettingsStore2 = class {
      constructor({ onChange } = {}) {
        this.onChange = onChange;
        const stored = BdApi.Data.load(PLUGIN_NAME, "settings");
        const legacyStored = stored ? null : BdApi.Data.load(LEGACY_PLUGIN_NAME, "settings");
        this.values = normalizeSettings(stored || legacyStored);
        if (!stored && legacyStored) BdApi.Data.save(PLUGIN_NAME, "settings", this.values);
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
              id: "showToasts",
              name: "Show Toasts",
              note: "Shows a small notice when StatusTimer changes your status.",
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
      parsePresetText,
      parsePresetTextDetailed
    };
  }
});

// src/settingsPanel.js
var require_settingsPanel = __commonJS({
  "src/settingsPanel.js"(exports2, module2) {
    var { DEFAULT_SETTINGS, parsePresetTextDetailed } = require_settings();
    var { formatClockTime, formatMinutes } = require_manualStatusTimer();
    var STATUS_SECTIONS = [
      { kind: "idle", title: "Idle" },
      { kind: "dnd", title: "Do Not Disturb" },
      { kind: "invisible", title: "Invisible" }
    ];
    function createSettingsPanel2({ settings, manualTimer }) {
      const root = document.createElement("div");
      root.className = "awaytimer-panel";
      let message = "";
      const saveTimers = /* @__PURE__ */ new Map();
      const render = () => {
        const activeTimer = manualTimer.getActiveTimer();
        root.innerHTML = `
      <style>
        .awaytimer-panel { color: var(--text-normal); display: grid; gap: 8px; padding: 0; max-width: 820px; }
        .awaytimer-header { display: grid; gap: 3px; }
        .awaytimer-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; align-items: start; }
        .awaytimer-section { display: grid; gap: 8px; }
        .awaytimer-card { display: grid; gap: 6px; padding: 8px; border: 1px solid var(--background-modifier-accent, rgba(255, 255, 255, 0.1)); border-radius: 8px; background: var(--background-secondary, rgba(255, 255, 255, 0.04)); }
        .awaytimer-title { font-size: 14px; font-weight: 700; color: var(--header-primary, #f2f3f5); }
        .awaytimer-note { color: var(--text-muted); font-size: 11px; line-height: 1.25; }
        .awaytimer-button { min-height: 24px; border: 0; border-radius: 5px; padding: 3px 7px; background: var(--brand-500, #5865f2); color: white; cursor: pointer; font-weight: 700; font-size: 11px; white-space: nowrap; }
        .awaytimer-button:hover { filter: brightness(1.08); }
        .awaytimer-actions { display: grid; grid-template-columns: 1fr; gap: 5px; align-items: center; }
        .awaytimer-button.neutral { background: var(--button-secondary-background, #4e5058); color: var(--button-secondary-text, #fff); }
        .awaytimer-field { display: grid; gap: 4px; }
        .awaytimer-input { width: 100%; box-sizing: border-box; border: 1px solid var(--brand-500, #5865f2); border-radius: 6px; padding: 6px 8px; background: var(--input-background, #1e1f22); color: var(--text-normal, #f2f3f5); font: inherit; font-size: 13px; box-shadow: inset 0 0 0 1px rgba(88, 101, 242, 0.25); }
        .awaytimer-input:focus { outline: 2px solid rgba(88, 101, 242, 0.55); outline-offset: 1px; }
        .awaytimer-status { color: var(--text-positive, #23a55a); font-size: 12px; font-weight: 600; }
        .awaytimer-active { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 8px; border-radius: 8px; background: var(--background-secondary, rgba(255, 255, 255, 0.04)); border: 1px solid var(--background-modifier-accent, rgba(255, 255, 255, 0.1)); }
        .awaytimer-setting { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px; border-radius: 8px; background: var(--background-secondary, rgba(255, 255, 255, 0.04)); border: 1px solid var(--background-modifier-accent, rgba(255, 255, 255, 0.1)); }
        .awaytimer-settings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .awaytimer-switch { position: relative; width: 38px; height: 22px; border: 0; border-radius: 999px; background: var(--background-modifier-accent, #4e5058); cursor: pointer; }
        .awaytimer-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 140ms ease; }
        .awaytimer-switch.is-on { background: var(--brand-500, #5865f2); }
        .awaytimer-switch.is-on::after { transform: translateX(16px); }
        @media (max-width: 620px) { .awaytimer-grid, .awaytimer-settings { grid-template-columns: 1fr; } }
      </style>
      <div class="awaytimer-header">
        <div class="awaytimer-title">Status Timers</div>
        <div class="awaytimer-note">Edits save automatically. Reset restores Discord's default times. Forever is always included.</div>
      </div>
      ${message ? `<div class="awaytimer-status">${escapeAttribute(message)}</div>` : ""}
      ${activeTimer ? renderActiveTimer(activeTimer) : ""}
      <div class="awaytimer-grid">
        ${STATUS_SECTIONS.map(({ kind, title }) => renderPresetSection(kind, title, settings.get(`${kind}Presets`))).join("")}
      </div>
      <div class="awaytimer-settings">
        ${renderSwitch("restoreManualTimersToOnline", "Return To Online", "When timers end.", settings.get("restoreManualTimersToOnline"))}
        ${renderSwitch("showToasts", "Show Toasts", "Small status notices.", settings.get("showToasts"))}
      </div>
    `;
      };
      root.addEventListener("click", (event) => {
        if (event.target.closest("[data-reset-presets]")) {
          const statusKind = event.target.closest("[data-reset-presets]").dataset.statusKind;
          settings.set(`${statusKind}Presets`, DEFAULT_SETTINGS[`${statusKind}Presets`]);
          message = `Reset ${labelStatusKind(statusKind)} presets to Discord defaults.`;
          render();
        }
        if (event.target.closest("[data-cancel-timer]")) {
          manualTimer.cancel({ restore: true });
          message = "Cancelled active timer.";
          render();
        }
        const switchButton = event.target.closest("[data-toggle-setting]");
        if (switchButton) {
          const key = switchButton.dataset.toggleSetting;
          settings.set(key, !settings.get(key));
          render();
        }
      });
      root.addEventListener("input", (event) => {
        const input = event.target.closest("[data-preset-input]");
        if (!input) return;
        const statusKind = input.dataset.presetInput;
        window.clearTimeout(saveTimers.get(statusKind));
        saveTimers.set(statusKind, window.setTimeout(() => {
          const { presets, invalidCount } = parsePresetTextDetailed(input.value);
          settings.set(`${statusKind}Presets`, presets);
          message = `Saved ${labelStatusKind(statusKind)} presets.`;
          if (invalidCount) message += ` Ignored ${invalidCount} invalid value${invalidCount === 1 ? "" : "s"}.`;
          render();
        }, 450));
      });
      render();
      return root;
    }
    function renderActiveTimer(activeTimer) {
      const remainingMinutes = Math.max(1, Math.ceil(activeTimer.remainingMs / 6e4));
      return `
    <div class="awaytimer-active">
      <div>
        <div class="awaytimer-title">Active Timer</div>
        <div class="awaytimer-note">${escapeAttribute(labelStatusKind(activeTimer.status))} until ${escapeAttribute(formatClockTime(activeTimer.expiresAt))}. About ${escapeAttribute(formatMinutes(remainingMinutes))} remaining.</div>
      </div>
      <button class="awaytimer-button neutral" data-cancel-timer>Cancel Timer</button>
    </div>
  `;
    }
    function renderPresetSection(statusKind, title, presets) {
      return `
    <div class="awaytimer-card">
      <div class="awaytimer-field">
        <label class="awaytimer-title">${escapeAttribute(title)}</label>
        <input class="awaytimer-input" data-preset-input="${escapeAttribute(statusKind)}" value="${escapeAttribute(presets.join(", "))}" />
      </div>
      <div class="awaytimer-actions">
        <button class="awaytimer-button neutral" data-status-kind="${escapeAttribute(statusKind)}" data-reset-presets>Reset to Discord Defaults</button>
      </div>
    </div>
  `;
    }
    function labelStatusKind(statusKind) {
      return {
        dnd: "Do Not Disturb",
        idle: "Idle",
        invisible: "Invisible"
      }[statusKind] || "Status";
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
.awaytimer-native-menu-group {
  display: contents;
}

.awaytimer-native-menu-item {
  cursor: pointer;
}

.awaytimer-active-timer {
  color: var(--text-muted, inherit) !important;
  cursor: default;
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
var { SettingsStore } = require_settings();
var { createSettingsPanel } = require_settingsPanel();
var { StatusAdapter } = require_statusAdapter();
var styles = require_styles();
var StatusTimer = class {
  constructor(meta) {
    this.meta = meta;
    this.settings = null;
    this.statusAdapter = null;
    this.manualTimer = null;
    this.menuInjector = null;
  }
  start() {
    BdApi.DOM.addStyle(this.meta.name, styles);
    this.settings = new SettingsStore({
      onChange: () => {
        this.menuInjector?.refresh();
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
    this.notify("StatusTimer loaded. Custom times appear in Discord's status menus.");
  }
  stop() {
    this.menuInjector?.stop();
    this.manualTimer?.stop();
    this.statusAdapter?.stop();
    this.menuInjector = null;
    this.manualTimer = null;
    this.statusAdapter = null;
    this.settings = null;
    BdApi.DOM.removeStyle(this.meta.name);
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
module.exports = StatusTimer;
