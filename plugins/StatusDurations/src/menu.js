class Menu {
  constructor({settings, timer}) { this.settings = settings; this.timer = timer; this.lastStatus = null; this.pending = false; this.running = false; this.boundItems = new Map(); this.captureStatus = this.captureStatus.bind(this); }
  start() {
    if (this.running) return;
    this.running = true;
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener("pointerover", this.captureStatus, true);
    document.addEventListener("focusin", this.captureStatus, true);
    this.clock = window.setInterval(() => this.updateActiveTimerLabels(), 1000);
    this.schedule();
  }
  stop() {
    this.running = false;
    this.observer?.disconnect();
    document.removeEventListener("pointerover", this.captureStatus, true);
    document.removeEventListener("focusin", this.captureStatus, true);
    window.clearInterval(this.clock); this.clock = null;
    for (const [node, binding] of this.boundItems) {
      node.removeEventListener("click", binding.listener, true);
      if (binding.textNode.isConnected && binding.textNode.textContent === binding.replacement) binding.textNode.textContent = binding.original;
      delete node.dataset.statusdurationsBound;
    }
    removeActiveTimerBadges();
    this.boundItems.clear();
  }
  refresh() { this.stop(); this.start(); }
  captureStatus(event) { const text = normalizeText(event.target?.closest?.(STATUS_ITEM_SELECTOR)?.textContent); this.lastStatus = statusFromText(text) || this.lastStatus; }
  schedule() {
    if (!this.running || this.pending) return;
    this.pending=true;
    requestAnimationFrame(()=>{this.pending=false;if (this.running) this.inject();});
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
    const listener = (event) => { event.preventDefault(); event.stopImmediatePropagation(); event.stopPropagation(); this.timer.activate(this.lastStatus, minutes); close(); };
    node.addEventListener("click", listener, true);
    this.boundItems.set(node, {listener, textNode, original, replacement});
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
    if (!active?.expiresAt || active.expiresAt <= Date.now()) { this.schedule(); return; }
    for (const node of document.querySelectorAll(".statusdurations-active-timer")) {
      if (Number(node.dataset.expiresAt) === active.expiresAt) node.textContent = countdownLabel(active.expiresAt);
    }
  }
}
function statusFromText(text) { if (text.includes("Do Not Disturb")) return "dnd"; if (text.includes("Invisible")) return "invisible"; if (text.includes("Idle")) return "idle"; return null; }
const STATUS_ITEM_SELECTOR = '[role^="menuitem"],[role="button"],button,[aria-haspopup="menu"]';
function getTimedDurationItems(menu) {
  const items = [...menu.querySelectorAll('[role="menuitem"],button')];
  const marked = items.filter((node) => node.dataset.statusdurationsBound);
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
function normalizeText(text) { return String(text || "").replace(/\s+/g, " ").trim(); }
function findStatusItems(root, status) {
  const primary = [...root.querySelectorAll(STATUS_ITEM_SELECTOR)]
    .filter((node) => statusFromText(normalizeText(node.textContent)) === status);
  const fallback = [...root.querySelectorAll('[class*="item"]')]
    .filter((node) => exactStatusFromText(normalizeText(node.textContent)) === status);
  return [...new Set([...primary, ...fallback])]
    .filter((node) => !node.closest?.(".statusdurations-active-timer"));
}
function exactStatusFromText(text) { return {Idle:"idle", "Do Not Disturb":"dnd", Invisible:"invisible"}[text] || null; }
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
module.exports = {Menu, statusFromText, getTimedDurationItems, countdownLabel, findLabelTextNode, findStatusItems, normalizeText};
