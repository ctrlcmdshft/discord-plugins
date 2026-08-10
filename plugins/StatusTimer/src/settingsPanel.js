const {DEFAULT_SETTINGS, parsePresetTextDetailed} = require("./settings");
const {formatClockTime, formatMinutes} = require("./manualStatusTimer");

const STATUS_SECTIONS = [
  {kind: "idle", title: "Idle"},
  {kind: "dnd", title: "Do Not Disturb"},
  {kind: "invisible", title: "Invisible"}
];

function createSettingsPanel({settings, manualTimer}) {
  const root = document.createElement("div");
  root.className = "awaytimer-panel";
  let message = "";
  const saveTimers = new Map();

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
        ${STATUS_SECTIONS.map(({kind, title}) => renderPresetSection(kind, title, settings.get(`${kind}Presets`))).join("")}
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
      manualTimer.cancel({restore: true});
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
      const {presets, invalidCount} = parsePresetTextDetailed(input.value);
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
  const remainingMinutes = Math.max(1, Math.ceil(activeTimer.remainingMs / 60000));
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
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

module.exports = {
  createSettingsPanel
};
