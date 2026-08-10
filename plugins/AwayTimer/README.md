# AwayTimer

AwayTimer is a focused BetterDiscord plugin that lets you choose when Discord should show you as Idle.

## What v0.3 Includes

- Custom manual Idle timer presets, defaulting to Discord's timed choices: 15 minutes, 1 hour, 8 hours, 1 day, and 3 days.
- User-edited presets are saved and preserved across plugin updates.
- Reset Presets button to return to Discord defaults.
- A permanent Forever option at the bottom of the Idle menu that does not restore to Online.
- Custom preset entries replace Discord's default native Idle duration choices.
- Automatic return to Online when a custom timer ends.
- Optional floating "Away" button fallback near Discord's lower-left user panel.
- Native BetterDiscord settings panel.

This plugin does not send messages, read tokens, use a bot account, or call Discord APIs directly. It updates your own status through Discord's current user settings module inside the client.

## Development

```sh
npm install
npm test
npm run build
```

## Load In BetterDiscord

```sh
cp dist/AwayTimer.plugin.js "$HOME/Library/Application Support/BetterDiscord/plugins/AwayTimer.plugin.js"
```

Then enable AwayTimer from BetterDiscord's Plugins settings. Open Discord's status menu, hover Idle, and use the custom duration list.
