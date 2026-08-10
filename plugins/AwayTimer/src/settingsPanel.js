const {parsePresetText} = require("./settings");
const {formatMinutes} = require("./manualStatusTimer");

function createSettingsPanel({settings, manualTimer}) {
  const root = document.createElement("div");
  root.className = "awaytimer-panel";

  const render = () => {
    root.innerHTML = `
      <style>
        .awaytimer-panel { color: var(--text-normal); display: grid; gap: 18px; padding: 8px 0; }
        .awaytimer-section { display: grid; gap: 10px; }
        .awaytimer-title { font-size: 16px; font-weight: 700; }
        .awaytimer-note { color: var(--text-muted); font-size: 13px; line-height: 1.4; }
        .awaytimer-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
        .awaytimer-button { border: 0; border-radius: 6px; padding: 8px 12px; background: var(--brand-500, #5865f2); color: white; cursor: pointer; font-weight: 600; }
        .awaytimer-button.secondary { background: var(--background-modifier-selected); color: var(--text-normal); }
        .awaytimer-field { display: grid; gap: 6px; }
        .awaytimer-input { max-width: 360px; border: 1px solid var(--background-modifier-accent); border-radius: 6px; padding: 8px 10px; background: var(--input-background); color: var(--text-normal); }
        .awaytimer-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
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
    `;
    root.append(settings.getSettingsPanel());
  };

  root.addEventListener("click", (event) => {
    const minutesButton = event.target.closest("[data-minutes]");
    if (minutesButton) manualTimer.setIdleForMinutes(minutesButton.dataset.minutes);

    if (event.target.closest("[data-save-presets]")) {
      const input = root.querySelector("#awaytimer-presets");
      settings.set("manualPresets", parsePresetText(input.value));
      render();
    }

    if (event.target.closest("[data-cancel-timer]")) manualTimer.cancel({restore: true});
  });

  render();
  return root;
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
