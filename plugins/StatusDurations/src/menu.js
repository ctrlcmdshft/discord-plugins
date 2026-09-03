class Menu {
  constructor({settings, timer}) { this.settings = settings; this.timer = timer; this.lastStatus = null; this.pending = false; this.boundItems = new Map(); this.over = this.over.bind(this); }
  start() { this.observer = new MutationObserver(() => this.schedule()); this.observer.observe(document.body,{childList:true,subtree:true}); document.addEventListener("pointerover", this.over, true); this.clock = window.setInterval(() => this.updateActiveTimerLabels(), 1000); this.schedule(); }
  stop() {
    this.observer?.disconnect(); document.removeEventListener("pointerover", this.over, true); window.clearInterval(this.clock); this.clock = null;
    for (const [node, listener] of this.boundItems) { node.removeEventListener("click", listener, true); if (node.dataset.statusdurationsLabel) node.textContent=node.dataset.statusdurationsLabel; delete node.dataset.statusdurationsLabel; }
    for (const node of document.querySelectorAll(".statusdurations-active-timer")) {
      const item = node.parentElement;
      node.remove();
      if (item?.dataset.statusdurationsPadding) { item.style.paddingBottom = item.dataset.statusdurationsPadding; delete item.dataset.statusdurationsPadding; }
    }
    this.boundItems.clear();
  }
  refresh() { this.stop(); this.start(); }
  over(event) { const text = String(event.target?.closest?.('[role="menuitem"],button')?.textContent || ""); this.lastStatus = statusFromText(text) || this.lastStatus; }
  schedule() { if (this.pending) return; this.pending=true; requestAnimationFrame(()=>{this.pending=false;this.inject();}); }
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
    const listener = (event) => { event.preventDefault(); event.stopImmediatePropagation(); event.stopPropagation(); this.timer.activate(this.lastStatus, minutes); close(); };
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
    if (!active?.expiresAt || active.expiresAt <= Date.now()) { this.schedule(); return; }
    for (const node of document.querySelectorAll(".statusdurations-active-timer")) {
      if (Number(node.dataset.expiresAt) === active.expiresAt) node.textContent = countdownLabel(active.expiresAt);
    }
  }
}
function statusFromText(text) { if (text.includes("Do Not Disturb")) return "dnd"; if (text.includes("Invisible")) return "invisible"; if (text.includes("Idle")) return "idle"; return null; }
function getTimedDurationItems(menu) {
  const items = [...menu.querySelectorAll('[role="menuitem"],button')];
  const marked = items.filter((node) => node.dataset.statusdurationsLabel);
  if (marked.length === 5) return marked;
  // Discord's timed-status submenu is the only nearby menu with five
  // "For …" choices plus Forever. Matching the stable menu structure keeps
  // user-edited labels working after settings are changed.
  const timed = items.filter((node) => {
    const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
    return text.startsWith("For ") && text !== "Forever";
  });
  return timed.length === 5 ? timed : [];
}
function format(minutes) { if (minutes < 60) return `${minutes} Minutes`; if (minutes % 1440 === 0) return `${minutes / 1440} Day${minutes === 1440 ? "" : "s"}`; if (minutes % 60 === 0) return `${minutes / 60} Hour${minutes === 60 ? "" : "s"}`; return `${Math.floor(minutes/60)}h ${minutes%60}m`; }
function countdownLabel(expiresAt) {
  const remaining = Math.max(0, expiresAt - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);
  if (totalSeconds < 60) return `Ends in ${totalSeconds}s`;
  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) return `Ends in ${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `Ends in ${hours}h ${minutes}m`;
}
function close() { document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:true})); }
module.exports = {Menu, statusFromText, getTimedDurationItems, countdownLabel};
