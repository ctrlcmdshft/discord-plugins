/**
 * @name CommandCenter
 * @author user
 * @description Raycast-style command palette foundation for Discord.
 * @version 0.1.0
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// src/styles.js
var require_styles = __commonJS({
  "src/styles.js"(exports2, module2) {
    module2.exports = `
.cc-root {
  position: fixed;
  inset: 0;
  z-index: 10000;
  font-family: var(--font-primary, "gg sans", "Helvetica Neue", Helvetica, Arial, sans-serif);
}

.cc-root[hidden] {
  display: none;
}

.cc-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.42);
}

.cc-palette {
  position: absolute;
  top: 11vh;
  left: 50%;
  width: min(720px, calc(100vw - 32px));
  transform: translateX(-50%);
  background: var(--background-floating, #111214);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48);
  color: var(--text-normal, #dbdee1);
  overflow: hidden;
}

.cc-search-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
}

.cc-search-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: var(--interactive-normal, #b5bac1);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.16));
  border-radius: 6px;
  font-size: 15px;
}

.cc-search-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-normal, #dbdee1);
  font: inherit;
  font-size: 18px;
  line-height: 24px;
}

.cc-search-input::placeholder {
  color: var(--text-muted, #80848e);
}

.cc-results {
  max-height: min(520px, 58vh);
  overflow-y: auto;
  padding: 8px;
}

.cc-result {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 58px;
  padding: 10px 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.cc-result.is-selected,
.cc-result:hover {
  background: var(--background-modifier-selected, rgba(88, 101, 242, 0.18));
}

.cc-result + .cc-result {
  margin-top: 2px;
}

.cc-result-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.cc-result-title,
.cc-result-subtitle,
.cc-result-category {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cc-result-title {
  color: var(--text-normal, #f2f3f5);
  font-size: 15px;
  font-weight: 600;
}

.cc-result-subtitle,
.cc-result-category,
.cc-footer {
  color: var(--text-muted, #949ba4);
  font-size: 12px;
}

.cc-result-category {
  max-width: 150px;
}

.cc-empty {
  padding: 34px 16px;
  color: var(--text-muted, #949ba4);
  text-align: center;
}

.cc-footer {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 10px 14px 12px;
  border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
}
`;
  }
});

// src/commandRegistry.js
var require_commandRegistry = __commonJS({
  "src/commandRegistry.js"(exports2, module2) {
    var CommandRegistry = class {
      constructor(context) {
        this.context = context;
        this.commands = /* @__PURE__ */ new Map();
        this.providers = /* @__PURE__ */ new Set();
      }
      register(command) {
        if (!command || !command.id || typeof command.run !== "function") {
          throw new Error("CommandCenter commands require id and run().");
        }
        this.commands.set(command.id, {
          category: "General",
          keywords: [],
          ...command
        });
      }
      registerMany(commands) {
        for (const command of commands) this.register(command);
      }
      registerProvider(provider) {
        if (typeof provider !== "function") {
          throw new Error("CommandCenter command providers must be functions.");
        }
        this.providers.add(provider);
      }
      list() {
        const providedCommands = Array.from(this.providers).flatMap((provider) => {
          try {
            return provider(this.context) || [];
          } catch (error) {
            console.warn("[CommandCenter] command provider failed", error);
            return [];
          }
        });
        return [...Array.from(this.commands.values()), ...providedCommands];
      }
      async run(commandId) {
        const command = this.commands.get(commandId) || this.list().find((item) => item.id === commandId);
        if (!command) return;
        await command.run(this.context);
      }
    };
    function createDefaultCommands2(context) {
      const registry = new CommandRegistry(context);
      registry.registerMany([
        {
          id: "palette.close",
          title: "Close Command Center",
          subtitle: "Hide the palette",
          category: "Command Center",
          keywords: ["escape", "dismiss"],
          run: ({ palette }) => palette.close()
        },
        {
          id: "palette.copy-location",
          title: "Copy Current Discord Location",
          subtitle: "Copies the current Discord route or URL",
          category: "Clipboard",
          keywords: ["copy", "url", "link", "channel"],
          run: async ({ notify }) => {
            await copyText(window.location.href);
            notify("Copied current Discord location.");
          }
        },
        {
          id: "plugin.about",
          title: "Show Command Center Version",
          subtitle: "Display the active plugin version",
          category: "Command Center",
          keywords: ["about", "info", "version"],
          run: ({ meta, notify }) => notify(`${meta.name} ${meta.version}`)
        },
        {
          id: "plugin.reload-hint",
          title: "Reload BetterDiscord Plugin",
          subtitle: "Build again, then toggle the plugin in BetterDiscord",
          category: "Development",
          keywords: ["dev", "build", "reload", "test"],
          run: ({ notify }) => notify("Build the plugin, then toggle CommandCenter off and on.")
        }
      ]);
      registry.registerProvider(createDiscordCommands);
      return registry;
    }
    function createDiscordCommands({ discord }) {
      if (!discord) return [];
      const selected = discord.getSelectedChannel();
      const commands = [
        {
          id: "discord.previous-channel",
          title: "Go to Previous Channel",
          subtitle: "Jump back to the last channel Command Center saw",
          category: "Navigation",
          keywords: ["back", "last", "previous", "channel"],
          run: ({ discord: discord2 }) => discord2.jumpToPreviousChannel()
        }
      ];
      if (selected?.channelId) {
        const channel = discord.getChannel(selected.channelId);
        commands.push(
          {
            id: "discord.copy-current-channel-link",
            title: "Copy Current Channel Link",
            subtitle: channel?.name ? `# ${channel.name}` : "Copies a discord.com channel URL",
            category: "Clipboard",
            keywords: ["copy", "link", "url", "current", "channel"],
            run: async ({ discord: discord2, notify }) => {
              await copyText(discord2.getChannelLink(selected.channelId, selected.guildId));
              notify("Copied current channel link.");
            }
          },
          {
            id: "discord.copy-current-channel-id",
            title: "Copy Current Channel ID",
            subtitle: selected.channelId,
            category: "Clipboard",
            keywords: ["copy", "snowflake", "id", "current", "channel"],
            run: async ({ notify }) => {
              await copyText(selected.channelId);
              notify("Copied current channel ID.");
            }
          }
        );
      }
      for (const guild of discord.getGuilds().slice(0, 80)) {
        commands.push({
          id: `guild.${guild.id}`,
          title: guild.name,
          subtitle: "Server",
          category: "Servers",
          keywords: ["guild", "server", guild.name],
          run: ({ discord: discord2 }) => {
            const firstChannel = discord2.getGuildTextChannels(guild)[0];
            if (firstChannel) discord2.jumpToChannel(firstChannel.id, guild.id);
          }
        });
      }
      for (const channel of discord.getTextChannels()) {
        commands.push({
          id: `channel.${channel.id}`,
          title: channel.title,
          subtitle: channel.guildName,
          category: "Channels",
          keywords: ["jump", "goto", "channel", channel.guildName],
          run: ({ discord: discord2 }) => discord2.jumpToChannel(channel.id, channel.guildId)
        });
      }
      for (const dm of discord.getPrivateChannels()) {
        commands.push({
          id: `dm.${dm.id}`,
          title: dm.title,
          subtitle: dm.guildName,
          category: "Direct Messages",
          keywords: ["dm", "direct", "message", "jump", dm.title],
          run: ({ discord: discord2 }) => discord2.jumpToChannel(dm.id, "@me")
        });
      }
      return commands;
    }
    async function copyText(text) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
      const element = document.createElement("textarea");
      element.value = text;
      element.style.position = "fixed";
      element.style.opacity = "0";
      document.body.append(element);
      element.select();
      document.execCommand("copy");
      element.remove();
    }
    module2.exports = {
      CommandRegistry,
      createDefaultCommands: createDefaultCommands2
    };
  }
});

// src/discordBridge.js
var require_discordBridge = __commonJS({
  "src/discordBridge.js"(exports2, module2) {
    var DiscordBridge2 = class {
      constructor({ notify }) {
        this.notify = notify;
        this.previousChannel = null;
        this.currentChannel = null;
        this.stores = {};
        this.navigation = null;
      }
      start() {
        this.stores = {
          ChannelStore: getStore("ChannelStore"),
          GuildStore: getStore("GuildStore"),
          SelectedChannelStore: getStore("SelectedChannelStore"),
          UserStore: getStore("UserStore"),
          PrivateChannelSortStore: getStore("PrivateChannelSortStore")
        };
        this.navigation = getNavigation();
        this.recordCurrentChannel();
      }
      stop() {
        this.stores = {};
        this.navigation = null;
        this.previousChannel = null;
        this.currentChannel = null;
      }
      onSwitch() {
        this.recordCurrentChannel();
      }
      recordCurrentChannel() {
        const selected = this.getSelectedChannel();
        if (!selected?.channelId) return;
        if (this.currentChannel?.channelId && this.currentChannel.channelId !== selected.channelId) {
          this.previousChannel = this.currentChannel;
        }
        this.currentChannel = selected;
      }
      getSelectedChannel() {
        const store = this.stores.SelectedChannelStore;
        const channelId = call(store, "getChannelId");
        if (!channelId) return null;
        const channel = this.getChannel(channelId);
        const guildId = channel?.guild_id || call(store, "getGuildId") || null;
        return { channelId, guildId };
      }
      getChannel(channelId) {
        return call(this.stores.ChannelStore, "getChannel", channelId);
      }
      getGuild(guildId) {
        return call(this.stores.GuildStore, "getGuild", guildId);
      }
      getGuilds() {
        const guilds = call(this.stores.GuildStore, "getGuilds");
        return values(guilds).filter((guild) => guild?.id && guild?.name).sort((first, second) => first.name.localeCompare(second.name));
      }
      getTextChannels(limit = 80) {
        const channels = [];
        for (const guild of this.getGuilds()) {
          channels.push(...this.getGuildTextChannels(guild).slice(0, 40));
          if (channels.length >= limit) break;
        }
        return channels.slice(0, limit);
      }
      getGuildTextChannels(guild) {
        const store = this.stores.ChannelStore;
        const raw = call(store, "getGuildChannels", guild.id) || call(store, "getMutableGuildChannels", guild.id) || call(store, "getChannels", guild.id) || {};
        return flattenChannels(raw).filter((channel) => isTextLikeChannel(channel)).map((channel) => ({
          id: channel.id,
          guildId: channel.guild_id || guild.id,
          title: `# ${channel.name}`,
          guildName: guild.name
        })).sort((first, second) => first.title.localeCompare(second.title));
      }
      getPrivateChannels(limit = 40) {
        const channelIds = call(this.stores.PrivateChannelSortStore, "getPrivateChannelIds") || call(this.stores.ChannelStore, "getSortedPrivateChannels") || [];
        return values(channelIds).map((entry) => typeof entry === "string" ? this.getChannel(entry) : entry).filter((channel) => channel?.id && isPrivateChannel(channel)).map((channel) => this.describePrivateChannel(channel)).filter(Boolean).slice(0, limit);
      }
      describePrivateChannel(channel) {
        const recipients = values(channel.recipients || channel.rawRecipients || []).map((recipient) => typeof recipient === "string" ? call(this.stores.UserStore, "getUser", recipient) : recipient).filter(Boolean);
        const title = channel.name || recipients.map((user) => user.globalName || user.username).filter(Boolean).join(", ");
        if (!title) return null;
        return {
          id: channel.id,
          guildId: "@me",
          title,
          guildName: "Direct Message"
        };
      }
      jumpToChannel(channelId, guildId = null) {
        this.recordCurrentChannel();
        const route = `/channels/${guildId || "@me"}/${channelId}`;
        if (typeof this.navigation?.transitionTo === "function") {
          this.navigation.transitionTo(route);
          return;
        }
        window.location.assign(route);
      }
      jumpToPreviousChannel() {
        if (!this.previousChannel?.channelId) {
          this.notify("No previous channel recorded yet.");
          return;
        }
        this.jumpToChannel(this.previousChannel.channelId, this.previousChannel.guildId);
      }
      getChannelLink(channelId, guildId = null) {
        return `https://discord.com/channels/${guildId || "@me"}/${channelId}`;
      }
    };
    function getStore(name) {
      return BdApi.Webpack?.getStore?.(name) || BdApi.Webpack?.Stores?.[name] || null;
    }
    function getNavigation() {
      return BdApi.Webpack?.getByKeys?.("transitionTo", "replaceWith") || BdApi.Webpack?.getByKeys?.("transitionTo") || null;
    }
    function call(target, method, ...args) {
      if (!target || typeof target[method] !== "function") return null;
      try {
        return target[method](...args);
      } catch (error) {
        console.warn(`[CommandCenter] ${method} failed`, error);
        return null;
      }
    }
    function values(value) {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (value instanceof Map) return Array.from(value.values());
      if (typeof value === "object") return Object.values(value);
      return [];
    }
    function flattenChannels(value) {
      const result = [];
      const visit = (entry) => {
        if (!entry) return;
        if (Array.isArray(entry)) {
          for (const item of entry) visit(item);
          return;
        }
        if (entry.channel) {
          result.push(entry.channel);
          return;
        }
        if (entry.id && (entry.name || entry.type !== void 0)) {
          result.push(entry);
          return;
        }
        if (typeof entry === "object") {
          for (const item of Object.values(entry)) visit(item);
        }
      };
      visit(value);
      return dedupeById(result);
    }
    function dedupeById(items) {
      const seen = /* @__PURE__ */ new Set();
      return items.filter((item) => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    }
    function isTextLikeChannel(channel) {
      return channel?.id && channel?.name && [0, 5, 10, 11, 12, 15].includes(channel.type);
    }
    function isPrivateChannel(channel) {
      return channel?.id && [1, 3].includes(channel.type);
    }
    module2.exports = {
      DiscordBridge: DiscordBridge2
    };
  }
});

// src/fuzzySearch.js
var require_fuzzySearch = __commonJS({
  "src/fuzzySearch.js"(exports2, module2) {
    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }
    function scoreMatch(query, candidate) {
      const needle = normalize(query);
      const haystack = normalize(candidate);
      if (!needle) return { matched: true, score: 0, indexes: [] };
      if (!haystack) return { matched: false, score: Number.NEGATIVE_INFINITY, indexes: [] };
      if (haystack === needle) return { matched: true, score: 1e3, indexes: range(0, haystack.length) };
      if (haystack.startsWith(needle)) return { matched: true, score: 800 - haystack.length, indexes: range(0, needle.length) };
      let score = 0;
      let lastIndex = -1;
      const indexes = [];
      for (const char of needle) {
        const index = haystack.indexOf(char, lastIndex + 1);
        if (index === -1) return { matched: false, score: Number.NEGATIVE_INFINITY, indexes: [] };
        indexes.push(index);
        score += 20;
        if (index === lastIndex + 1) score += 15;
        if (index === 0 || /[\s#:_/-]/.test(haystack[index - 1])) score += 10;
        score -= Math.max(0, index - lastIndex - 1);
        lastIndex = index;
      }
      return { matched: true, score: score - haystack.length * 0.1, indexes };
    }
    function range(start, end) {
      return Array.from({ length: end - start }, (_, offset) => start + offset);
    }
    function searchableText(command) {
      return [
        command.title,
        command.subtitle,
        command.category,
        ...command.keywords || []
      ].filter(Boolean).join(" ");
    }
    function fuzzySearch(query, commands, limit = 12) {
      return commands.map((command) => {
        const result = scoreMatch(query, searchableText(command));
        return { ...command, match: result };
      }).filter((command) => command.match.matched).sort((first, second) => second.match.score - first.match.score || first.title.localeCompare(second.title)).slice(0, limit);
    }
    module2.exports = {
      fuzzySearch,
      scoreMatch
    };
  }
});

// src/palette.js
var require_palette = __commonJS({
  "src/palette.js"(exports2, module2) {
    var { fuzzySearch } = require_fuzzySearch();
    var CommandPalette2 = class {
      constructor({ registry, notify }) {
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
      }
      open() {
        if (!this.root) this.mount();
        this.isOpen = true;
        this.query = "";
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
          <span class="cc-search-icon" aria-hidden="true">\u2318</span>
          <input class="cc-search-input" type="text" spellcheck="false" autocomplete="off"
            placeholder="Search commands, channels, servers, users..." aria-label="Search commands" />
        </div>
        <div class="cc-results" role="listbox"></div>
        <div class="cc-footer">
          <span>\u2191\u2193 Select</span>
          <span>\u21B5 Run</span>
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
          this.renderResults({ scroll: false });
        });
        document.body.append(this.root);
      }
      handleKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
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
        this.results = fuzzySearch(this.query, this.registry.list(), 10);
        this.selectedIndex = Math.min(this.selectedIndex, Math.max(this.results.length - 1, 0));
        this.renderResults();
      }
      renderResults({ scroll = true } = {}) {
        if (!this.resultsNode) return;
        if (!this.results.length) {
          this.resultsNode.innerHTML = `<div class="cc-empty">No commands found</div>`;
          return;
        }
        this.resultsNode.innerHTML = this.results.map((command, index) => `
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
        if (scroll) this.resultsNode.querySelector(".is-selected")?.scrollIntoView({ block: "nearest" });
      }
      async runCommand(commandId) {
        try {
          await this.registry.run(commandId);
          this.close();
        } catch (error) {
          console.error("[CommandCenter]", error);
          this.notify("Command failed. See console for details.", { type: "error" });
        }
      }
    };
    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]);
    }
    function escapeAttribute(value) {
      return escapeHtml(value).replace(/`/g, "&#096;");
    }
    module2.exports = {
      CommandPalette: CommandPalette2
    };
  }
});

// src/index.js
var styles = require_styles();
var { createDefaultCommands } = require_commandRegistry();
var { DiscordBridge } = require_discordBridge();
var { CommandPalette } = require_palette();
var CommandCenter = class {
  constructor(meta) {
    this.meta = meta;
    this.discord = null;
    this.palette = null;
    this.registry = null;
    this.handleGlobalKeyDown = null;
  }
  start() {
    BdApi.DOM.addStyle(this.meta.name, styles);
    this.discord = new DiscordBridge({ notify: (message, options) => this.notify(message, options) });
    this.discord.start();
    const context = {
      meta: this.meta,
      notify: (message, options) => this.notify(message, options),
      discord: this.discord,
      palette: null
    };
    this.registry = createDefaultCommands(context);
    this.palette = new CommandPalette({
      registry: this.registry,
      notify: context.notify
    });
    context.palette = this.palette;
    this.handleGlobalKeyDown = (event) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifierPressed = isMac ? event.metaKey : event.ctrlKey;
      if (!modifierPressed || event.shiftKey || event.altKey || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      event.stopPropagation();
      this.palette.toggle();
    };
    document.addEventListener("keydown", this.handleGlobalKeyDown, true);
    this.notify("Command Center loaded. Press Cmd/Ctrl+K.");
  }
  onSwitch() {
    this.discord?.onSwitch();
    if (this.palette?.isOpen) this.palette.updateResults();
  }
  stop() {
    if (this.handleGlobalKeyDown) {
      document.removeEventListener("keydown", this.handleGlobalKeyDown, true);
      this.handleGlobalKeyDown = null;
    }
    this.palette?.destroy();
    this.palette = null;
    this.registry = null;
    this.discord?.stop();
    this.discord = null;
    BdApi.DOM.removeStyle(this.meta.name);
  }
  notify(message, options = {}) {
    const type = options.type || "info";
    if (BdApi.UI?.showToast) {
      BdApi.UI.showToast(message, { type });
      return;
    }
    console.log(`[CommandCenter] ${message}`);
  }
};
module.exports = CommandCenter;
