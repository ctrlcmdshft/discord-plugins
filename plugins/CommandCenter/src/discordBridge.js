class DiscordBridge {
  constructor({notify}) {
    this.notify = notify;
    this.previousChannel = null;
    this.currentChannel = null;
    this.stores = {};
    this.navigation = null;
    this.channelActions = null;
    this.guildActions = null;
  }

  start() {
    this.stores = {
      ChannelStore: getStore("ChannelStore"),
      GuildChannelsStore: getStore("GuildChannelsStore") || getModuleByKeys("getChannels", "getDefaultChannel"),
      GuildStore: getStore("GuildStore"),
      SelectedChannelStore: getStore("SelectedChannelStore"),
      UserStore: getStore("UserStore"),
      PrivateChannelSortStore: getStore("PrivateChannelSortStore")
    };
    this.navigation = getNavigation();
    this.channelActions = getActionModule("selectChannel");
    this.guildActions = getActionModule("selectGuild");
    this.recordCurrentChannel();
  }

  stop() {
    this.stores = {};
    this.navigation = null;
    this.channelActions = null;
    this.guildActions = null;
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
    return {channelId, guildId};
  }

  getChannel(channelId) {
    return call(this.stores.ChannelStore, "getChannel", channelId);
  }

  getGuild(guildId) {
    return call(this.stores.GuildStore, "getGuild", guildId);
  }

  getGuilds() {
    const guilds = call(this.stores.GuildStore, "getGuilds");
    return values(guilds)
      .filter((guild) => guild?.id && guild?.name)
      .sort((first, second) => first.name.localeCompare(second.name));
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
    const guildChannelsStore = this.stores.GuildChannelsStore;
    const raw =
      call(guildChannelsStore, "getChannels", guild.id) ||
      call(store, "getMutableBasicGuildChannelsForGuild", guild.id) ||
      call(store, "getMutableGuildChannelsForGuild", guild.id) ||
      call(store, "getGuildChannels", guild.id) ||
      call(store, "getMutableGuildChannels", guild.id) ||
      call(store, "getChannels", guild.id) ||
      {};

    let channels = flattenChannels(raw);
    if (!channels.length) {
      const channelIds = call(store, "getChannelIds", guild.id) || [];
      channels = channelIds.map((channelId) => this.getChannel(channelId)).filter(Boolean);
    }

    return channels
      .filter((channel) => isTextLikeChannel(channel))
      .map((channel) => ({
        id: channel.id,
        guildId: channel.guild_id || guild.id,
        title: `# ${channel.name}`,
        guildName: guild.name
      }))
      .sort((first, second) => first.title.localeCompare(second.title));
  }

  getVisibleGuildTextChannels(guild) {
    const items = Array.from(globalThis.document?.querySelectorAll?.('[data-list-item-id^="channels___"]') || []);
    return items
      .map((item) => {
        const match = item.getAttribute?.("data-list-item-id")?.match(/^channels___(.+)$/);
        const labelNode = item.querySelector?.('[class*="name"], [data-text-variant]');
        const name = normalizeText(item.getAttribute?.("aria-label") || labelNode?.textContent || item.textContent)
          .replace(/^text channels?\s*/i, "")
          .replace(/^#\s*/, "");
        if (!match?.[1] || !name) return null;
        return {id: match[1], guildId: guild.id, title: `# ${name}`, guildName: guild.name};
      })
      .filter(Boolean);
  }

  getPrivateChannels(limit = 40) {
    const channelIds =
      call(this.stores.PrivateChannelSortStore, "getPrivateChannelIds") ||
      call(this.stores.ChannelStore, "getSortedPrivateChannels") ||
      [];

    return values(channelIds)
      .map((entry) => typeof entry === "string" ? this.getChannel(entry) : entry)
      .filter((channel) => channel?.id && isPrivateChannel(channel))
      .map((channel) => this.describePrivateChannel(channel))
      .filter(Boolean)
      .slice(0, limit);
  }

  describePrivateChannel(channel) {
    const recipients = values(channel.recipients || channel.rawRecipients || [])
      .map((recipient) => typeof recipient === "string" ? call(this.stores.UserStore, "getUser", recipient) : recipient)
      .filter(Boolean);
    const title = channel.name || recipients.map((user) => user.globalName || user.username).filter(Boolean).join(", ");
    if (!title) return null;

    return {
      id: channel.id,
      guildId: "@me",
      title,
      guildName: "Direct Message"
    };
  }

  jumpToChannel(channelId, guildId = null, label = "") {
    this.recordCurrentChannel();
    if ((guildId === "@me" || !guildId) && clickDirectMessageInList(channelId, label)) return true;
    if ((guildId === "@me" || !guildId) && clickDirectMessagesHome()) {
      return new Promise((resolve) => {
        globalThis.setTimeout(() => {
          if (clickDirectMessageInList(channelId, label)) {
            resolve(true);
            return;
          }
          resolve(this.selectChannel(channelId, guildId));
        }, 180);
      });
    }
    if (guildId && guildId !== "@me" && clickChannelInServerList(channelId)) return true;
    return this.selectChannel(channelId, guildId);
  }

  selectChannel(channelId, guildId = null) {
    this.channelActions = this.channelActions || getActionModule("selectChannel");
    if (typeof this.channelActions?.selectChannel === "function") {
      this.channelActions.selectChannel(guildId || "@me", channelId);
      return true;
    }
    const route = `/channels/${guildId || "@me"}/${channelId}`;
    return this.transitionTo(route);
  }

  jumpToGuild(guildId, channelId = null) {
    this.recordCurrentChannel();
    if (clickGuildInServerList(guildId)) return true;
    this.guildActions = this.guildActions || getActionModule("selectGuild");
    if (typeof this.guildActions?.selectGuild === "function") {
      this.guildActions.selectGuild(guildId);
      return true;
    }
    if (channelId) return this.jumpToChannel(channelId, guildId);
    const route = channelId ? `/channels/${guildId}/${channelId}` : `/channels/${guildId}`;
    return this.transitionTo(route);
  }

  transitionTo(route) {
    this.navigation = this.navigation || getNavigation();
    if (typeof this.navigation?.transitionTo === "function") {
      this.navigation.transitionTo(route);
      return true;
    }

    this.notify("Command Center could not navigate in this Discord build.");
    return false;
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
}

function clickGuildInServerList(guildId) {
  const item = globalThis.document?.querySelector?.(`[data-list-item-id="guildsnav___${guildId}"]`);
  if (!item || typeof item.click !== "function") return false;

  const target = item.querySelector?.('[role="treeitem"], [role="button"], a, button') || item;
  target.click();
  return true;
}

function clickChannelInServerList(channelId) {
  const item = globalThis.document?.querySelector?.(`[data-list-item-id="channels___${channelId}"]`);
  if (!item || typeof item.click !== "function") return false;

  const target = item.querySelector?.('[role="treeitem"], [role="button"], a, button') || item;
  target.click();
  return true;
}

function clickDirectMessageInList(channelId, label) {
  const document = globalThis.document;
  const item = document?.querySelector?.(
    `[data-list-item-id="private-channels-uid___${channelId}"], [data-list-id*="private-channels-uid"] a[href$="/${channelId}"]`
  ) || findDirectMessageByLabel(document, label);
  if (!item || typeof item.click !== "function") return false;

  const target = item.querySelector?.('[role="treeitem"], [role="button"], a, button') || item;
  target.click();
  return true;
}

function clickDirectMessagesHome() {
  const document = globalThis.document;
  const item = document?.querySelector?.('[data-list-item-id="guildsnav___home"], [aria-label="Direct Messages"]');
  if (!item || typeof item.click !== "function") return false;

  const target = item.querySelector?.('[role="treeitem"], [role="button"], a, button') || item;
  target.click();
  return true;
}

function findDirectMessageByLabel(document, label) {
  const normalizedLabel = normalizeText(label);
  if (!normalizedLabel) return null;

  return Array.from(document?.querySelectorAll?.('[data-list-id*="private-channels-uid"] [role="listitem"], [data-list-id*="private-channels-uid"] a, [data-list-item-id*="private-channels"]') || [])
    .find((candidate) => normalizeText(candidate.textContent).includes(normalizedLabel)) || null;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function getStore(name) {
  return BdApi.Webpack?.getStore?.(name) || BdApi.Webpack?.Stores?.[name] || null;
}

function getModuleByKeys(...keys) {
  return globalThis.BdApi?.Webpack?.getByKeys?.(...keys) || null;
}

function getNavigation() {
  const webpack = globalThis.BdApi?.Webpack;
  const candidates = [
    webpack?.getByKeys?.("transitionTo", "replaceWith"),
    webpack?.getByKeys?.("transitionTo"),
    webpack?.getModule?.(
      (module) => typeof module?.transitionTo === "function",
      {first: true, searchExports: true}
    ),
    webpack?.getModule?.(
      (module) => typeof module?.default?.transitionTo === "function",
      {first: true, searchExports: true}
    )
  ];

  return candidates.find((candidate) => typeof candidate?.transitionTo === "function") || findNavigationInLoadedModules();
}

function getActionModule(method) {
  const webpack = globalThis.BdApi?.Webpack;
  const candidates = [
    webpack?.getByKeys?.(method),
    webpack?.getModule?.(
      (module) => typeof module?.[method] === "function",
      {first: true, searchExports: true}
    )
  ];
  return candidates.find((candidate) => typeof candidate?.[method] === "function") || findExportInLoadedModules(method);
}

function findNavigationInLoadedModules() {
  return findExportInLoadedModules("transitionTo");
}

function findExportInLoadedModules(method) {
  const chunk = globalThis.webpackChunkdiscord_app;
  if (!chunk?.push) return null;

  let requireFunction = null;
  try {
    chunk.push([[`command-center-router-${Date.now()}`], {}, (runtime) => {
      requireFunction = runtime;
    }]);
  } catch (error) {
    console.warn("[CommandCenter] could not inspect Discord modules", error);
    return null;
  }

  for (const module of Object.values(requireFunction?.c || {})) {
    const exports = module?.exports;
    const candidates = [exports, exports?.default, ...Object.values(exports || {})];
    const matchingExport = candidates.find((candidate) => typeof candidate?.[method] === "function");
    if (matchingExport) return matchingExport;
  }

  return null;
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
    if (entry.id && (entry.name || entry.type !== undefined)) {
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
  const seen = new Set();
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

module.exports = {
  DiscordBridge
};
