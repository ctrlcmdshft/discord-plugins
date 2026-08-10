# AwayTimer

AwayTimer is a focused BetterDiscord plugin that lets you choose when Discord should show you as Idle.

## What v0.1 Includes

- Configurable "Show Away After" time from 1 to 240 minutes.
- Custom manual Idle timer presets, such as 20 minutes, 45 minutes, or 2h 30m.
- One-off "Set Idle For Minutes" and "Set Idle Until Time" controls.
- Quick "Away" button near Discord's lower-left user panel.
- Custom preset entries replace Discord's default native Idle duration choices.
- Optional test mode that treats the same number as seconds.
- Automatic return to Online after Discord activity, only when AwayTimer was the plugin that set Idle.
- Option to avoid changing status while you are in a voice channel.
- Option to only change status when your current status is Online, so Do Not Disturb, Invisible, and manual Idle are left alone.
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

Then enable AwayTimer from BetterDiscord's Plugins settings and open its settings panel to use your custom Idle timers.
