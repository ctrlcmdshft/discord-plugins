# CommandCenter

CommandCenter is a BetterDiscord plugin foundation for a Raycast-style command palette in Discord.

## What v0.2 Includes

- `Cmd+K` on macOS and `Ctrl+K` on Windows/Linux to open the palette.
- Keyboard navigation with arrow keys, Enter, and Escape.
- Safe starter commands for closing the palette, copying the current Discord location, showing the plugin version, and development reload guidance.
- Read-only Discord discovery for servers, text channels, and DMs when Discord's internal stores are available.
- Navigation commands for jumping to channels, servers, DMs, and the previously seen channel.
- Clipboard commands for the current channel link and channel ID.
- A command registry that can be extended without coupling new commands to the UI.
- A fuzzy-search module with focused tests.
- Useful actions are ranked first when the palette opens; searched results remain ranked by match quality.
- Plugin settings to show or hide Navigation, Clipboard, Servers, Channels, Direct Messages, and Development commands.
- An adjustable result limit (5–30) for a shorter or denser palette.
- A build pipeline that bundles the source tree into `dist/CommandCenter.plugin.js`.

This foundation deliberately avoids self-bot behavior, message automation, token access, or direct Discord API calls.

## Development

```sh
npm install
npm test
npm run build
```

## Load In BetterDiscord

Build the plugin, then copy or symlink:

```sh
cp dist/CommandCenter.plugin.js "$HOME/Library/Application Support/BetterDiscord/plugins/CommandCenter.plugin.js"
```

Restart Discord or toggle the plugin from BetterDiscord's Plugins settings. Press `Cmd+K` on macOS or `Ctrl+K` elsewhere to open the palette.

Use BetterDiscord's CommandCenter settings to choose which command groups appear. Changes apply immediately to an open palette.

For iterative development:

```sh
ln -sf "$PWD/dist/CommandCenter.plugin.js" "$HOME/Library/Application Support/BetterDiscord/plugins/CommandCenter.plugin.js"
npm run build
```

After rebuilding, toggle CommandCenter off and on in BetterDiscord.
