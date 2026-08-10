const {formatClockTime, formatMinutes} = require("./manualStatusTimer");

class MenuInjector {
  constructor({settings, manualTimer}) {
    this.settings = settings;
    this.manualTimer = manualTimer;
    this.observer = null;
    this.pending = false;
    this.lastStatusKind = null;
    this.handlePointerOver = this.handlePointerOver.bind(this);
  }

  start() {
    this.observer = new MutationObserver(() => this.scheduleInject());
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    document.addEventListener("pointerover", this.handlePointerOver, true);
    this.scheduleInject();
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    this.pending = false;
    document.removeEventListener("pointerover", this.handlePointerOver, true);
    for (const node of document.querySelectorAll(".awaytimer-native-menu-group")) {
      node.remove();
    }
    for (const node of document.querySelectorAll(".awaytimer-hidden-native-menu-item")) {
      node.classList.remove("awaytimer-hidden-native-menu-item");
      node.hidden = false;
    }
    removeParentStatusSubtitles();
  }

  refresh() {
    for (const node of document.querySelectorAll(".awaytimer-native-menu-group")) {
      node.remove();
    }
    for (const node of document.querySelectorAll(".awaytimer-hidden-native-menu-item")) {
      node.classList.remove("awaytimer-hidden-native-menu-item");
      node.hidden = false;
    }
    removeParentStatusSubtitles();
    this.scheduleInject();
  }

  scheduleInject() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.decorateParentStatusItems();
      this.injectIntoDurationMenus();
    });
  }

  handlePointerOver(event) {
    const item = event.target?.closest?.('[role="menuitem"], button, [class*="item"]');
    if (!item) return;
    const text = normalizeText(item.textContent);
    const statusKind = statusKindFromText(text);
    if (statusKind) this.lastStatusKind = statusKind;
  }

  injectIntoDurationMenus() {
    for (const menu of findCandidateMenus()) {
      if (menu.querySelector(".awaytimer-native-menu-group")) continue;
      const nativeItems = getNativeIdleDurationItems(menu);
      if (!nativeItems.length) continue;
      const firstNativeItem = nativeItems[0];
      const statusKind = inferStatusKind(menu, this.lastStatusKind);
      if (!statusKind) continue;
      firstNativeItem.before(this.createMenuGroup(firstNativeItem, statusKind));
      for (const item of nativeItems) {
        item.classList.add("awaytimer-hidden-native-menu-item");
        item.hidden = true;
      }
    }
  }

  decorateParentStatusItems() {
    const activeSubtitles = new Set();

    for (const item of findStatusSummaryItems()) {
      const statusKind = statusKindFromText(normalizeText(item.textContent));
      if (!["idle", "dnd", "invisible"].includes(statusKind)) continue;

      const activeTimer = this.manualTimer.getActiveTimer(statusKind);
      if (!activeTimer) continue;

      const label = `Until ${formatClockTime(activeTimer.expiresAt)}`;
      const subtitle = ensureParentStatusSubtitle(item);
      if (subtitle.textContent !== label) subtitle.textContent = label;
      activeSubtitles.add(subtitle);
    }

    for (const subtitle of document.querySelectorAll(".awaytimer-parent-subtitle")) {
      if (!activeSubtitles.has(subtitle)) subtitle.remove();
    }
  }

  createMenuGroup(templateItem, statusKind) {
    const group = document.createElement("div");
    group.className = "awaytimer-native-menu-group";
    group.setAttribute("role", "group");

    const activeTimer = this.manualTimer.getActiveTimer(statusKind);
    if (activeTimer) {
      const activeItem = createClonedMenuItem(templateItem, "awaytimer-active-timer");
      activeItem.setAttribute("aria-disabled", "true");
      activeItem.style.pointerEvents = "none";
      replaceVisibleText(activeItem, `Active until ${formatClockTime(activeTimer.expiresAt)}`);
      group.append(activeItem);

      const cancelItem = createClonedMenuItem(templateItem, "awaytimer-cancel-timer");
      replaceVisibleText(cancelItem, "Cancel Timer");
      cancelItem.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.manualTimer.cancel({restore: true});
        closeDiscordMenu();
      });
      group.append(cancelItem);
    }

    for (const minutes of this.settings.get(`${statusKind}Presets`)) {
      const item = createClonedMenuItem(templateItem, "awaytimer-minutes");
      item.setAttribute("data-awaytimer-minutes", String(minutes));
      replaceVisibleText(item, `For ${formatMinutes(minutes)}`);
      item.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.manualTimer.setStatusForMinutes(statusKind, minutes);
        closeDiscordMenu();
      });
      group.append(item);
    }

    const foreverItem = createClonedMenuItem(templateItem, "awaytimer-forever");
    foreverItem.setAttribute("data-awaytimer-forever", "true");
    replaceVisibleText(foreverItem, "Forever");
    foreverItem.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.manualTimer.setStatusForever(statusKind);
      closeDiscordMenu();
    });
    group.append(foreverItem);

    return group;
  }
}

function inferStatusKind(menu, fallback) {
  if (!["idle", "dnd", "invisible"].includes(fallback)) return null;
  return fallback;
}

function statusKindFromText(text) {
  if (text.includes("Online")) return "unsupported";
  if (text.includes("Invisible")) return "invisible";
  if (text.includes("Do Not Disturb")) return "dnd";
  if (text.includes("Idle")) return "idle";
  return null;
}

function createClonedMenuItem(templateItem, kind) {
  const item = templateItem.cloneNode(true);
  item.classList.add("awaytimer-native-menu-item", kind);
  item.classList.remove("awaytimer-hidden-native-menu-item");
  item.hidden = false;
  item.removeAttribute("id");
  return item;
}

function findCandidateMenus() {
  return Array.from(document.querySelectorAll('[role="menu"]'))
    .filter((node) => node instanceof HTMLElement)
    .filter((node) => !node.closest(".awaytimer-native-menu-group"));
}

function findStatusSummaryItems() {
  return Array.from(document.querySelectorAll('[role="menuitem"], button, [class*="item"]'))
    .filter((node) => node instanceof HTMLElement)
    .filter((node) => !node.closest(".awaytimer-native-menu-group"))
    .filter((node) => !node.classList.contains("awaytimer-native-menu-item"))
    .filter((node) => !node.classList.contains("awaytimer-hidden-native-menu-item"))
    .filter((node) => isInAccountStatusPopout(node))
    .filter((node) => {
      const text = normalizeText(node.textContent);
      if (isNativeDurationLabel(text)) return false;
      return ["idle", "dnd", "invisible"].includes(statusKindFromText(text));
    });
}

function isInAccountStatusPopout(node) {
  let current = node.parentElement;
  let depth = 0;

  while (current && current !== document.body && depth < 10) {
    const text = normalizeText(current.textContent);
    if (text.includes("Edit Profile") && text.includes("Clips")) return true;
    current = current.parentElement;
    depth += 1;
  }

  return false;
}

function ensureParentStatusSubtitle(item) {
  const existing = item.querySelector(".awaytimer-parent-subtitle");
  if (existing) return existing;

  const subtitle = document.createElement("div");
  subtitle.className = "awaytimer-parent-subtitle";
  subtitle.style.color = "var(--text-muted)";
  subtitle.style.fontSize = "12px";
  subtitle.style.lineHeight = "16px";
  subtitle.style.fontWeight = "500";

  const textContainer = findStatusTextContainer(item);
  textContainer.append(subtitle);
  return subtitle;
}

function findStatusTextContainer(item) {
  const textNodes = getTextNodes(item)
    .filter((node) => ["idle", "dnd", "invisible"].includes(statusKindFromText(normalizeText(node.textContent))));
  const textNode = textNodes[0];
  const parent = textNode?.parentElement;
  if (parent && parent !== item) return parent;
  return item;
}

function getTextNodes(node) {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  return textNodes;
}

function removeParentStatusSubtitles() {
  for (const node of document.querySelectorAll(".awaytimer-parent-subtitle")) {
    node.remove();
  }
}

function getNativeIdleDurationItems(menu) {
  return Array.from(menu.querySelectorAll('[role="menuitem"], button'))
    .filter((node) => node instanceof HTMLElement)
    .filter((node) => !node.classList.contains("awaytimer-native-menu-item"))
    .filter((node) => !node.closest(".awaytimer-native-menu-group"))
    .filter((node) => !node.classList.contains("awaytimer-hidden-native-menu-item"))
    .filter((node) => isNativeDurationLabel(normalizeText(node.textContent)));
}

function isNativeDurationLabel(text) {
  return [
    "For 15 Minutes",
    "For 1 Hour",
    "For 8 Hours",
    "For 24 Hours",
    "For 3 Days",
    "Forever"
  ].includes(text);
}

function replaceVisibleText(node, label) {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  const target = textNodes.find((textNode) => normalizeText(textNode.textContent));
  if (target) {
    target.textContent = label;
    for (const textNode of textNodes) {
      if (textNode !== target) textNode.textContent = "";
    }
    return;
  }

  node.textContent = label;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function closeDiscordMenu() {
  document.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    bubbles: true
  }));
}

module.exports = {
  MenuInjector,
  inferStatusKind,
  statusKindFromText
};
