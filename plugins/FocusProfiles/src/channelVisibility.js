class ChannelVisibility {
  constructor() { this.hiddenIds = new Set(); this.observer = null; this.apply = this.apply.bind(this); }
  start() {
    this.observer = new MutationObserver(() => requestAnimationFrame(this.apply));
    this.observer.observe(document.body, {childList: true, subtree: true});
    this.apply();
  }
  stop() { this.observer?.disconnect(); this.observer = null; this.setHidden([]); }
  setHidden(ids) { this.hiddenIds = new Set(ids.map(String)); this.apply(); }
  apply() {
    for (const node of document.querySelectorAll("[data-focusprofiles-hidden]")) {
      node.hidden = false;
      node.removeAttribute("data-focusprofiles-hidden");
    }
    for (const id of this.hiddenIds) {
      for (const node of document.querySelectorAll(`[data-list-item-id*="guildsnav___${cssEscape(id)}"]`)) {
        node.hidden = true;
        node.setAttribute("data-focusprofiles-hidden", "true");
      }
    }
  }
}
function cssEscape(value) { return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }
module.exports = {ChannelVisibility};
