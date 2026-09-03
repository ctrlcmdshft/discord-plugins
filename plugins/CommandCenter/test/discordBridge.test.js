const test = require("node:test");
const assert = require("node:assert/strict");
const {DiscordBridge} = require("../src/discordBridge");

test("jumpToGuild falls back to Discord's server route when no channel is available", () => {
  const bridge = new DiscordBridge({notify: () => {}});
  let route = null;
  bridge.navigation = {transitionTo: (value) => { route = value; }};

  bridge.jumpToGuild("guild-1");

  assert.equal(route, "/channels/guild-1");
});

test("jumpToGuild prefers a known channel route", () => {
  const bridge = new DiscordBridge({notify: () => {}});
  let route = null;
  bridge.navigation = {transitionTo: (value) => { route = value; }};

  bridge.jumpToGuild("guild-1", "channel-1");

  assert.equal(route, "/channels/guild-1/channel-1");
});

test("jumpToChannel uses Discord's selection action before route navigation", () => {
  const bridge = new DiscordBridge({notify: () => {}});
  let selection = null;
  bridge.channelActions = {selectChannel: (guildId, channelId) => { selection = {guildId, channelId}; }};

  assert.equal(bridge.jumpToChannel("channel-1", "guild-1"), true);
  assert.deepEqual(selection, {guildId: "guild-1", channelId: "channel-1"});
});

test("jumpToChannel clicks Discord's rendered server channel before using an internal action", () => {
  const bridge = new DiscordBridge({notify: () => {}});
  let clicked = false;
  global.document = {querySelector: () => ({click: () => { clicked = true; }})};

  assert.equal(bridge.jumpToChannel("channel-1", "guild-1"), true);
  assert.equal(clicked, true);
  delete global.document;
});

test("jumpToChannel clicks Discord's rendered DM item before using an internal action", () => {
  const bridge = new DiscordBridge({notify: () => {}});
  let clicked = false;
  global.document = {
    querySelector: () => ({click: () => { clicked = true; }})
  };

  assert.equal(bridge.jumpToChannel("dm-1", "@me"), true);
  assert.equal(clicked, true);
  delete global.document;
});

test("jumpToChannel can find a rendered DM by its visible name", () => {
  const bridge = new DiscordBridge({notify: () => {}});
  let clicked = false;
  global.document = {
    querySelector: () => null,
    querySelectorAll: () => [{textContent: "Alex Smith", click: () => { clicked = true; }}]
  };

  assert.equal(bridge.jumpToChannel("dm-1", "@me", "Alex Smith"), true);
  assert.equal(clicked, true);
  delete global.document;
});

test("jumpToChannel opens Direct Messages before selecting an unrendered DM", async () => {
  const bridge = new DiscordBridge({notify: () => {}});
  let homeClicked = false;
  let dmClicked = false;
  let queryCount = 0;
  global.document = {
    querySelector: () => {
      queryCount += 1;
      if (queryCount === 1) return null;
      if (queryCount === 2) return {click: () => { homeClicked = true; }};
      return {click: () => { dmClicked = true; }};
    }
  };

  await bridge.jumpToChannel("dm-1", "@me", "Alex Smith");
  assert.equal(homeClicked, true);
  assert.equal(dmClicked, true);
  delete global.document;
});

test("jumpToGuild uses Discord's selection action before route navigation", () => {
  const bridge = new DiscordBridge({notify: () => {}});
  let guildId = null;
  bridge.guildActions = {selectGuild: (value) => { guildId = value; }};

  assert.equal(bridge.jumpToGuild("guild-1"), true);
  assert.equal(guildId, "guild-1");
});

test("getGuildTextChannels supports Discord's current guild channel store", () => {
  const bridge = new DiscordBridge({notify: () => {}});
  bridge.stores = {
    ChannelStore: {},
    GuildChannelsStore: {
      getChannels: () => ({
        category: [
          {channel: {id: "channel-1", name: "general", guild_id: "guild-1", type: 0}},
          {channel: {id: "voice-1", name: "Lobby", guild_id: "guild-1", type: 2}}
        ]
      })
    }
  };

  assert.deepEqual(bridge.getGuildTextChannels({id: "guild-1", name: "Test Server"}), [
    {id: "channel-1", guildId: "guild-1", title: "# general", guildName: "Test Server"}
  ]);
});

test("getVisibleGuildTextChannels reads channels from Discord's rendered server list", () => {
  const bridge = new DiscordBridge({notify: () => {}});
  global.document = {
    querySelectorAll: () => [
      {textContent: "# general", getAttribute: (name) => name === "data-list-item-id" ? "channels___channel-1" : "general"},
      {textContent: "# rules", getAttribute: (name) => name === "data-list-item-id" ? "channels___channel-2" : "rules"}
    ]
  };

  assert.deepEqual(bridge.getVisibleGuildTextChannels({id: "guild-1", name: "Test Server"}), [
    {id: "channel-1", guildId: "guild-1", title: "# general", guildName: "Test Server"},
    {id: "channel-2", guildId: "guild-1", title: "# rules", guildName: "Test Server"}
  ]);
  delete global.document;
});

test("navigation failure notifies instead of reloading Discord", () => {
  let message = null;
  const bridge = new DiscordBridge({notify: (value) => { message = value; }});

  const didNavigate = bridge.transitionTo("/channels/guild-1");

  assert.equal(didNavigate, false);
  assert.match(message, /could not navigate/i);
});

test("navigation lookup is retried when the router was unavailable at startup", () => {
  const bridge = new DiscordBridge({notify: () => {}});
  let route = null;
  global.BdApi = {
    Webpack: {
      getByKeys: () => ({transitionTo: (value) => { route = value; }})
    }
  };

  assert.equal(bridge.transitionTo("/channels/guild-1"), true);
  assert.equal(route, "/channels/guild-1");
  delete global.BdApi;
});

test("navigation lookup can find Discord's router in loaded modules", () => {
  const bridge = new DiscordBridge({notify: () => {}});
  let route = null;
  global.BdApi = {Webpack: {getByKeys: () => null, getModule: () => null}};
  global.webpackChunkdiscord_app = {
    push: (entry) => entry[2]({
      c: {router: {exports: {default: {transitionTo: (value) => { route = value; }}}}}
    })
  };

  assert.equal(bridge.transitionTo("/channels/guild-1"), true);
  assert.equal(route, "/channels/guild-1");
  delete global.BdApi;
  delete global.webpackChunkdiscord_app;
});
