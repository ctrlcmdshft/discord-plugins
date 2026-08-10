# Discord Plugins

Private BetterDiscord plugin workspace for plugins created by ctrlcmdshft.

## Plugins

- `plugins/AwayTimer` - Custom Idle duration presets that replace Discord's default Idle duration menu choices.
- `plugins/CommandCenter` - Raycast-style Discord command palette prototype.

## Releases

Built BetterDiscord-ready single-file plugins are copied into `releases/`:

- `releases/AwayTimer.plugin.js`
- `releases/CommandCenter.plugin.js`

## Development

Build all plugins:

```sh
npm run build
```

Test all plugins:

```sh
npm test
```

Install AwayTimer locally:

```sh
cp releases/AwayTimer.plugin.js "$HOME/Library/Application Support/BetterDiscord/plugins/AwayTimer.plugin.js"
```

Install CommandCenter locally:

```sh
cp releases/CommandCenter.plugin.js "$HOME/Library/Application Support/BetterDiscord/plugins/CommandCenter.plugin.js"
```
