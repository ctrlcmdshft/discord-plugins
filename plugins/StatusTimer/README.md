# StatusTimer

StatusTimer is a focused BetterDiscord plugin that replaces Discord's default status duration choices with editable presets.

## What It Includes

- Separate editable presets for Idle and Do Not Disturb.
- Defaults matching Discord's timed choices: 15 minutes, 1 hour, 8 hours, 1 day, and 3 days.
- User-edited presets are saved and preserved across plugin updates.
- Reset Presets buttons to return each status to Discord defaults.
- Active timer indicator with a Cancel Timer button in settings.
- Active timer indicator and Cancel Timer row inside Discord's status duration submenu.
- Save feedback reports ignored invalid preset values.
- A permanent Forever option at the bottom that does not restore to Online.
- Automatic return to Online when a custom timer ends.

This plugin does not send messages, read tokens, use a bot account, or call Discord APIs directly. It updates your own status through Discord's current user settings module inside the client.

## Development

```sh
npm install
npm test
npm run build
```

## Load In BetterDiscord

```sh
cp dist/StatusTimer.plugin.js "$HOME/Library/Application Support/BetterDiscord/plugins/StatusTimer.plugin.js"
```

Then enable StatusTimer from BetterDiscord's Plugins settings. Open Discord's status menu, hover Idle or Do Not Disturb, and use the custom duration list.
