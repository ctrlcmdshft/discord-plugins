const {formatClockTime, formatMinutes} = require("./manualStatusTimer");

class MenuInjector {
  constructor({settings, manualTimer}) {
    this.settings = settings;
    this.manualTimer = manualTimer;
    this.observer = null;
    this.pending = false;
  }

  start() {
    this.observer = new MutationObserver(() => this.scheduleInject());
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    this.scheduleInject();
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    this.pending = false;
    for (const node of document.querySelectorAll(".awaytimer-native-menu-group")) {
      node.remove();
    }
    for (const node of document.querySelectorAll(".awaytimer-hidden-native-menu-item")) {
      node.classList.remove("awaytimer-hidden-native-menu-item");
      node.hidden = false;
    }
  }

  refresh() {
    for (const node of document.querySelectorAll(".awaytimer-native-menu-group")) {
      node.remove();
    }
    for (const node of document.querySelectorAll(".awaytimer-hidden-native-menu-item")) {
      node.classList.remove("awaytimer-hidden-native-menu-item");
      node.hidden = false;
    }
    this.scheduleInject();
  }

  scheduleInject() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.injectIntoDurationMenus();
    });
  }

  injectIntoDurationMenus() {
    for (const menu of findCandidateMenus()) {
      if (menu.querySelector(".awaytimer-native-menu-group")) continue;
      const nativeItems = getNativeIdleDurationItems(menu);
      if (!nativeItems.length) continue;
      const firstNativeItem = nativeItems[0];
      firstNativeItem.before(this.createMenuGroup(firstNativeItem));
      for (const item of nativeItems) {
        item.classList.add("awaytimer-hidden-native-menu-item");
        item.hidden = true;
      }
    }
  }

  createMenuGroup(templateItem) {
    const group = document.createElement("div");
    group.className = "awaytimer-native-menu-group";
    group.setAttribute("role", "group");

    const activeTimer = this.manualTimer.getActiveTimer();
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

    for (const minutes of this.settings.get("manualPresets")) {
      const item = createClonedMenuItem(templateItem, "awaytimer-minutes");
      item.setAttribute("data-awaytimer-minutes", String(minutes));
      replaceVisibleText(item, `For ${formatMinutes(minutes)}`);
      item.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.manualTimer.setIdleForMinutes(minutes);
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
      this.manualTimer.setIdleForever();
      closeDiscordMenu();
    });
    group.append(foreverItem);

    return group;
  }
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

function getNativeIdleDurationItems(menu) {
  const labels = [
    "For 15 Minutes",
    "For 1 Hour",
    "For 8 Hours",
    "For 24 Hours",
    "For 3 Days",
    "Forever"
  ];
  const labelSet = new Set(labels);

  return Array.from(menu.querySelectorAll('[role="menuitem"], button'))
    .filter((node) => node instanceof HTMLElement)
    .filter((node) => !node.classList.contains("awaytimer-native-menu-item"))
    .filter((node) => !node.closest(".awaytimer-native-menu-group"))
    .filter((node) => !node.classList.contains("awaytimer-hidden-native-menu-item"))
    .filter((node) => labelSet.has(normalizeText(node.textContent)));
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
  MenuInjector
};
