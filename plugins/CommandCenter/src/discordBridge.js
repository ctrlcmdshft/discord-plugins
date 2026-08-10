class DiscordBridge {
  constructor({notify}) {
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
    const raw =
      call(store, "getGuildChannels", guild.id) ||
      call(store, "getMutableGuildChannels", guild.id) ||
      call(store, "getChannels", guild.id) ||
      {};

    return flattenChannels(raw)
      .filter((channel) => isTextLikeChannel(channel))
      .map((channel) => ({
        id: channel.id,
        guildId: channel.guild_id || guild.id,
        title: `# ${channel.name}`,
        guildName: guild.name
      }))
      .sort((first, second) => first.title.localeCompare(second.title));
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
}

function getStore(name) {
  return BdApi.Webpack?.getStore?.(name) || BdApi.Webpack?.Stores?.[name] || null;
}

function getNavigation() {
  return BdApi.Webpack?.getByKeys?.("transitionTo", "replaceWith") ||
    BdApi.Webpack?.getByKeys?.("transitionTo") ||
    null;
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
