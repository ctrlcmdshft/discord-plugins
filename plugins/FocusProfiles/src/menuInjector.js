class MenuInjector {
  constructor({settings, controller}) { this.settings = settings; this.controller = controller; this.observer = null; this.pending = false; }
  start() {
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(document.body, {childList: true, subtree: true});
    this.schedule();
  }
  stop() { this.observer?.disconnect(); this.observer = null; removeItems(); }
  refresh() { removeItems(); this.schedule(); }
  schedule() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => { this.pending = false; this.inject(); });
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
    node.textContent = `${active ? "✓ " : ""}${profile.name}`;
    node.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); this.controller.activate(profile.id); closeMenu(); });
    return node;
  }
  createClearItem(template) {
    const node = cloneMenuItem(template);
    node.textContent = "Clear Focus Profile";
    node.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); this.controller.clear(); closeMenu(); });
    return node;
  }
}

function isAccountPopout(menu) { const text = String(menu.textContent || ""); return text.includes("Set Status") && (text.includes("Set Custom Status") || text.includes("Switch Accounts")); }
function findStatusAnchor(menu) { return [...menu.querySelectorAll('[role="menuitem"], button')].find((node) => String(node.textContent || "").replace(/\s+/g, " ").trim().startsWith("Set Status")); }
function cloneMenuItem(template) { const node = template.cloneNode(true); node.classList.add("focusprofiles-menu-item"); node.removeAttribute("id"); return node; }
function createLabel(template, text) { const node = cloneMenuItem(template); node.setAttribute("aria-disabled", "true"); node.style.pointerEvents = "none"; node.style.opacity = "0.7"; node.style.fontSize = "12px"; node.textContent = text; return node; }
function removeItems() { document.querySelectorAll(".focusprofiles-menu-item").forEach((node) => node.remove()); }
function closeMenu() { document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", code: "Escape", bubbles: true})); }
module.exports = {MenuInjector, isAccountPopout};
