const {Settings, DEFAULTS} = require("./settings");
const {StatusAdapter} = require("./statusAdapter");
const {Timer} = require("./timer");
const {Menu} = require("./menu");

class StatusDurations {
  constructor(meta) { this.meta = meta; }
  start() {
    this.settings = new Settings(() => this.menu?.refresh());
    this.adapter = new StatusAdapter(); this.adapter.start();
    this.timer = new Timer({adapter:this.adapter, notify:(message)=>BdApi.UI.showToast(message)}); this.timer.start();
    this.menu = new Menu({settings:this.settings,timer:this.timer}); this.menu.start();
  }
  stop() { this.menu?.stop(); this.timer?.stop(); this.adapter?.stop(); }
  getSettingsPanel() {
    return createSettingsPanel(this.settings);
  }
}
const PRESETS = {short: [5, 15, 30, 60, 120], work: [15, 30, 60, 120, 480], default: DEFAULTS};
function createSettingsPanel(settings) {
  const root = element("div", "sd-root");
  const style = document.createElement("style");
  style.textContent = `${styles}${layoutStyles}`;
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
    button.addEventListener("click", () => { settings.setDurations(PRESETS[key]); renderValues(PRESETS[key]); });
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
  input.type = "number"; input.min = "1"; input.step = "1"; input.value = String(editor.value);
  input.dataset.durationValue = ""; input.setAttribute("aria-label", `Menu option ${index + 1} amount`);
  const select = element("select", "sd-duration-unit");
  select.dataset.durationUnit = ""; select.setAttribute("aria-label", `Menu option ${index + 1} unit`);
  for (const [value, label] of [[1, "Minutes"], [60, "Hours"], [1440, "Days"]]) {
    const option = element("option", "", label); option.value = String(value); option.selected = editor.unit === value; select.append(option);
  }
  controls.append(input, select);
  row.append(identity, controls);
  return row;
}

function validateDurations(values) {
  const invalidIndexes = new Set();
  values.forEach((value, index) => { if (!Number.isInteger(value) || value < 1 || value > 4320) invalidIndexes.add(index); });
  values.forEach((value, index) => { if (values.indexOf(value) !== values.lastIndexOf(value)) invalidIndexes.add(index); });
  const message = [...values].some((value) => !Number.isInteger(value) || value < 1 || value > 4320)
    ? "Use whole-number durations between 1 minute and 3 days."
    : new Set(values).size !== values.length ? "Each duration must be different." : "";
  return {message, invalidIndexes};
}

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function toEditorValue(minutes) { if (minutes % 1440 === 0) return {value: minutes / 1440, unit: 1440}; if (minutes % 60 === 0) return {value: minutes / 60, unit: 60}; return {value: minutes, unit: 1}; }
function readRow(row) { return Math.round(Number(row.querySelector("[data-duration-value]").value) * Number(row.querySelector("[data-duration-unit]").value)); }
function formatInput(minutes) { if (minutes % 1440 === 0) return `${minutes / 1440}d`; if (minutes % 60 === 0) return `${minutes / 60}h`; return `${minutes}m`; }
function parseDuration(value) {
  const text = String(value).trim().toLowerCase();
  if (!text) return NaN;
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(d(?:ays?)?|h(?:ours?)?|m(?:in(?:utes?)?)?)/g)];
  if (!matches.length || matches.map((match) => match[0]).join("").replace(/\s/g, "") !== text.replace(/\s/g, "")) return NaN;
  return Math.round(matches.reduce((total, match) => total + Number(match[1]) * (match[2].startsWith("d") ? 1440 : match[2].startsWith("h") ? 60 : 1), 0));
}
function describe(minutes) { if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`; if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`; if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`; return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
const styles = `.sd-root{max-width:740px;color:var(--text-normal);font-family:var(--font-primary)}.sd-section-title{margin:0 0 4px;color:var(--header-secondary);font-size:12px;font-weight:700;line-height:16px;letter-spacing:.02em;text-transform:uppercase}.sd-description,.sd-footnote{margin:0;color:var(--text-muted);font-size:13px;line-height:18px}.sd-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:24px;margin-top:12px;border-top:1px solid var(--background-modifier-accent)}.sd-duration-row{display:grid;grid-template-columns:76px minmax(0,1fr);align-items:center;gap:10px;min-height:50px;border-bottom:1px solid var(--background-modifier-accent)}.sd-setting-copy{display:grid;gap:2px}.sd-setting-title{color:var(--header-primary);font-size:14px;font-weight:500;line-height:18px}.sd-setting-note{color:var(--text-muted);font-size:13px;line-height:17px}.sd-input-group{display:grid;grid-template-columns:minmax(56px,82px) minmax(78px,1fr);gap:6px}.sd-duration-input,.sd-duration-unit{box-sizing:border-box;width:100%;height:34px;padding:6px 8px;border:0!important;border-radius:3px!important;background:var(--input-background)!important;color:var(--text-normal)!important;font:var(--font-primary)!important;font-size:14px!important}.sd-duration-input:focus,.sd-duration-unit:focus{outline:2px solid var(--brand-500);outline-offset:-2px}.sd-invalid .sd-duration-input,.sd-invalid .sd-duration-unit{outline:2px solid var(--status-danger);outline-offset:-2px}.sd-status{min-height:18px;padding-top:3px;color:var(--status-danger);font-size:12px;line-height:16px}.sd-presets-title{margin-top:16px}.sd-presets{display:grid;grid-template-columns:minmax(150px,1fr) auto;align-items:center;gap:20px;min-height:48px;border-bottom:1px solid var(--background-modifier-accent)}.sd-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.sd-preset{min-height:30px;border:0;border-radius:3px;padding:5px 10px;background:var(--button-secondary-background);color:var(--button-secondary-text);font:inherit;font-size:13px;font-weight:500;cursor:pointer}.sd-preset:hover{background:var(--button-secondary-background-hover,var(--background-modifier-hover))}.sd-footnote{margin-top:6px;font-size:12px;line-height:16px}@media(max-width:620px){.sd-settings{grid-template-columns:1fr}.sd-presets{grid-template-columns:1fr;gap:8px;padding:10px 0}.sd-actions{justify-content:flex-start}}`;
const layoutStyles = `.sd-settings{grid-template-rows:repeat(3,50px);grid-auto-flow:column}@media(max-width:620px){.sd-settings{grid-template-rows:none;grid-auto-flow:row}}`;
module.exports = StatusDurations;
module.exports.parseDuration = parseDuration;
module.exports.toEditorValue = toEditorValue;
module.exports.readRow = readRow;
module.exports.validateDurations = validateDurations;
