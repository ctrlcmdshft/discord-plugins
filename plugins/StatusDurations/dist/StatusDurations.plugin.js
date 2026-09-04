/**
 * @name StatusDurations
 * @author ctrlcmdshft
 * @version 1.0.17
 * @description Replace Discord's status duration choices with your own times.
 * @website https://github.com/ctrlcmdshft/discord-plugins
 * @source https://github.com/ctrlcmdshft/discord-plugins/tree/main/plugins/StatusDurations
 * @updateUrl https://raw.githubusercontent.com/ctrlcmdshft/discord-plugins/main/releases/StatusDurations.plugin.js
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// src/settings.js
var require_settings = __commonJS({
  "src/settings.js"(exports2, module2) {
    var NAME = "StatusDurations";
    var DEFAULTS2 = [15, 60, 480, 1440, 4320];
    function normalize(value) {
      const values = Array.isArray(value?.durations) ? value.durations : DEFAULTS2;
      const durations = [...new Set(values.map((item) => Math.round(Number(item))).filter((item) => Number.isFinite(item) && item > 0 && item <= 4320))].slice(0, 5);
      return { durations: durations.length === 5 ? durations : DEFAULTS2 };
    }
    var Settings2 = class {
      constructor(onChange) {
        this.onChange = onChange;
        this.values = normalize(BdApi.Data.load(NAME, "settings"));
      }
      get durations() {
        return this.values.durations;
      }
      setDurations(value) {
        this.values = normalize({ durations: value });
        BdApi.Data.save(NAME, "settings", this.values);
        this.onChange?.();
      }
    };
    function parseDurations(text) {
      return String(text).split(/[\s,]+/).filter(Boolean).map(Number);
    }
    module2.exports = { NAME, DEFAULTS: DEFAULTS2, Settings: Settings2, normalize, parseDurations };
  }
});

// src/statusAdapter.js
var require_statusAdapter = __commonJS({
  "src/statusAdapter.js"(exports2, module2) {
    var StatusAdapter2 = class {
      start() {
        this.resolve();
      }
      resolve() {
        this.store = BdApi.Webpack.getModule(
          (module3) => module3?.getName?.() === "UserSettingsProtoStore" || Boolean(module3?.settings?.status?.status),
          { first: true, searchExports: true }
        );
        this.actions = BdApi.Webpack.getModule(
          (module3) => module3?.ProtoClass?.typeName?.endsWith(".PreloadedUserSettings"),
          { first: true, searchExports: true }
        ) || BdApi.Webpack.getByKeys("updateAsync", "getCurrentValue") || BdApi.Webpack.getByKeys("updateAsync");
      }
      stop() {
        this.store = null;
        this.actions = null;
      }
      current() {
        const status = this.store?.settings?.status?.status?.value;
        return typeof status === "string" && status ? status : null;
      }
      set(status) {
        if (!this.store?.settings?.status?.status || !this.actions?.updateAsync) this.resolve();
        if (!this.store?.settings?.status?.status || !this.actions?.updateAsync) return false;
        try {
          const result = this.actions.updateAsync("status", (data) => {
            data.status.value = status;
          }, 0);
          result?.catch?.((error) => console.error("[StatusDurations] Failed to update status", error));
          return true;
        } catch (error) {
          console.error("[StatusDurations] Failed to update status", error);
          return false;
        }
      }
    };
    module2.exports = { StatusAdapter: StatusAdapter2 };
  }
});

// src/timer.js
var require_timer = __commonJS({
  "src/timer.js"(exports2, module2) {
    var { NAME } = require_settings();
    var Timer2 = class {
      constructor({ adapter, notify }) {
        this.adapter = adapter;
        this.notify = notify;
        this.handle = null;
      }
      start() {
        const active = this.active();
        if (active?.expiresAt > Date.now()) this.schedule(active.expiresAt);
        else if (active) this.finish(active);
      }
      stop() {
        window.clearTimeout(this.handle);
        this.handle = null;
      }
      activate(status, minutes) {
        const previousStatus = this.adapter.current();
        if (!this.adapter.set(status)) {
          this.notify("StatusDurations cannot update your status in this Discord build.");
          return false;
        }
        const active = { status, previousStatus, activatedAt: Date.now(), expiresAt: Date.now() + minutes * 6e4 };
        BdApi.Data.save(NAME, "active", active);
        this.schedule(active.expiresAt);
        this.notify(`${label(status)} for ${format(minutes)}.`);
        return true;
      }
      active() {
        const active = BdApi.Data.load(NAME, "active");
        if (!active) return null;
        if (shouldCancelForStatusChange(active, this.adapter.current(), Date.now())) {
          this.stop();
          BdApi.Data.delete?.(NAME, "active");
          return null;
        }
        return active;
      }
      schedule(expiresAt) {
        this.stop();
        this.handle = window.setTimeout(() => this.finish(), Math.max(0, expiresAt - Date.now()));
      }
      finish(saved = this.active()) {
        this.stop();
        BdApi.Data.delete?.(NAME, "active");
        if (saved?.previousStatus && this.adapter.current() === saved.status) this.adapter.set(saved.previousStatus);
      }
    };
    function format(minutes) {
      if (minutes < 60) return `${minutes} minutes`;
      if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`;
      if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`;
      return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    }
    function shouldCancelForStatusChange(active, currentStatus, now) {
      return Boolean(active?.status && currentStatus && active.status !== currentStatus && now - Number(active.activatedAt || 0) > 2e3);
    }
    function label(status) {
      return { idle: "Idle", dnd: "Do Not Disturb", invisible: "Invisible" }[status] || status;
    }
    module2.exports = { Timer: Timer2, format, shouldCancelForStatusChange };
  }
});

// src/menu.js
var require_menu = __commonJS({
  "src/menu.js"(exports2, module2) {
    var Menu2 = class {
      constructor({ settings, timer }) {
        this.settings = settings;
        this.timer = timer;
        this.lastStatus = null;
        this.pending = false;
        this.running = false;
        this.boundItems = /* @__PURE__ */ new Map();
        this.captureStatus = this.captureStatus.bind(this);
      }
      start() {
        if (this.running) return;
        this.running = true;
        this.observer = new MutationObserver(() => this.schedule());
        this.observer.observe(document.body, { childList: true, subtree: true });
        document.addEventListener("pointerover", this.captureStatus, true);
        document.addEventListener("focusin", this.captureStatus, true);
        this.clock = window.setInterval(() => this.updateActiveTimerLabels(), 1e3);
        this.schedule();
      }
      stop() {
        this.running = false;
        this.observer?.disconnect();
        document.removeEventListener("pointerover", this.captureStatus, true);
        document.removeEventListener("focusin", this.captureStatus, true);
        window.clearInterval(this.clock);
        this.clock = null;
        for (const [node, binding] of this.boundItems) {
          node.removeEventListener("click", binding.listener, true);
          if (binding.textNode.isConnected && binding.textNode.textContent === binding.replacement) binding.textNode.textContent = binding.original;
          delete node.dataset.statusdurationsBound;
        }
        removeActiveTimerBadges();
        this.boundItems.clear();
      }
      refresh() {
        this.stop();
        this.start();
      }
      captureStatus(event) {
        const text = normalizeText(event.target?.closest?.(STATUS_ITEM_SELECTOR)?.textContent);
        this.lastStatus = statusFromText(text) || this.lastStatus;
      }
      schedule() {
        if (!this.running || this.pending) return;
        this.pending = true;
        requestAnimationFrame(() => {
          this.pending = false;
          if (this.running) this.inject();
        });
      }
      inject() {
        this.decorateActiveTimer();
        for (const menu of document.querySelectorAll('[role="menu"]')) {
          if (menu.querySelector(".awaytimer-native-menu-group")) continue;
          const native = getTimedDurationItems(menu);
          if (native.length !== 5 || !this.lastStatus) continue;
          native.forEach((node, index) => this.replaceItem(node, this.settings.durations[index]));
        }
      }
      replaceItem(node, minutes) {
        if (this.boundItems.has(node)) return;
        const replacement = `For ${format(minutes)}`;
        const textNode = findLabelTextNode(node);
        if (!textNode) return;
        const original = textNode.textContent;
        textNode.textContent = replacement;
        node.dataset.statusdurationsBound = "true";
        const listener = (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          event.stopPropagation();
          this.timer.activate(this.lastStatus, minutes);
          close();
        };
        node.addEventListener("click", listener, true);
        this.boundItems.set(node, { listener, textNode, original, replacement });
      }
      decorateActiveTimer() {
        const active = this.timer.active();
        const visible = active?.expiresAt > Date.now() ? active : null;
        removeActiveTimerBadges();
        if (!visible) return;
        for (const item of findStatusItems(document, visible.status)) {
          const note = document.createElement("div");
          note.className = "statusdurations-active-timer";
          note.dataset.expiresAt = String(visible.expiresAt);
          note.textContent = countdownLabel(visible.expiresAt);
          note.style.cssText = "position:absolute;left:40px;bottom:4px;padding:1px 6px;border-radius:999px;background:var(--background-modifier-hover);font-size:11px;line-height:15px;color:var(--text-muted);font-weight:600;white-space:nowrap;pointer-events:none;";
          item.dataset.statusdurationsPadding = item.style.paddingBottom;
          item.dataset.statusdurationsPosition = item.style.position;
          item.style.position = "relative";
          item.style.paddingBottom = "22px";
          item.append(note);
        }
      }
      updateActiveTimerLabels() {
        const active = this.timer.active();
        if (!active?.expiresAt || active.expiresAt <= Date.now()) {
          this.schedule();
          return;
        }
        for (const node of document.querySelectorAll(".statusdurations-active-timer")) {
          if (Number(node.dataset.expiresAt) === active.expiresAt) node.textContent = countdownLabel(active.expiresAt);
        }
      }
    };
    function statusFromText(text) {
      if (text.includes("Do Not Disturb")) return "dnd";
      if (text.includes("Invisible")) return "invisible";
      if (text.includes("Idle")) return "idle";
      return null;
    }
    var STATUS_ITEM_SELECTOR = '[role^="menuitem"],[role="button"],button,[aria-haspopup="menu"]';
    function getTimedDurationItems(menu) {
      const items = [...menu.querySelectorAll('[role="menuitem"],button')];
      const marked = items.filter((node) => node.dataset.statusdurationsBound);
      if (marked.length === 5) return marked;
      const timed = items.filter((node) => {
        const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
        return text.startsWith("For ") && text !== "Forever";
      });
      return timed.length === 5 ? timed : [];
    }
    function normalizeText(text) {
      return String(text || "").replace(/\s+/g, " ").trim();
    }
    function findStatusItems(root, status) {
      const primary = [...root.querySelectorAll(STATUS_ITEM_SELECTOR)].filter((node) => statusFromText(normalizeText(node.textContent)) === status);
      const fallback = [...root.querySelectorAll('[class*="item"]')].filter((node) => exactStatusFromText(normalizeText(node.textContent)) === status);
      return [.../* @__PURE__ */ new Set([...primary, ...fallback])].filter((node) => !node.closest?.(".statusdurations-active-timer"));
    }
    function exactStatusFromText(text) {
      return { Idle: "idle", "Do Not Disturb": "dnd", Invisible: "invisible" }[text] || null;
    }
    function removeActiveTimerBadges() {
      for (const node of document.querySelectorAll(".statusdurations-active-timer")) {
        const item = node.parentElement;
        node.remove();
        if (!item) continue;
        item.style.paddingBottom = item.dataset.statusdurationsPadding || "";
        item.style.position = item.dataset.statusdurationsPosition || "";
        delete item.dataset.statusdurationsPadding;
        delete item.dataset.statusdurationsPosition;
      }
    }
    function findLabelTextNode(node) {
      if (typeof document === "undefined" || !document.createTreeWalker) return null;
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = normalizeText(walker.currentNode.textContent);
        if (text.startsWith("For ") && text !== "Forever") return walker.currentNode;
      }
      return null;
    }
    function format(minutes) {
      if (minutes < 60) return `${minutes} Minutes`;
      if (minutes % 1440 === 0) return `${minutes / 1440} Day${minutes === 1440 ? "" : "s"}`;
      if (minutes % 60 === 0) return `${minutes / 60} Hour${minutes === 60 ? "" : "s"}`;
      return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    }
    function countdownLabel(expiresAt) {
      const remaining = Math.max(0, expiresAt - Date.now());
      const totalSeconds = Math.ceil(remaining / 1e3);
      if (totalSeconds < 60) return `Ends in ${totalSeconds}s`;
      const totalMinutes = Math.ceil(totalSeconds / 60);
      if (totalMinutes < 60) return `Ends in ${totalMinutes}m`;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `Ends in ${hours}h ${minutes}m`;
    }
    function close() {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    }
    module2.exports = { Menu: Menu2, statusFromText, getTimedDurationItems, countdownLabel, findLabelTextNode, findStatusItems, normalizeText };
  }
});

// src/index.js
var { Settings, DEFAULTS } = require_settings();
var { StatusAdapter } = require_statusAdapter();
var { Timer } = require_timer();
var { Menu } = require_menu();
var StatusDurations = class {
  constructor(meta) {
    this.meta = meta;
  }
  start() {
    this.settings = new Settings(() => this.menu?.refresh());
    this.adapter = new StatusAdapter();
    this.adapter.start();
    this.timer = new Timer({ adapter: this.adapter, notify: (message) => BdApi.UI.showToast(message) });
    this.timer.start();
    this.menu = new Menu({ settings: this.settings, timer: this.timer });
    this.menu.start();
  }
  stop() {
    this.menu?.stop();
    this.timer?.stop();
    this.adapter?.stop();
  }
  getSettingsPanel() {
    return createSettingsPanel(this.settings);
  }
};
var PRESETS = { short: [5, 15, 30, 60, 120], work: [15, 30, 60, 120, 480], default: DEFAULTS };
function createSettingsPanel(settings) {
  const root = element("div", "sd-root");
  const style = document.createElement("style");
  style.textContent = styles;
  root.append(style);
  const panel = element("div", "sd-panel");
  panel.append(element("h3", "sd-section-title", "Duration options"), element("p", "sd-description", "Set the five duration choices shown for Idle, Do Not Disturb, and Invisible."));
  const rows = element("div", "sd-settings");
  const status = element("div", "sd-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const renderValues = (durations) => {
    rows.replaceChildren(...durations.map(createDurationRow));
    status.textContent = "";
  };
  const save = () => {
    const values = [...rows.querySelectorAll(".sd-duration-row")].map(readRow);
    const errors = validateDurations(values);
    for (const [index, rowNode] of [...rows.children].entries()) rowNode.classList.toggle("sd-invalid", errors.invalidIndexes.has(index));
    if (errors.message) {
      status.className = "sd-status sd-error";
      status.textContent = errors.message;
      return;
    }
    settings.setDurations(values);
    status.className = "sd-status";
    status.textContent = "";
  };
  rows.addEventListener("change", save);
  panel.append(rows, status);
  panel.append(element("h3", "sd-section-title sd-presets-title", "Quick setup"));
  const presets = element("div", "sd-presets");
  const presetCopy = element("div", "sd-setting-copy");
  presetCopy.append(element("div", "sd-setting-title", "Duration preset"), element("div", "sd-setting-note", "Replace all five options at once."));
  const actions = element("div", "sd-actions");
  for (const [key, label] of [["short", "Short breaks"], ["work", "Workday"], ["default", "Discord defaults"]]) {
    const button = element("button", "sd-preset", label);
    button.type = "button";
    button.dataset.preset = key;
    button.addEventListener("click", () => {
      settings.setDurations(PRESETS[key]);
      renderValues(PRESETS[key]);
    });
    actions.append(button);
  }
  presets.append(presetCopy, actions);
  panel.append(presets, element("p", "sd-footnote", "Options must be unique and between 1 minute and 3 days."));
  root.append(panel);
  renderValues(settings.durations);
  return root;
}
function createDurationRow(duration, index) {
  const editor = toEditorValue(duration);
  const row = element("div", "sd-duration-row");
  row.dataset.index = String(index);
  const identity = element("div", "sd-setting-copy");
  identity.append(element("div", "sd-setting-title", `Option ${index + 1}`));
  const controls = element("div", "sd-input-group");
  const input = element("input", "sd-duration-input");
  input.type = "number";
  input.min = "1";
  input.step = "1";
  input.value = String(editor.value);
  input.dataset.durationValue = "";
  input.setAttribute("aria-label", `Menu option ${index + 1} amount`);
  const select = element("select", "sd-duration-unit");
  select.dataset.durationUnit = "";
  select.setAttribute("aria-label", `Menu option ${index + 1} unit`);
  for (const [value, label] of [[1, "Minutes"], [60, "Hours"], [1440, "Days"]]) {
    const option = element("option", "", label);
    option.value = String(value);
    option.selected = editor.unit === value;
    select.append(option);
  }
  controls.append(input, select);
  row.append(identity, controls);
  return row;
}
function validateDurations(values) {
  const invalidIndexes = /* @__PURE__ */ new Set();
  values.forEach((value, index) => {
    if (!Number.isInteger(value) || value < 1 || value > 4320) invalidIndexes.add(index);
  });
  values.forEach((value, index) => {
    if (values.indexOf(value) !== values.lastIndexOf(value)) invalidIndexes.add(index);
  });
  const message = [...values].some((value) => !Number.isInteger(value) || value < 1 || value > 4320) ? "Use whole-number durations between 1 minute and 3 days." : new Set(values).size !== values.length ? "Each duration must be different." : "";
  return { message, invalidIndexes };
}
function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
function toEditorValue(minutes) {
  if (minutes % 1440 === 0) return { value: minutes / 1440, unit: 1440 };
  if (minutes % 60 === 0) return { value: minutes / 60, unit: 60 };
  return { value: minutes, unit: 1 };
}
function readRow(row) {
  return Math.round(Number(row.querySelector("[data-duration-value]").value) * Number(row.querySelector("[data-duration-unit]").value));
}
function parseDuration(value) {
  const text = String(value).trim().toLowerCase();
  if (!text) return NaN;
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(d(?:ays?)?|h(?:ours?)?|m(?:in(?:utes?)?)?)/g)];
  if (!matches.length || matches.map((match) => match[0]).join("").replace(/\s/g, "") !== text.replace(/\s/g, "")) return NaN;
  return Math.round(matches.reduce((total, match) => total + Number(match[1]) * (match[2].startsWith("d") ? 1440 : match[2].startsWith("h") ? 60 : 1), 0));
}
var styles = `.sd-root{max-width:740px;color:var(--text-normal);font-family:var(--font-primary)}.sd-section-title{margin:0 0 4px;color:var(--header-secondary);font-size:12px;font-weight:700;line-height:16px;letter-spacing:.02em;text-transform:uppercase}.sd-description,.sd-footnote{margin:0;color:var(--text-muted);font-size:13px;line-height:18px}.sd-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:24px;margin-top:12px;border-top:1px solid var(--background-modifier-accent)}.sd-duration-row{display:grid;grid-template-columns:76px minmax(0,1fr);align-items:center;gap:10px;min-height:50px;border-bottom:1px solid var(--background-modifier-accent)}.sd-setting-copy{display:grid;gap:2px}.sd-setting-title{color:var(--header-primary);font-size:14px;font-weight:500;line-height:18px}.sd-setting-note{color:var(--text-muted);font-size:13px;line-height:17px}.sd-input-group{display:grid;grid-template-columns:minmax(56px,82px) minmax(78px,1fr);gap:6px}.sd-duration-input,.sd-duration-unit{box-sizing:border-box;width:100%;height:34px;padding:6px 8px;border:0!important;border-radius:3px!important;background:var(--input-background)!important;color:var(--text-normal)!important;font:var(--font-primary)!important;font-size:14px!important}.sd-duration-input:focus,.sd-duration-unit:focus{outline:2px solid var(--brand-500);outline-offset:-2px}.sd-invalid .sd-duration-input,.sd-invalid .sd-duration-unit{outline:2px solid var(--status-danger);outline-offset:-2px}.sd-status{min-height:18px;padding-top:3px;color:var(--status-danger);font-size:12px;line-height:16px}.sd-presets-title{margin-top:16px}.sd-presets{display:grid;grid-template-columns:minmax(150px,1fr) auto;align-items:center;gap:20px;min-height:48px;border-bottom:1px solid var(--background-modifier-accent)}.sd-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.sd-preset{min-height:30px;border:0;border-radius:3px;padding:5px 10px;background:var(--button-secondary-background);color:var(--button-secondary-text);font:inherit;font-size:13px;font-weight:500;cursor:pointer}.sd-preset:hover{background:var(--button-secondary-background-hover,var(--background-modifier-hover))}.sd-footnote{margin-top:6px;font-size:12px;line-height:16px}@media(max-width:620px){.sd-settings{grid-template-columns:1fr}.sd-presets{grid-template-columns:1fr;gap:8px;padding:10px 0}.sd-actions{justify-content:flex-start}}`;
module.exports = StatusDurations;
module.exports.parseDuration = parseDuration;
module.exports.toEditorValue = toEditorValue;
module.exports.readRow = readRow;
module.exports.validateDurations = validateDurations;
