class CommandRegistry {
  constructor(context) {
    this.context = context;
    this.commands = new Map();
    this.providers = new Set();
  }

  register(command) {
    if (!command || !command.id || typeof command.run !== "function") {
      throw new Error("CommandCenter commands require id and run().");
    }

    this.commands.set(command.id, {
      category: "General",
      keywords: [],
      priority: 0,
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

    return [...Array.from(this.commands.values()), ...providedCommands]
      .filter((command) => {
        if (typeof command.enabled !== "function") return true;
        try {
          return command.enabled(this.context);
        } catch (error) {
          console.warn("[CommandCenter] command availability check failed", error);
          return false;
        }
      });
  }

  async run(commandId) {
    const command = this.commands.get(commandId) || this.list().find((item) => item.id === commandId);
    if (!command) return null;
    await command.run(this.context);
    return command;
  }
}

function createDefaultCommands(context) {
  const registry = new CommandRegistry(context);

  registry.registerMany([
    {
      id: "palette.close",
      title: "Close Command Center",
      subtitle: "Hide the palette",
      category: "Command Center",
      priority: 10,
      keywords: ["escape", "dismiss"],
      run: ({palette}) => palette.close()
    },
    {
      id: "palette.copy-location",
      title: "Copy Current Discord Location",
      subtitle: "Copies the current Discord route or URL",
      category: "Clipboard",
      priority: 70,
      enabled: ({settings}) => settings.get("showClipboard"),
      keywords: ["copy", "url", "link", "channel"],
      run: async ({notify}) => {
        await copyText(window.location.href);
        notify("Copied current Discord location.");
      }
    },
    {
      id: "plugin.about",
      title: "Show Command Center Version",
      subtitle: "Display the active plugin version",
      category: "Command Center",
      priority: 20,
      enabled: ({settings}) => settings.get("showDevelopment"),
      keywords: ["about", "info", "version"],
      run: ({meta, notify}) => notify(`${meta.name} ${meta.version}`)
    },
    {
      id: "plugin.reload-hint",
      title: "Reload BetterDiscord Plugin",
      subtitle: "Build again, then toggle the plugin in BetterDiscord",
      category: "Development",
      priority: 20,
      enabled: ({settings}) => settings.get("showDevelopment"),
      keywords: ["dev", "build", "reload", "test"],
      run: ({notify}) => notify("Build the plugin, then toggle CommandCenter off and on.")
    }
  ]);
  registry.registerProvider(createDiscordCommands);

  return registry;
}

function createDiscordCommands({discord}) {
  if (!discord) return [];

  const selected = discord.getSelectedChannel();
  const commands = [
    {
      id: "discord.previous-channel",
      title: "Go to Previous Channel",
      subtitle: "Jump back to the last channel Command Center saw",
      category: "Navigation",
      priority: 100,
      enabled: ({settings}) => settings.get("showNavigation"),
      keywords: ["back", "last", "previous", "channel"],
      run: ({discord}) => discord.jumpToPreviousChannel()
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
        priority: 90,
        enabled: ({settings}) => settings.get("showClipboard"),
        keywords: ["copy", "link", "url", "current", "channel"],
        run: async ({discord, notify}) => {
          await copyText(discord.getChannelLink(selected.channelId, selected.guildId));
          notify("Copied current channel link.");
        }
      },
      {
        id: "discord.copy-current-channel-id",
        title: "Copy Current Channel ID",
        subtitle: selected.channelId,
        category: "Clipboard",
        priority: 80,
        enabled: ({settings}) => settings.get("showClipboard"),
        keywords: ["copy", "snowflake", "id", "current", "channel"],
        run: async ({notify}) => {
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
      subtitle: "Browse this server's channels",
      category: "Servers",
      priority: 50,
      enabled: ({settings}) => settings.get("showServers"),
      keywords: ["guild", "server", guild.name],
      keepOpen: true,
      run: ({palette}) => palette.showChannelsForGuild(guild)
    });
  }

  for (const channel of discord.getTextChannels()) {
    commands.push({
      id: `channel.${channel.id}`,
      title: channel.title,
      subtitle: channel.guildName,
      category: "Channels",
      guildId: channel.guildId,
      priority: 40,
      enabled: ({settings}) => settings.get("showChannels"),
      keywords: ["jump", "goto", "channel", channel.guildName],
      run: ({discord}) => discord.jumpToChannel(channel.id, channel.guildId)
    });
  }

  for (const dm of discord.getPrivateChannels()) {
    commands.push({
      id: `dm.${dm.id}`,
      title: dm.title,
      subtitle: dm.guildName,
      category: "Direct Messages",
      priority: 60,
      enabled: ({settings}) => settings.get("showDirectMessages"),
      keywords: ["dm", "direct", "message", "jump", dm.title],
      run: ({discord}) => discord.jumpToChannel(dm.id, "@me", dm.title)
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

module.exports = {
  CommandRegistry,
  createDefaultCommands
};
