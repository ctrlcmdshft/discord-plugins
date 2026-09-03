/**
 * @name FocusProfiles
 * @author ctrlcmdshft
 * @description One-click focus modes for timed status, notification muting, and hidden channels.
 * @version 0.1.0
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
    var PLUGIN_NAME = "FocusProfiles";
    var DEFAULT_PROFILES = Object.freeze([
      { id: "work", name: "Work", status: "dnd", durationMinutes: 60, mutedChannelIds: [], hiddenChannelIds: [] },
      { id: "gaming", name: "Gaming", status: "online", durationMinutes: 0, mutedChannelIds: [], hiddenChannelIds: [] },
      { id: "away", name: "Away", status: "idle", durationMinutes: 120, mutedChannelIds: [], hiddenChannelIds: [] }
    ]);
    function normalizeChannelIds(value) {
      if (!Array.isArray(value)) return [];
      return [...new Set(value.map(String).filter((id) => /^\d{5,}$/.test(id)))];
    }
    function normalizeProfile(value, index) {
      const fallback = DEFAULT_PROFILES[index] || DEFAULT_PROFILES[0];
      const status = ["online", "idle", "dnd", "invisible"].includes(value?.status) ? value.status : fallback.status;
      const duration = Math.round(Number(value?.durationMinutes));
      return {
        id: /^[a-z0-9_-]+$/i.test(value?.id || "") ? value.id : `profile-${index + 1}`,
        name: String(value?.name || fallback.name).trim().slice(0, 32) || fallback.name,
        status,
        durationMinutes: Number.isFinite(duration) ? Math.min(Math.max(duration, 0), 4320) : fallback.durationMinutes,
        dndText: String(value?.dndText || "").slice(0, 128),
        enableMode: value?.enableMode === "scheduled" ? "scheduled" : "now",
        enableTime: normalizeTime(value?.enableTime, "09:00"),
        disableMode: value?.disableMode === "scheduled" ? "scheduled" : "manual",
        disableTime: normalizeTime(value?.disableTime, "17:00"),
        mutedGuildIds: normalizeChannelIds(value?.mutedGuildIds),
        hiddenGuildIds: normalizeChannelIds(value?.hiddenGuildIds)
      };
    }
    function normalizeTime(value, fallback) {
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || "")) ? value : fallback;
    }
    function normalizeSettings(value = {}) {
      const profiles = Array.isArray(value.profiles) && value.profiles.length ? value.profiles : DEFAULT_PROFILES;
      return { profiles: profiles.slice(0, 8).map(normalizeProfile), showToasts: value.showToasts !== false };
    }
    var SettingsStore2 = class {
      constructor({ onChange } = {}) {
        this.onChange = onChange;
        this.values = normalizeSettings(BdApi.Data.load(PLUGIN_NAME, "settings"));
      }
      get(key) {
        return this.values[key];
      }
      set(key, value) {
        this.values = normalizeSettings({ ...this.values, [key]: value });
        BdApi.Data.save(PLUGIN_NAME, "settings", this.values);
        this.onChange?.(this.values);
      }
      updateProfile(id, changes) {
        this.set("profiles", this.values.profiles.map((profile) => profile.id === id ? { ...profile, ...changes } : profile));
      }
    };
    module2.exports = { PLUGIN_NAME, DEFAULT_PROFILES, SettingsStore: SettingsStore2, normalizeProfile, normalizeSettings, normalizeTime };
  }
});

// src/statusAdapter.js
var require_statusAdapter = __commonJS({
  "src/statusAdapter.js"(exports2, module2) {
    var StatusAdapter2 = class {
      start() {
        this.store = BdApi.Webpack.getModule((module3) => module3?.getName?.() === "UserSettingsProtoStore", { first: true, searchExports: true });
        this.utils = BdApi.Webpack.getModule((module3) => module3?.ProtoClass?.typeName?.endsWith(".PreloadedUserSettings"), { first: true, searchExports: true });
      }
      stop() {
        this.store = null;
        this.utils = null;
      }
      currentStatus() {
        return this.store?.settings?.status?.status?.value || "online";
      }
      currentCustomStatus() {
        const custom = this.store?.settings?.status?.customStatus;
        if (!custom) return null;
        return { text: custom.text || "", emojiId: custom.emojiId || 0, emojiName: custom.emojiName || "", expiresAtMs: custom.expiresAtMs || 0, createdAtMs: custom.createdAtMs || 0 };
      }
      updateStatus(status, customStatus = void 0) {
        if (!this.utils?.updateAsync || !this.store?.settings?.status?.status) return false;
        this.utils.updateAsync("status", (setting) => {
          setting.status.value = status;
          if (customStatus !== void 0) setting.customStatus = { ...setting.customStatus || {}, ...customStatus };
        }, 0);
        return true;
      }
    };
    module2.exports = { StatusAdapter: StatusAdapter2 };
  }
});

// src/channelVisibility.js
var require_channelVisibility = __commonJS({
  "src/channelVisibility.js"(exports2, module2) {
    var ChannelVisibility2 = class {
      constructor() {
        this.hiddenIds = /* @__PURE__ */ new Set();
        this.observer = null;
        this.apply = this.apply.bind(this);
      }
      start() {
        this.observer = new MutationObserver(() => requestAnimationFrame(this.apply));
        this.observer.observe(document.body, { childList: true, subtree: true });
        this.apply();
      }
      stop() {
        this.observer?.disconnect();
        this.observer = null;
        this.setHidden([]);
      }
      setHidden(ids) {
        this.hiddenIds = new Set(ids.map(String));
        this.apply();
      }
      apply() {
        for (const node of document.querySelectorAll("[data-focusprofiles-hidden]")) {
          node.hidden = false;
          node.removeAttribute("data-focusprofiles-hidden");
        }
        for (const id of this.hiddenIds) {
          for (const node of document.querySelectorAll(`[data-list-item-id*="guildsnav___${cssEscape(id)}"]`)) {
            node.hidden = true;
            node.setAttribute("data-focusprofiles-hidden", "true");
          }
        }
      }
    };
    function cssEscape(value) {
      return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    }
    module2.exports = { ChannelVisibility: ChannelVisibility2 };
  }
});

// src/notificationAdapter.js
var require_notificationAdapter = __commonJS({
  "src/notificationAdapter.js"(exports2, module2) {
    var NotificationAdapter2 = class {
      start() {
        this.actions = BdApi.Webpack.getByKeys("updateGuildNotificationSettings") || BdApi.Webpack.getModule((module3) => typeof module3?.updateGuildNotificationSettings === "function", { first: true, searchExports: true });
        this.settingsStore = BdApi.Webpack.getByKeys("getGuildNotificationSettings") || BdApi.Webpack.getModule((module3) => typeof module3?.getGuildNotificationSettings === "function", { first: true, searchExports: true });
      }
      stop() {
        this.actions = null;
        this.settingsStore = null;
      }
      getMuted(guildId) {
        if (typeof this.settingsStore?.getGuildNotificationSettings !== "function") return null;
        try {
          const settings = this.settingsStore.getGuildNotificationSettings(guildId);
          return typeof settings?.muted === "boolean" ? settings.muted : null;
        } catch {
          return null;
        }
      }
      setMuted(guildId, muted) {
        if (typeof this.actions?.updateGuildNotificationSettings !== "function") return false;
        try {
          this.actions.updateGuildNotificationSettings(guildId, { muted: Boolean(muted) });
          return true;
        } catch {
          return false;
        }
      }
    };
    module2.exports = { NotificationAdapter: NotificationAdapter2 };
  }
});

// src/profileController.js
var require_profileController = __commonJS({
  "src/profileController.js"(exports2, module2) {
    var { PLUGIN_NAME } = require_settings();
    var ACTIVE_KEY = "activeProfile";
    var ProfileController2 = class {
      constructor({ settings, statusAdapter, visibility, notifications, notify }) {
        Object.assign(this, { settings, statusAdapter, visibility, notifications, notify });
        this.timeout = null;
      }
      start() {
        this.refreshSchedules();
        const active = BdApi.Data.load(PLUGIN_NAME, ACTIVE_KEY);
        if (!active) return;
        if (active.expiresAt && active.expiresAt <= Date.now()) return this.clear({ restoreStatus: true, silent: true });
        this.applyState(active);
        if (active.expiresAt) this.schedule(active.expiresAt);
      }
      stop() {
        window.clearTimeout(this.timeout);
        this.timeout = null;
        for (const timer of this.scheduleTimers?.values?.() || []) window.clearTimeout(timer);
        this.scheduleTimers?.clear?.();
        this.visibility.setHidden([]);
      }
      refreshSchedules() {
        if (!this.scheduleTimers) this.scheduleTimers = /* @__PURE__ */ new Map();
        for (const timer of this.scheduleTimers.values()) window.clearTimeout(timer);
        this.scheduleTimers.clear();
        for (const profile of this.settings.get("profiles")) if (profile.enableMode === "scheduled") this.scheduleStart(profile);
      }
      getActive() {
        return BdApi.Data.load(PLUGIN_NAME, ACTIVE_KEY) || null;
      }
      activate(profileId) {
        const profile = this.settings.get("profiles").find((item) => item.id === profileId);
        if (!profile) return false;
        const previous = this.getActive();
        if (previous) this.undoMuted(previous);
        const state = {
          profileId: profile.id,
          previousStatus: this.statusAdapter.currentStatus(),
          previousCustomStatus: null,
          status: profile.status,
          customStatus: profile.status === "dnd" && profile.dndText ? { text: profile.dndText } : null,
          mutedGuildIds: profile.mutedGuildIds,
          hiddenGuildIds: profile.hiddenGuildIds,
          previousMuteStates: {},
          expiresAt: earliestTime(profile.durationMinutes ? Date.now() + profile.durationMinutes * 6e4 : null, profile.disableMode === "scheduled" ? nextOccurrence(profile.disableTime) : null)
        };
        for (const guildId of state.mutedGuildIds) {
          const muted = this.notifications.getMuted(guildId);
          if (muted === false) state.previousMuteStates[guildId] = false;
        }
        if (state.customStatus) state.previousCustomStatus = this.statusAdapter.currentCustomStatus();
        this.applyState(state);
        BdApi.Data.save(PLUGIN_NAME, ACTIVE_KEY, state);
        if (state.expiresAt) this.schedule(state.expiresAt);
        this.notify(`${profile.name} focus profile enabled${state.expiresAt ? ` for ${formatMinutes(profile.durationMinutes)}` : ""}.`);
        return true;
      }
      clear({ restoreStatus = true, silent = false } = {}) {
        const active = this.getActive();
        window.clearTimeout(this.timeout);
        this.timeout = null;
        this.visibility.setHidden([]);
        if (!active) return;
        this.undoMuted(active);
        if (restoreStatus && active.previousStatus && this.statusAdapter.currentStatus() === active.status) this.statusAdapter.updateStatus(active.previousStatus, active.previousCustomStatus || { text: "", emojiId: 0, emojiName: "", expiresAtMs: 0, createdAtMs: 0 });
        BdApi.Data.delete?.(PLUGIN_NAME, ACTIVE_KEY);
        if (!silent) this.notify("Focus profile cleared.");
      }
      applyState(state) {
        this.visibility.setHidden(state.hiddenGuildIds || []);
        for (const channelId of Object.keys(state.previousMuteStates || {})) this.notifications.setMuted(channelId, true);
        if (state.status) this.statusAdapter.updateStatus(state.status, state.customStatus || void 0);
      }
      undoMuted(state) {
        for (const channelId of Object.keys(state.previousMuteStates || {})) this.notifications.setMuted(channelId, false);
      }
      schedule(expiresAt) {
        window.clearTimeout(this.timeout);
        this.timeout = window.setTimeout(() => this.clear({ restoreStatus: true, silent: false }), Math.max(0, expiresAt - Date.now()));
      }
      scheduleStart(profile) {
        const runAt = nextOccurrence(profile.enableTime);
        const timer = window.setTimeout(() => {
          this.activate(profile.id);
          const current = this.settings.get("profiles").find((item) => item.id === profile.id);
          if (current?.enableMode === "scheduled") this.scheduleStart(current);
        }, Math.max(0, runAt - Date.now()));
        this.scheduleTimers.set(profile.id, timer);
      }
    };
    function formatMinutes(minutes) {
      return minutes < 60 ? `${minutes} min` : minutes % 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes / 60} hour${minutes === 60 ? "" : "s"}`;
    }
    function nextOccurrence(timeValue, now = /* @__PURE__ */ new Date()) {
      const [hours, minutes] = String(timeValue).split(":").map(Number);
      if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);
      if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
      return target.getTime();
    }
    function earliestTime(...times) {
      const valid = times.filter((time) => Number.isFinite(time));
      return valid.length ? Math.min(...valid) : null;
    }
    module2.exports = { ProfileController: ProfileController2, formatMinutes, nextOccurrence, earliestTime };
  }
});

// src/menuInjector.js
var require_menuInjector = __commonJS({
  "src/menuInjector.js"(exports2, module2) {
    var MenuInjector2 = class {
      constructor({ settings, controller }) {
        this.settings = settings;
        this.controller = controller;
        this.observer = null;
        this.pending = false;
      }
      start() {
        this.observer = new MutationObserver(() => this.schedule());
        this.observer.observe(document.body, { childList: true, subtree: true });
        this.schedule();
      }
      stop() {
        this.observer?.disconnect();
        this.observer = null;
        removeItems();
      }
      refresh() {
        removeItems();
        this.schedule();
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
        for (const menu of document.querySelectorAll('[role="menu"]')) {
          if (menu.querySelector(".focusprofiles-menu-item") || !isAccountPopout(menu)) continue;
          const anchor = findStatusAnchor(menu);
          if (!anchor) continue;
          const active = this.controller.getActive();
          const group = document.createElement("div");
          group.className = "focusprofiles-menu-item focusprofiles-menu-group";
          group.setAttribute("role", "group");
          group.append(createLabel(anchor, "Focus Profiles"));
          for (const profile of this.settings.get("profiles")) group.append(this.createItem(anchor, profile, active?.profileId === profile.id));
          if (active) group.append(this.createClearItem(anchor));
          anchor.before(group);
        }
      }
      createItem(template, profile, active) {
        const node = cloneMenuItem(template);
        node.textContent = `${active ? "\u2713 " : ""}${profile.name}`;
        node.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.controller.activate(profile.id);
          closeMenu();
        });
        return node;
      }
      createClearItem(template) {
        const node = cloneMenuItem(template);
        node.textContent = "Clear Focus Profile";
        node.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.controller.clear();
          closeMenu();
        });
        return node;
      }
    };
    function isAccountPopout(menu) {
      const text = String(menu.textContent || "");
      return text.includes("Set Status") && (text.includes("Set Custom Status") || text.includes("Switch Accounts"));
    }
    function findStatusAnchor(menu) {
      return [...menu.querySelectorAll('[role="menuitem"], button')].find((node) => String(node.textContent || "").replace(/\s+/g, " ").trim().startsWith("Set Status"));
    }
    function cloneMenuItem(template) {
      const node = template.cloneNode(true);
      node.classList.add("focusprofiles-menu-item");
      node.removeAttribute("id");
      return node;
    }
    function createLabel(template, text) {
      const node = cloneMenuItem(template);
      node.setAttribute("aria-disabled", "true");
      node.style.pointerEvents = "none";
      node.style.opacity = "0.7";
      node.style.fontSize = "12px";
      node.textContent = text;
      return node;
    }
    function removeItems() {
      document.querySelectorAll(".focusprofiles-menu-item").forEach((node) => node.remove());
    }
    function closeMenu() {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    }
    module2.exports = { MenuInjector: MenuInjector2, isAccountPopout };
  }
});

// src/settingsPanel.js
var require_settingsPanel = __commonJS({
  "src/settingsPanel.js"(exports2, module2) {
    function createSettingsPanel2({ settings, controller, getCurrentServer, describeServer }) {
      const root = document.createElement("div");
      root.className = "focusprofiles-settings";
      const render = () => {
        const profiles = settings.get("profiles");
        const active = controller.getActive();
        const activeProfile = profiles.find((profile) => profile.id === active?.profileId);
        root.innerHTML = `<style>${styles()}</style>
      <div class="fp-header"><div><h2>Focus Profiles</h2><p>Choose a profile from Discord's account popout. Each profile can change your status, optionally end on a timer, mute channels, and hide channels locally.</p></div>${activeProfile ? `<button class="fp-button fp-secondary" data-clear>Clear ${escape(activeProfile.name)}</button>` : ""}</div>
      <div class="fp-active">${activeProfile ? `Active now: <strong>${escape(activeProfile.name)}</strong>${active.expiresAt ? ` \u2014 ends ${escape(time(active.expiresAt))}` : ""}` : "No profile is active."}</div>
      <div class="fp-list">${profiles.map((profile) => renderProfile(profile, profiles.length, describeServer, active?.profileId)).join("")}</div>
      ${profiles.length < 8 ? `<button class="fp-button fp-secondary fp-add" data-add-profile>+ Add profile</button>` : ""}`;
      };
      root.addEventListener("change", (event) => {
        const timeControl = event.target.closest("[data-time-control]");
        if (timeControl) {
          const [id2, field2] = timeControl.dataset.timeControl.split(":");
          const text = timeControl.querySelector(".fp-time-input").value;
          const period = timeControl.querySelector(".fp-time-period").value;
          const value = timeFrom12(text, period);
          if (value) settings.updateProfile(id2, { [field2]: value });
          render();
          return;
        }
        const input = event.target.closest("[data-field]");
        if (!input) return;
        const [id, field] = input.dataset.field.split(":");
        settings.updateProfile(id, { [field]: input.value });
        render();
      });
      root.addEventListener("click", (event) => {
        if (event.target.closest("[data-clear]")) {
          controller.clear();
          render();
          return;
        }
        if (event.target.closest("[data-add-profile]")) {
          addProfile(settings);
          render();
          return;
        }
        const enable = event.target.closest("[data-enable]");
        if (enable) {
          controller.activate(enable.dataset.enable);
          render();
          return;
        }
        const remove = event.target.closest("[data-remove-profile]");
        if (remove) {
          settings.set("profiles", settings.get("profiles").filter((profile) => profile.id !== remove.dataset.removeProfile));
          render();
          return;
        }
        const add = event.target.closest("[data-add-current]");
        if (add) {
          addCurrent(settings, add.dataset.addCurrent, getCurrentServer());
          render();
          return;
        }
        const removeChannel = event.target.closest("[data-remove-channel]");
        if (removeChannel) {
          const [profileId, field, channelId] = removeChannel.dataset.removeChannel.split(":");
          const profile = settings.get("profiles").find((item) => item.id === profileId);
          settings.updateProfile(profileId, { [field]: profile[field].filter((id) => id !== channelId) });
          render();
        }
      });
      render();
      return root;
    }
    function renderProfile(profile, count, describeServer, activeId) {
      const isActive = profile.id === activeId;
      return `<section class="fp-card ${isActive ? "is-active" : ""}"><div class="fp-card-top"><div class="fp-fields"><label>Name<input data-field="${escape(profile.id)}:name" value="${escape(profile.name)}"></label><label>Status<select data-field="${escape(profile.id)}:status">${["online", "idle", "dnd", "invisible"].map((status) => `<option value="${status}" ${profile.status === status ? "selected" : ""}>${label(status)}</option>`).join("")}</select></label><label>Timer (minutes)<input type="number" min="0" max="4320" data-field="${escape(profile.id)}:durationMinutes" value="${profile.durationMinutes}"></label></div><div class="fp-card-actions">${isActive ? '<span class="fp-live">Active</span>' : ""}<button class="fp-button" data-enable="${escape(profile.id)}">${isActive ? "Reapply" : "Enable"}</button>${count > 1 ? `<button class="fp-icon" title="Delete profile" data-remove-profile="${escape(profile.id)}">\xD7</button>` : ""}</div></div>${profile.status === "dnd" ? `<label class="fp-dnd-text">DND message <input maxlength="128" placeholder="Optional message shown with your DND status" data-field="${escape(profile.id)}:dndText" value="${escape(profile.dndText)}"></label>` : ""}<p class="fp-timer-note">Use 0 to keep the profile on until you clear it. A scheduled stop takes priority if it comes first.</p><div class="fp-schedule">${scheduleControl("Turn on", "enable", profile, "Now", "At a time")}${scheduleControl("Turn off", "disable", profile, "Manually", "At a time")}</div><div class="fp-rules">${rule("Mute server notifications", "mutedGuildIds", profile, describeServer)}${rule("Hide server from sidebar", "hiddenGuildIds", profile, describeServer)}</div></section>`;
    }
    function scheduleControl(title, kind, profile, defaultLabel, scheduleLabel) {
      const modeField = `${kind}Mode`;
      const timeField = `${kind}Time`;
      const clock = timeTo12(profile[timeField]);
      return `<div class="fp-schedule-control"><span>${title}</span><select data-field="${escape(profile.id)}:${modeField}"><option value="${kind === "enable" ? "now" : "manual"}" ${profile[modeField] === (kind === "enable" ? "now" : "manual") ? "selected" : ""}>${defaultLabel}</option><option value="scheduled" ${profile[modeField] === "scheduled" ? "selected" : ""}>${scheduleLabel}</option></select>${profile[modeField] === "scheduled" ? `<span class="fp-time" data-time-control="${escape(profile.id)}:${timeField}"><input class="fp-time-input" aria-label="Time" inputmode="numeric" maxlength="5" value="${clock.time}"><select class="fp-time-period" aria-label="AM or PM"><option ${clock.period === "AM" ? "selected" : ""}>AM</option><option ${clock.period === "PM" ? "selected" : ""}>PM</option></select></span>` : ""}</div>`;
    }
    function rule(title, field, profile, describeServer) {
      const ids = profile[field];
      const note = field === "mutedGuildIds" ? "Silences notifications for the whole server while active. The plugin restores the old setting when it ends." : "Removes this server icon from your sidebar on this computer only. Notifications are unchanged.";
      return `<div class="fp-rule"><div class="fp-rule-top"><strong>${title}</strong><button class="fp-link" data-add-current="${escape(profile.id)}:${field}">Add current server</button></div><p class="fp-rule-note">${note}</p><div class="fp-chips">${ids.length ? ids.map((id) => `<span class="fp-chip">${escape(describeServer(id))}<button title="Remove" data-remove-channel="${escape(profile.id)}:${field}:${escape(id)}">\xD7</button></span>`).join("") : '<span class="fp-empty">No servers added</span>'}</div></div>`;
    }
    function addCurrent(settings, encoded, server) {
      if (!server?.id) {
        BdApi.UI.showToast("Open a channel in the server you want to add first.", { type: "error" });
        return;
      }
      const [profileId, field] = encoded.split(":");
      const profile = settings.get("profiles").find((item) => item.id === profileId);
      settings.updateProfile(profileId, { [field]: [.../* @__PURE__ */ new Set([...profile[field], server.id])] });
    }
    function addProfile(settings) {
      const profiles = settings.get("profiles");
      const id = `profile-${Date.now()}`;
      settings.set("profiles", [...profiles, { id, name: "New Profile", status: "online", durationMinutes: 0, dndText: "", enableMode: "now", enableTime: "09:00", disableMode: "manual", disableTime: "17:00", mutedGuildIds: [], hiddenGuildIds: [] }]);
    }
    function label(status) {
      return { online: "Online", idle: "Idle", dnd: "Do Not Disturb", invisible: "Invisible" }[status];
    }
    function time(value) {
      return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    function timeTo12(value) {
      const [hour, minute] = String(value || "09:00").split(":").map(Number);
      return { time: `${hour % 12 || 12}:${String(minute || 0).padStart(2, "0")}`, period: hour < 12 ? "AM" : "PM" };
    }
    function timeFrom12(value, period) {
      const match = String(value).trim().match(/^(1[0-2]|0?[1-9]):([0-5]\d)$/);
      if (!match) return null;
      let hour = Number(match[1]) % 12;
      if (period === "PM") hour += 12;
      return `${String(hour).padStart(2, "0")}:${match[2]}`;
    }
    function escape(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
    }
    function styles() {
      return `
  .focusprofiles-settings{max-width:920px;color:var(--text-normal);display:grid;gap:16px;font-family:var(--font-primary)}
  .fp-header{display:flex;justify-content:space-between;gap:24px;align-items:start;padding:4px 2px}.fp-header h2{margin:0 0 6px;font-size:20px;letter-spacing:-.01em}.fp-header p,.fp-timer-note,.fp-empty{margin:0;color:var(--text-muted);font-size:12px;line-height:1.45}.fp-header p{max-width:650px}
  .fp-active{padding:11px 13px;border-radius:8px;border:1px solid color-mix(in srgb,var(--brand-500) 38%,transparent);background:linear-gradient(90deg,color-mix(in srgb,var(--brand-500) 17%,transparent),var(--background-secondary));font-size:13px}.fp-active strong{color:var(--header-primary)}
  .fp-list{display:grid;gap:10px}.fp-card{padding:15px;border-radius:10px;border:1px solid var(--background-modifier-accent);background:linear-gradient(135deg,var(--background-secondary),var(--background-secondary-alt,var(--background-secondary)));box-shadow:0 2px 8px rgba(0,0,0,.08);transition:border-color 150ms ease,box-shadow 150ms ease}.fp-card:hover{border-color:color-mix(in srgb,var(--brand-500) 42%,var(--background-modifier-accent))}.fp-card.is-active{border-color:var(--brand-500);box-shadow:0 0 0 1px color-mix(in srgb,var(--brand-500) 28%,transparent),0 8px 20px rgba(0,0,0,.12)}
  .fp-card-top{display:flex;gap:12px;justify-content:space-between}.fp-fields{display:flex;flex-wrap:wrap;gap:10px}.fp-fields label{display:grid;gap:5px;color:var(--text-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.035em}.fp-fields input,.fp-fields select{min-width:128px;box-sizing:border-box;padding:8px 9px;border:1px solid var(--background-modifier-accent);border-radius:6px;background:var(--input-background);color:var(--text-normal);font:inherit;font-size:13px;font-weight:500;text-transform:none;letter-spacing:normal}.fp-fields input:focus,.fp-fields select:focus{outline:2px solid color-mix(in srgb,var(--brand-500) 55%,transparent);outline-offset:1px}
  .fp-card-actions{display:flex;gap:7px;align-items:end}.fp-button,.fp-icon,.fp-link,.fp-chip button{border:0;cursor:pointer;font:inherit}.fp-button{padding:8px 12px;border-radius:6px;background:var(--brand-500);color:#fff;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.18);transition:filter 120ms ease,transform 120ms ease}.fp-button:hover{filter:brightness(1.08);transform:translateY(-1px)}.fp-secondary{background:var(--button-secondary-background);color:var(--button-secondary-text)}.fp-icon{width:32px;height:32px;border-radius:6px;background:var(--button-secondary-background);color:var(--text-normal);font-size:21px;line-height:1}.fp-icon:hover{background:var(--button-danger-background,#da373c);color:#fff}.fp-live{align-self:center;padding:4px 7px;border-radius:999px;background:color-mix(in srgb,var(--status-positive) 18%,transparent);color:var(--status-positive);font-size:11px;font-weight:700}.fp-dnd-text{display:grid;gap:5px;margin-top:12px;color:var(--text-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.035em}.fp-dnd-text input{box-sizing:border-box;width:100%;padding:9px;border:1px solid var(--background-modifier-accent);border-radius:6px;background:var(--input-background);color:var(--text-normal);font:inherit;font-size:13px;font-weight:500;text-transform:none;letter-spacing:normal}.fp-timer-note{margin:11px 0 12px}
  .fp-schedule{display:flex;gap:8px;margin:0 0 12px}.fp-schedule-control{display:flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid var(--background-modifier-accent);border-radius:7px;background:var(--background-tertiary);font-size:12px;font-weight:600}.fp-schedule-control span{color:var(--text-muted)}.fp-schedule-control select{border:0;background:transparent;color:var(--text-normal);font:inherit;font-size:12px;font-weight:600}.fp-time{display:flex;align-items:center;gap:2px;padding-left:5px;border-left:1px solid var(--background-modifier-accent)}.fp-time-input{width:48px;border:0;background:transparent;color:var(--text-normal);font:inherit;font-size:12px;font-weight:700}.fp-time-input:focus{outline:0;text-decoration:underline}.fp-time-period{width:36px}.fp-rules{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.fp-rule{padding:10px;border-radius:7px;background:var(--background-tertiary);border:1px solid transparent}.fp-rule:hover{border-color:var(--background-modifier-accent)}.fp-rule-top{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:12px}.fp-rule-note{margin:5px 0 0;color:var(--text-muted);font-size:11px;line-height:1.35}.fp-link{padding:2px 0;background:transparent;color:var(--text-link);font-size:12px;font-weight:600}.fp-link:hover{text-decoration:underline}.fp-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px;min-height:20px}.fp-chip{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:4px 5px 4px 8px;border-radius:999px;background:var(--background-modifier-hover);font-size:11px;font-weight:500}.fp-chip button{width:17px;height:17px;border-radius:50%;background:transparent;color:var(--text-muted);font-size:15px;line-height:13px}.fp-chip button:hover{background:var(--background-modifier-active);color:var(--text-normal)}.fp-add{justify-self:start;padding-inline:14px}@media(max-width:650px){.fp-header,.fp-card-top{display:grid}.fp-schedule,.fp-rules{display:grid;grid-template-columns:1fr}.fp-card-actions{justify-content:start}.fp-header .fp-button{justify-self:start}}
`;
    }
    module2.exports = { createSettingsPanel: createSettingsPanel2 };
  }
});

// src/index.js
var { SettingsStore } = require_settings();
var { StatusAdapter } = require_statusAdapter();
var { ChannelVisibility } = require_channelVisibility();
var { NotificationAdapter } = require_notificationAdapter();
var { ProfileController } = require_profileController();
var { MenuInjector } = require_menuInjector();
var { createSettingsPanel } = require_settingsPanel();
var FocusProfiles = class {
  constructor(meta) {
    this.meta = meta;
  }
  start() {
    this.status = new StatusAdapter();
    this.status.start();
    this.visibility = new ChannelVisibility();
    this.visibility.start();
    this.notifications = new NotificationAdapter();
    this.notifications.start();
    this.settings = new SettingsStore({ onChange: () => {
      this.menu?.refresh();
      this.controller?.refreshSchedules();
    } });
    this.controller = new ProfileController({ settings: this.settings, statusAdapter: this.status, visibility: this.visibility, notifications: this.notifications, notify: (message) => this.notify(message) });
    this.controller.start();
    this.menu = new MenuInjector({ settings: this.settings, controller: this.controller });
    this.menu.start();
    this.notify("Focus Profiles loaded. Open your status menu to switch profiles.");
  }
  stop() {
    this.menu?.stop();
    this.controller?.stop();
    this.notifications?.stop();
    this.visibility?.stop();
    this.status?.stop();
  }
  getSettingsPanel() {
    const selected = BdApi.Webpack.getByKeys("getChannelId");
    const channels = BdApi.Webpack.getByKeys("getChannel", "getDMFromUserId");
    const guilds = BdApi.Webpack.getByKeys("getGuild", "getGuilds");
    return createSettingsPanel({
      settings: this.settings,
      controller: this.controller,
      getCurrentServer: () => {
        const channel = channels?.getChannel?.(selected?.getChannelId?.());
        const id = channel?.guild_id;
        return id ? { id, name: guilds?.getGuild?.(id)?.name } : null;
      },
      describeServer: (id) => guilds?.getGuild?.(id)?.name || `Server ${id}`
    });
  }
  notify(message) {
    if (this.settings?.get("showToasts") !== false) BdApi.UI.showToast(message);
  }
};
module.exports = FocusProfiles;
