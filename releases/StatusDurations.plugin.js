/**
 * @name StatusDurations
 * @author ctrlcmdshft
 * @description Replace Discord's status duration choices with your own times.
 * @version 1.0.10
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
        return this.store?.settings?.status?.status?.value || "online";
      }
      set(status) {
        if (!this.store?.settings?.status?.status || !this.actions?.updateAsync) this.resolve();
        if (!this.store?.settings?.status?.status || !this.actions?.updateAsync) return false;
        this.actions.updateAsync("status", (data) => {
          data.status.value = status;
        }, 0);
        return true;
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
      return Boolean(active?.status && active.status !== currentStatus && now - Number(active.activatedAt || 0) > 2e3);
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
        this.boundItems = /* @__PURE__ */ new Map();
        this.over = this.over.bind(this);
      }
      start() {
        this.observer = new MutationObserver(() => this.schedule());
        this.observer.observe(document.body, { childList: true, subtree: true });
        document.addEventListener("pointerover", this.over, true);
        this.clock = window.setInterval(() => this.updateActiveTimerLabels(), 1e3);
        this.schedule();
      }
      stop() {
        this.observer?.disconnect();
        document.removeEventListener("pointerover", this.over, true);
        window.clearInterval(this.clock);
        this.clock = null;
        for (const [node, listener] of this.boundItems) {
          node.removeEventListener("click", listener, true);
          if (node.dataset.statusdurationsLabel) node.textContent = node.dataset.statusdurationsLabel;
          delete node.dataset.statusdurationsLabel;
        }
        for (const node of document.querySelectorAll(".statusdurations-active-timer")) {
          const item = node.parentElement;
          node.remove();
          if (item?.dataset.statusdurationsPadding) {
            item.style.paddingBottom = item.dataset.statusdurationsPadding;
            delete item.dataset.statusdurationsPadding;
          }
        }
        this.boundItems.clear();
      }
      refresh() {
        this.stop();
        this.start();
      }
      over(event) {
        const text = String(event.target?.closest?.('[role="menuitem"],button')?.textContent || "");
        this.lastStatus = statusFromText(text) || this.lastStatus;
      }
      schedule() {
        if (this.pending) return;
        this.pending = true;
        requestAnimationFrame(() => {
          this.pending = false;
          this.inject();
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
        node.dataset.statusdurationsLabel = node.textContent;
        node.textContent = `For ${format(minutes)}`;
        const listener = (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          event.stopPropagation();
          this.timer.activate(this.lastStatus, minutes);
          close();
        };
        node.addEventListener("click", listener, true);
        this.boundItems.set(node, listener);
      }
      decorateActiveTimer() {
        const active = this.timer.active();
        const visible = active?.expiresAt > Date.now() ? active : null;
        for (const node of document.querySelectorAll(".statusdurations-active-timer")) node.remove();
        if (!visible) return;
        for (const menu of document.querySelectorAll('[role="menu"]')) {
          const items = [...menu.querySelectorAll('[role="menuitem"],button')];
          const item = items.find((node) => statusFromText(String(node.textContent || "")) === visible.status);
          if (!item) continue;
          const note = document.createElement("div");
          note.className = "statusdurations-active-timer";
          note.dataset.expiresAt = String(visible.expiresAt);
          note.textContent = countdownLabel(visible.expiresAt);
          note.style.cssText = "position:absolute;left:40px;bottom:4px;padding:1px 6px;border-radius:999px;background:var(--background-modifier-hover);font-size:11px;line-height:15px;color:var(--text-muted);font-weight:600;white-space:nowrap;pointer-events:none;";
          item.style.position = "relative";
          item.dataset.statusdurationsPadding = item.style.paddingBottom;
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
    function getTimedDurationItems(menu) {
      const items = [...menu.querySelectorAll('[role="menuitem"],button')];
      const marked = items.filter((node) => node.dataset.statusdurationsLabel);
      if (marked.length === 5) return marked;
      const timed = items.filter((node) => {
        const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
        return text.startsWith("For ") && text !== "Forever";
      });
      return timed.length === 5 ? timed : [];
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
    module2.exports = { Menu: Menu2, statusFromText, getTimedDurationItems, countdownLabel };
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
    const root = document.createElement("div");
    const render = () => {
      root.innerHTML = `<style>${styles}</style><div class="sd-panel"><div class="sd-section-title"><span>STATUS DURATION CHOICES</span><i></i><b>\u2304</b></div><p class="sd-intro">Choose the five times that appear when you set Idle, Do Not Disturb, or Invisible. Your prior status returns when the timer ends.</p><div class="sd-settings">${this.settings.durations.map((duration, index) => row(duration, index)).join("")}</div><div class="sd-section-title"><span>QUICK SETUP</span><i></i></div><div class="sd-quick-row"><div><strong>Apply a ready-made set</strong><span>Replace all five choices at once.</span></div><div class="sd-actions"><button data-preset="short">Short breaks</button><button data-preset="work">Workday</button><button data-preset="default">Discord defaults</button></div></div><p class="sd-footnote">Each duration must be different and between 1 minute and 3 days.</p></div>`;
    };
    root.addEventListener("change", (event) => {
      if (!event.target.closest("[data-duration-value], [data-duration-unit]")) return;
      const values = [...root.querySelectorAll(".sd-duration-row")].map(readRow);
      const unique = new Set(values);
      if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 4320) || unique.size !== 5) {
        BdApi.UI.showToast("Use five different times between 1 minute and 3 days.", { type: "error" });
        render();
        return;
      }
      this.settings.setDurations(values);
      render();
    });
    root.addEventListener("click", (event) => {
      const preset = event.target.closest("[data-preset]")?.dataset.preset;
      if (!preset) return;
      this.settings.setDurations(PRESETS[preset]);
      render();
    });
    render();
    return root;
  }
};
var PRESETS = { short: [5, 15, 30, 60, 120], work: [15, 30, 60, 120, 480], default: DEFAULTS };
function row(duration, index) {
  const editor = toEditorValue(duration);
  return `<div class="sd-duration-row"><div class="sd-row-copy"><strong>Duration ${index + 1}</strong><span>${index === 0 ? "The first option shown in Discord\u2019s timed-status menu." : `The ${ordinal(index + 1)} option shown in Discord\u2019s timed-status menu.`}</span></div><div class="sd-control"><div class="sd-input-group"><input class="sd-duration-input" type="number" min="1" max="4320" value="${editor.value}" data-duration-value aria-label="Duration ${index + 1} amount"><select data-duration-unit aria-label="Duration ${index + 1} unit"><option value="1" ${editor.unit === 1 ? "selected" : ""}>Minutes</option><option value="60" ${editor.unit === 60 ? "selected" : ""}>Hours</option><option value="1440" ${editor.unit === 1440 ? "selected" : ""}>Days</option></select></div><small>${describe(duration)}</small></div></div>`;
}
function ordinal(value) {
  return ["first", "second", "third", "fourth", "fifth"][value - 1] || `${value}th`;
}
function toEditorValue(minutes) {
  if (minutes % 1440 === 0) return { value: minutes / 1440, unit: 1440 };
  if (minutes % 60 === 0) return { value: minutes / 60, unit: 60 };
  return { value: minutes, unit: 1 };
}
function readRow(row2) {
  return Math.round(Number(row2.querySelector("[data-duration-value]").value) * Number(row2.querySelector("[data-duration-unit]").value));
}
function parseDuration(value) {
  const text = String(value).trim().toLowerCase();
  if (!text) return NaN;
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(d(?:ays?)?|h(?:ours?)?|m(?:in(?:utes?)?)?)/g)];
  if (!matches.length || matches.map((match) => match[0]).join("").replace(/\s/g, "") !== text.replace(/\s/g, "")) return NaN;
  return Math.round(matches.reduce((total, match) => total + Number(match[1]) * (match[2].startsWith("d") ? 1440 : match[2].startsWith("h") ? 60 : 1), 0));
}
function describe(minutes) {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
var styles = `.sd-panel{max-width:680px;color:var(--text-normal)}.sd-section-title{display:flex;align-items:center;gap:12px;margin:0 0 14px;color:var(--text-muted);font-size:12px;font-weight:700}.sd-section-title i{height:1px;flex:1;background:var(--background-modifier-accent)}.sd-section-title b{font-size:17px;font-weight:400;line-height:12px;color:var(--text-normal)}.sd-intro,.sd-footnote{margin:0;color:var(--text-muted);font-size:13px;line-height:1.45}.sd-intro{margin:-3px 0 8px}.sd-settings{border-top:1px solid var(--background-modifier-accent);margin-bottom:28px}.sd-duration-row{display:grid;grid-template-columns:minmax(0,1fr) 250px;align-items:center;gap:22px;padding:18px 0;border-bottom:1px solid var(--background-modifier-accent)}.sd-row-copy{display:grid;gap:5px}.sd-row-copy strong,.sd-quick-row strong{font-size:14px;font-weight:600}.sd-row-copy span,.sd-quick-row span{color:var(--text-muted);font-size:13px;line-height:1.35}.sd-control{display:grid;gap:5px}.sd-input-group{display:grid;grid-template-columns:92px 1fr;gap:8px}.sd-duration-input,.sd-input-group select{box-sizing:border-box;width:100%;height:40px;padding:8px 10px;border:1px solid var(--background-modifier-accent)!important;border-radius:7px!important;background:var(--input-background)!important;color:var(--text-normal)!important;font:var(--font-primary)!important;font-size:14px!important;font-weight:500!important}.sd-duration-input:focus,.sd-input-group select:focus{border-color:var(--brand-500)!important;outline:0;box-shadow:0 0 0 1px var(--brand-500)}.sd-control small{color:var(--text-muted);font-size:12px}.sd-quick-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:22px;padding:0 0 18px;border-bottom:1px solid var(--background-modifier-accent)}.sd-quick-row>div:first-child{display:grid;gap:5px}.sd-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px}.sd-actions button{border:0;border-radius:4px;padding:8px 10px;background:var(--button-secondary-background);color:var(--button-secondary-text);font:inherit;font-size:12px;font-weight:600;cursor:pointer}.sd-actions button:hover{background:var(--button-secondary-background-hover,var(--background-modifier-hover))}.sd-footnote{margin-top:12px;font-size:12px}@media(max-width:620px){.sd-duration-row,.sd-quick-row{grid-template-columns:1fr;gap:10px}.sd-control{max-width:280px}.sd-actions{justify-content:flex-start}}`;
module.exports = StatusDurations;
module.exports.parseDuration = parseDuration;
module.exports.toEditorValue = toEditorValue;
module.exports.readRow = readRow;
