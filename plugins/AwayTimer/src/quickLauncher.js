const {formatMinutes} = require("./manualStatusTimer");

class QuickLauncher {
  constructor({settings, manualTimer}) {
    this.settings = settings;
    this.manualTimer = manualTimer;
    this.root = null;
    this.isOpen = false;
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  start() {
    this.root = document.createElement("div");
    this.root.className = "awaytimer-launcher";
    this.root.innerHTML = `
      <button class="awaytimer-launcher-button" title="AwayTimer" aria-haspopup="true" aria-expanded="false">
        Away
      </button>
      <div class="awaytimer-popover" hidden></div>
    `;
    this.root.querySelector(".awaytimer-launcher-button").addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggle();
    });
    this.root.addEventListener("click", (event) => this.handlePopoverClick(event));
    document.addEventListener("click", this.handleDocumentClick);
    document.addEventListener("keydown", this.handleKeyDown);
    document.body.append(this.root);
  }

  stop() {
    document.removeEventListener("click", this.handleDocumentClick);
    document.removeEventListener("keydown", this.handleKeyDown);
    this.root?.remove();
    this.root = null;
    this.isOpen = false;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.renderPopover();
    this.root.querySelector(".awaytimer-launcher-button").setAttribute("aria-expanded", "true");
    this.root.querySelector(".awaytimer-popover").hidden = false;
  }

  close() {
    if (!this.root) return;
    this.isOpen = false;
    this.root.querySelector(".awaytimer-launcher-button").setAttribute("aria-expanded", "false");
    this.root.querySelector(".awaytimer-popover").hidden = true;
  }

  renderPopover() {
    const popover = this.root.querySelector(".awaytimer-popover");
    popover.innerHTML = `
      <div class="awaytimer-popover-title">Set Idle</div>
      <div class="awaytimer-popover-grid">
        ${this.settings.get("manualPresets").map((minutes) => `
          <button class="awaytimer-popover-button" data-minutes="${minutes}">${formatMinutes(minutes)}</button>
        `).join("")}
        <button class="awaytimer-popover-button" data-forever>Forever</button>
      </div>
      <div class="awaytimer-popover-row">
        <input class="awaytimer-popover-input" type="number" min="1" max="1440" value="${this.settings.get("customDurationMinutes")}" data-custom-minutes />
        <button class="awaytimer-popover-button primary" data-custom-start>Start</button>
      </div>
      <div class="awaytimer-popover-row">
        <input class="awaytimer-popover-input" type="time" data-until-time />
        <button class="awaytimer-popover-button primary" data-until-start>Until</button>
      </div>
      <button class="awaytimer-popover-button secondary full" data-cancel-timer>Cancel Timer</button>
    `;
  }

  handlePopoverClick(event) {
    const minutesButton = event.target.closest("[data-minutes]");
    if (minutesButton) {
      this.manualTimer.setIdleForMinutes(minutesButton.dataset.minutes);
      this.close();
      return;
    }

    if (event.target.closest("[data-forever]")) {
      this.manualTimer.setIdleForever();
      this.close();
      return;
    }

    if (event.target.closest("[data-custom-start]")) {
      const input = this.root.querySelector("[data-custom-minutes]");
      this.settings.set("customDurationMinutes", input.value);
      this.manualTimer.setIdleForMinutes(input.value);
      this.close();
      return;
    }

    if (event.target.closest("[data-until-start]")) {
      const input = this.root.querySelector("[data-until-time]");
      if (this.manualTimer.setIdleUntil(input.value)) this.close();
      return;
    }

    if (event.target.closest("[data-cancel-timer]")) {
      this.manualTimer.cancel({restore: true});
      this.close();
    }
  }

  handleDocumentClick(event) {
    if (!this.root || this.root.contains(event.target)) return;
    this.close();
  }

  handleKeyDown(event) {
    if (event.key === "Escape") this.close();
  }
}

module.exports = {
  QuickLauncher
};
