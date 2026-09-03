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
    const root = document.createElement("div");
    const render = () => { root.innerHTML = `<style>${styles}</style><div class="sd-panel"><div class="sd-section-title"><span>STATUS DURATION CHOICES</span><i></i><b>⌄</b></div><p class="sd-intro">Choose the five times that appear when you set Idle, Do Not Disturb, or Invisible. Your prior status returns when the timer ends.</p><div class="sd-settings">${this.settings.durations.map((duration, index) => row(duration, index)).join("")}</div><div class="sd-section-title"><span>QUICK SETUP</span><i></i></div><div class="sd-quick-row"><div><strong>Apply a ready-made set</strong><span>Replace all five choices at once.</span></div><div class="sd-actions"><button data-preset="short">Short breaks</button><button data-preset="work">Workday</button><button data-preset="default">Discord defaults</button></div></div><p class="sd-footnote">Each duration must be different and between 1 minute and 3 days.</p></div>`; };
    root.addEventListener("change", (event) => {
      if (!event.target.closest("[data-duration-value], [data-duration-unit]")) return;
      const values = [...root.querySelectorAll(".sd-duration-row")].map(readRow);
      const unique = new Set(values);
      if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 4320) || unique.size !== 5) { BdApi.UI.showToast("Use five different times between 1 minute and 3 days.", {type:"error"}); render(); return; }
      this.settings.setDurations(values); render();
    });
    root.addEventListener("click", (event) => {
      const preset = event.target.closest("[data-preset]")?.dataset.preset;
      if (!preset) return;
      this.settings.setDurations(PRESETS[preset]); render();
    });
    render();
    return root;
  }
}
const PRESETS = {short: [5, 15, 30, 60, 120], work: [15, 30, 60, 120, 480], default: DEFAULTS};
function row(duration, index) { const editor = toEditorValue(duration); return `<div class="sd-duration-row"><div class="sd-row-copy"><strong>Duration ${index + 1}</strong><span>${index === 0 ? "The first option shown in Discord’s timed-status menu." : `The ${ordinal(index + 1)} option shown in Discord’s timed-status menu.`}</span></div><div class="sd-control"><div class="sd-input-group"><input class="sd-duration-input" type="number" min="1" max="4320" value="${editor.value}" data-duration-value aria-label="Duration ${index + 1} amount"><select data-duration-unit aria-label="Duration ${index + 1} unit"><option value="1" ${editor.unit === 1 ? "selected" : ""}>Minutes</option><option value="60" ${editor.unit === 60 ? "selected" : ""}>Hours</option><option value="1440" ${editor.unit === 1440 ? "selected" : ""}>Days</option></select></div><small>${describe(duration)}</small></div></div>`; }
function ordinal(value) { return ["first", "second", "third", "fourth", "fifth"][value - 1] || `${value}th`; }
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
const styles = `.sd-panel{max-width:680px;color:var(--text-normal)}.sd-section-title{display:flex;align-items:center;gap:12px;margin:0 0 14px;color:var(--text-muted);font-size:12px;font-weight:700}.sd-section-title i{height:1px;flex:1;background:var(--background-modifier-accent)}.sd-section-title b{font-size:17px;font-weight:400;line-height:12px;color:var(--text-normal)}.sd-intro,.sd-footnote{margin:0;color:var(--text-muted);font-size:13px;line-height:1.45}.sd-intro{margin:-3px 0 8px}.sd-settings{border-top:1px solid var(--background-modifier-accent);margin-bottom:28px}.sd-duration-row{display:grid;grid-template-columns:minmax(0,1fr) 250px;align-items:center;gap:22px;padding:18px 0;border-bottom:1px solid var(--background-modifier-accent)}.sd-row-copy{display:grid;gap:5px}.sd-row-copy strong,.sd-quick-row strong{font-size:14px;font-weight:600}.sd-row-copy span,.sd-quick-row span{color:var(--text-muted);font-size:13px;line-height:1.35}.sd-control{display:grid;gap:5px}.sd-input-group{display:grid;grid-template-columns:92px 1fr;gap:8px}.sd-duration-input,.sd-input-group select{box-sizing:border-box;width:100%;height:40px;padding:8px 10px;border:1px solid var(--background-modifier-accent)!important;border-radius:7px!important;background:var(--input-background)!important;color:var(--text-normal)!important;font:var(--font-primary)!important;font-size:14px!important;font-weight:500!important}.sd-duration-input:focus,.sd-input-group select:focus{border-color:var(--brand-500)!important;outline:0;box-shadow:0 0 0 1px var(--brand-500)}.sd-control small{color:var(--text-muted);font-size:12px}.sd-quick-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:22px;padding:0 0 18px;border-bottom:1px solid var(--background-modifier-accent)}.sd-quick-row>div:first-child{display:grid;gap:5px}.sd-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px}.sd-actions button{border:0;border-radius:4px;padding:8px 10px;background:var(--button-secondary-background);color:var(--button-secondary-text);font:inherit;font-size:12px;font-weight:600;cursor:pointer}.sd-actions button:hover{background:var(--button-secondary-background-hover,var(--background-modifier-hover))}.sd-footnote{margin-top:12px;font-size:12px}@media(max-width:620px){.sd-duration-row,.sd-quick-row{grid-template-columns:1fr;gap:10px}.sd-control{max-width:280px}.sd-actions{justify-content:flex-start}}`;
module.exports = StatusDurations;
module.exports.parseDuration = parseDuration;
module.exports.toEditorValue = toEditorValue;
module.exports.readRow = readRow;
