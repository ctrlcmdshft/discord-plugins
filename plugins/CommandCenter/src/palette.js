const {fuzzySearch} = require("./fuzzySearch");

class CommandPalette {
  constructor({registry, notify}) {
    this.registry = registry;
    this.notify = notify;
    this.isOpen = false;
    this.query = "";
    this.selectedIndex = 0;
    this.results = [];
    this.root = null;
    this.input = null;
    this.resultsNode = null;
    this.hasPointerSelection = false;
    this.channelScope = null;
  }

  open() {
    if (!this.root) this.mount();
    this.isOpen = true;
    this.query = "";
    this.channelScope = null;
    this.selectedIndex = 0;
    this.hasPointerSelection = false;
    this.root.hidden = false;
    if (this.input) this.input.value = "";
    this.updateResults();
    requestAnimationFrame(() => this.input?.focus());
  }

  close() {
    if (!this.root) return;
    this.isOpen = false;
    this.root.hidden = true;
    this.channelScope = null;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  destroy() {
    if (!this.root) return;
    this.root.remove();
    this.root = null;
    this.input = null;
    this.resultsNode = null;
  }

  mount() {
    this.root = document.createElement("div");
    this.root.className = "cc-root";
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="cc-backdrop" data-command-center-close></div>
      <section class="cc-palette" role="dialog" aria-modal="true" aria-label="Command Center">
        <div class="cc-search-row">
          <span class="cc-search-icon" aria-hidden="true">⌘</span>
          <input class="cc-search-input" type="text" spellcheck="false" autocomplete="off"
            placeholder="Search commands, channels, servers, users..." aria-label="Search commands" />
        </div>
        <div class="cc-results" role="listbox"></div>
        <div class="cc-footer">
          <span>↑↓ Select</span>
          <span>↵ Run</span>
          <span>Esc Close</span>
        </div>
      </section>
    `;

    this.input = this.root.querySelector(".cc-search-input");
    this.resultsNode = this.root.querySelector(".cc-results");
    this.input.addEventListener("input", () => {
      this.query = this.input.value;
      this.selectedIndex = 0;
      this.hasPointerSelection = false;
      this.updateResults();
    });
    this.root.addEventListener("keydown", (event) => this.handleKeyDown(event));
    this.root.addEventListener("click", (event) => {
      if (event.target.closest("[data-command-center-close]")) this.close();

      const item = event.target.closest("[data-command-id]");
      if (!item) return;
      this.runCommand(item.dataset.commandId);
    });
    this.root.addEventListener("pointermove", (event) => {
      const item = event.target.closest("[data-command-index]");
      if (!item) return;
      this.hasPointerSelection = true;
      this.selectedIndex = Number(item.dataset.commandIndex);
      this.renderResults({scroll: false});
    });

    document.body.append(this.root);
  }

  handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (this.channelScope) {
        this.clearChannelScope();
        return;
      }
      this.close();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.hasPointerSelection = false;
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
      this.renderResults();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.hasPointerSelection = false;
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.renderResults();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const command = this.results[this.selectedIndex];
      if (command) this.runCommand(command.id);
    }
  }

  updateResults() {
    const limit = this.registry.context.settings.get("resultLimit");
    const commands = this.channelScope ? this.getScopedCommands() : this.getTopLevelCommands();
    this.results = fuzzySearch(this.query, commands, limit);
    this.selectedIndex = Math.min(this.selectedIndex, Math.max(this.results.length - 1, 0));
    this.renderResults();
  }

  renderResults({scroll = true} = {}) {
    if (!this.resultsNode) return;

    if (!this.results.length) {
      this.resultsNode.innerHTML = `<div class="cc-empty">No commands found</div>`;
      return;
    }

    const scopeHeader = this.channelScope ? `<div class="cc-scope">Channels in <strong>${escapeHtml(this.channelScope.name)}</strong> <span>Esc to go back</span></div>` : "";
    this.resultsNode.innerHTML = scopeHeader + this.results.map((command, index) => `
      <button class="cc-result ${index === this.selectedIndex ? "is-selected" : ""}"
        data-command-id="${escapeAttribute(command.id)}" data-command-index="${index}" role="option"
        aria-selected="${index === this.selectedIndex}">
        <span class="cc-result-main">
          <span class="cc-result-title">${escapeHtml(command.title)}</span>
          <span class="cc-result-subtitle">${escapeHtml(command.subtitle || command.category)}</span>
        </span>
        <span class="cc-result-category">${escapeHtml(command.category)}</span>
      </button>
    `).join("");

    if (scroll) this.resultsNode.querySelector(".is-selected")?.scrollIntoView({block: "nearest"});
  }

  async runCommand(commandId) {
    try {
      if (commandId === "palette.exit-channel-scope") {
        this.clearChannelScope();
        return;
      }
      const command = await this.registry.run(commandId);
      if (!command?.keepOpen) this.close();
    } catch (error) {
      console.error("[CommandCenter]", error);
      this.notify("Command failed. See console for details.", {type: "error"});
    }
  }

  getTopLevelCommands() {
    return this.registry.list().filter((command) => command.category !== "Channels");
  }

  getScopedCommands() {
    const back = {
      id: "palette.exit-channel-scope",
      title: "Back to Servers",
      subtitle: "Choose a different server",
      category: "Navigation",
      priority: 200,
      keywords: ["back", "servers", "cancel"]
    };
    const storedChannels = this.registry.list().filter((command) =>
      command.category === "Channels" && command.guildId === this.channelScope.guildId
    );
    const visibleChannels = (this.channelScope.visibleChannels || []).map((channel) => ({
      id: `visible-channel.${channel.id}`,
      title: channel.title,
      subtitle: channel.guildName,
      category: "Channels",
      priority: 50,
      keywords: ["channel", "jump", channel.guildName],
      run: ({discord}) => discord.jumpToChannel(channel.id, channel.guildId)
    }));
    return [back, ...(visibleChannels.length ? visibleChannels : storedChannels)];
  }

  async showChannelsForGuild(guild) {
    this.channelScope = {guildId: guild.id, name: guild.name, visibleChannels: []};
    this.query = "";
    if (this.input) this.input.value = "";
    this.updateResults();
    this.registry.context.discord.jumpToGuild(guild.id);
    await new Promise((resolve) => globalThis.setTimeout(resolve, 180));
    if (!this.channelScope || this.channelScope.guildId !== guild.id) return;
    this.channelScope.visibleChannels = this.registry.context.discord.getVisibleGuildTextChannels(guild);
    this.updateResults();
    requestAnimationFrame(() => this.input?.focus());
  }

  clearChannelScope() {
    this.channelScope = null;
    this.query = "";
    if (this.input) this.input.value = "";
    this.updateResults();
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

module.exports = {
  CommandPalette
};
