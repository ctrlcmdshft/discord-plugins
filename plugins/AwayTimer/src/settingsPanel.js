const {DEFAULT_SETTINGS, parsePresetText} = require("./settings");
const {formatMinutes} = require("./manualStatusTimer");

function createSettingsPanel({settings, manualTimer}) {
  const root = document.createElement("div");
  root.className = "awaytimer-panel";
  let message = "";

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
        .awaytimer-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .awaytimer-button.secondary { min-width: 132px; background: var(--brand-500, #5865f2); color: white; }
        .awaytimer-button.neutral { background: var(--button-secondary-background, #4e5058); color: var(--button-secondary-text, #fff); }
        .awaytimer-field { display: grid; gap: 6px; }
        .awaytimer-input { width: min(520px, 100%); box-sizing: border-box; border: 1px solid var(--background-modifier-accent); border-radius: 6px; padding: 10px 12px; background: var(--input-background); color: var(--text-normal); font: inherit; font-size: 15px; }
        .awaytimer-status { min-height: 18px; color: var(--text-positive, #23a55a); font-size: 13px; font-weight: 600; }
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
          <div class="awaytimer-note">Comma-separated minutes. Defaults match Discord: 15, 60, 480, 1440, 4320. Saved edits remain after updates.</div>
          <input id="awaytimer-presets" class="awaytimer-input" value="${escapeAttribute(settings.get("manualPresets").join(", "))}" />
        </div>
        <div class="awaytimer-actions">
          <button class="awaytimer-button secondary" data-save-presets>Save Presets</button>
          <button class="awaytimer-button neutral" data-reset-presets>Reset Presets</button>
        </div>
        <div class="awaytimer-status">${escapeAttribute(message)}</div>
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
      const presets = parsePresetText(input.value);
      settings.set("manualPresets", presets);
      message = `Saved ${presets.length} preset${presets.length === 1 ? "" : "s"}.`;
      render();
    }

    if (event.target.closest("[data-reset-presets]")) {
      settings.set("manualPresets", DEFAULT_SETTINGS.manualPresets);
      message = "Reset to Discord defaults.";
      render();
    }

    if (event.target.closest("[data-cancel-timer]")) manualTimer.cancel({restore: true});

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
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

module.exports = {
  createSettingsPanel
};
