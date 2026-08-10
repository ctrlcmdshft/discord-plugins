const {DEFAULT_SETTINGS, parsePresetTextDetailed} = require("./settings");
const {formatClockTime, formatMinutes} = require("./manualStatusTimer");

function createSettingsPanel({settings, manualTimer}) {
  const root = document.createElement("div");
  root.className = "awaytimer-panel";
  let message = "";

  const render = () => {
    const activeTimer = manualTimer.getActiveTimer();
    root.innerHTML = `
      <style>
        .awaytimer-panel { color: var(--text-normal); display: grid; gap: 14px; padding: 2px 0 8px; }
        .awaytimer-header { display: grid; gap: 4px; }
        .awaytimer-grid { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 14px; align-items: start; }
        .awaytimer-section { display: grid; gap: 10px; }
        .awaytimer-card { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--background-modifier-accent, rgba(255, 255, 255, 0.1)); border-radius: 8px; background: var(--background-secondary, rgba(255, 255, 255, 0.04)); }
        .awaytimer-title { font-size: 15px; font-weight: 700; color: var(--header-primary, #f2f3f5); }
        .awaytimer-note { color: var(--text-muted); font-size: 12px; line-height: 1.35; }
        .awaytimer-buttons { display: flex; flex-wrap: wrap; gap: 6px; }
        .awaytimer-button { min-height: 32px; border: 0; border-radius: 6px; padding: 6px 10px; background: var(--brand-500, #5865f2); color: white; cursor: pointer; font-weight: 700; font-size: 13px; }
        .awaytimer-button:hover { filter: brightness(1.08); }
        .awaytimer-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .awaytimer-button.secondary { min-width: 106px; background: var(--brand-500, #5865f2); color: white; }
        .awaytimer-button.neutral { background: var(--button-secondary-background, #4e5058); color: var(--button-secondary-text, #fff); }
        .awaytimer-field { display: grid; gap: 6px; }
        .awaytimer-input { width: 100%; box-sizing: border-box; border: 1px solid var(--brand-500, #5865f2); border-radius: 6px; padding: 10px 12px; background: var(--input-background, #1e1f22); color: var(--text-normal, #f2f3f5); font: inherit; font-size: 15px; box-shadow: inset 0 0 0 1px rgba(88, 101, 242, 0.25); }
        .awaytimer-input:focus { outline: 2px solid rgba(88, 101, 242, 0.55); outline-offset: 1px; }
        .awaytimer-status { min-height: 16px; color: var(--text-positive, #23a55a); font-size: 12px; font-weight: 600; }
        .awaytimer-active { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 8px; background: var(--background-secondary, rgba(255, 255, 255, 0.04)); border: 1px solid var(--background-modifier-accent, rgba(255, 255, 255, 0.1)); }
        .awaytimer-setting { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; align-items: center; }
        .awaytimer-settings { display: grid; gap: 12px; padding-top: 2px; }
        .awaytimer-switch { position: relative; width: 42px; height: 24px; border: 0; border-radius: 999px; background: var(--background-modifier-accent, #4e5058); cursor: pointer; }
        .awaytimer-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 140ms ease; }
        .awaytimer-switch.is-on { background: var(--brand-500, #5865f2); }
        .awaytimer-switch.is-on::after { transform: translateX(18px); }
        @media (max-width: 720px) { .awaytimer-grid { grid-template-columns: 1fr; } }
      </style>
      <div class="awaytimer-header">
        <div class="awaytimer-title">Status Timers</div>
        <div class="awaytimer-note">Replace Discord's timed status choices with editable presets for Idle and Do Not Disturb.</div>
      </div>
      ${activeTimer ? renderActiveTimer(activeTimer) : ""}
      <div class="awaytimer-grid">
        ${renderPresetSection("idle", "Idle Presets", settings.get("idlePresets"), message)}
        ${renderPresetSection("dnd", "Do Not Disturb Presets", settings.get("dndPresets"), message)}
      </div>
      <div class="awaytimer-settings">
        ${renderSwitch("restoreManualTimersToOnline", "Timers Return To Online", "When a custom status timer ends, set your status back to Online instead of restoring the previous status.", settings.get("restoreManualTimersToOnline"))}
        ${renderSwitch("showToasts", "Show Toasts", "Shows a small notice when StatusTimer changes your status.", settings.get("showToasts"))}
      </div>
    `;
  };

  root.addEventListener("click", (event) => {
    const minutesButton = event.target.closest("[data-minutes]");
    if (minutesButton) manualTimer.setStatusForMinutes(minutesButton.dataset.statusKind, minutesButton.dataset.minutes);

    if (event.target.closest("[data-save-presets]")) {
      const statusKind = event.target.closest("[data-save-presets]").dataset.statusKind;
      const input = root.querySelector(`[data-preset-input="${statusKind}"]`);
      const {presets, invalidCount} = parsePresetTextDetailed(input.value);
      settings.set(`${statusKind}Presets`, presets);
      message = `Saved ${labelStatusKind(statusKind)} presets.`;
      if (invalidCount) message += ` Ignored ${invalidCount} invalid value${invalidCount === 1 ? "" : "s"}.`;
      render();
    }

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

function renderPresetSection(statusKind, title, presets, message) {
  return `
    <div class="awaytimer-card">
      <div class="awaytimer-field">
        <label class="awaytimer-title">${escapeAttribute(title)}</label>
        <div class="awaytimer-note">Minutes, separated by commas. Defaults: 15, 60, 480, 1440, 4320.</div>
        <input class="awaytimer-input" data-preset-input="${escapeAttribute(statusKind)}" value="${escapeAttribute(presets.join(", "))}" />
      </div>
      <div class="awaytimer-buttons">
        ${presets.map((minutes) => `
          <button class="awaytimer-button" data-status-kind="${escapeAttribute(statusKind)}" data-minutes="${minutes}">${formatMinutes(minutes)}</button>
        `).join("")}
      </div>
      <div class="awaytimer-actions">
        <button class="awaytimer-button secondary" data-status-kind="${escapeAttribute(statusKind)}" data-save-presets>Save Presets</button>
        <button class="awaytimer-button neutral" data-status-kind="${escapeAttribute(statusKind)}" data-reset-presets>Reset Presets</button>
      </div>
      <div class="awaytimer-status">${escapeAttribute(message)}</div>
    </div>
  `;
}

function labelStatusKind(statusKind) {
  return statusKind === "dnd" ? "Do Not Disturb" : "Idle";
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
