# Discord Plugins

Private BetterDiscord plugin workspace for plugins created by ctrlcmdshft.

## Plugins

- `plugins/StatusTimer` - Custom Idle and Do Not Disturb duration presets that replace Discord's default status duration choices while preserving user-edited presets across updates.
- `plugins/CommandCenter` - Raycast-style Discord command palette prototype.

## Releases

Built BetterDiscord-ready single-file plugins are copied into `releases/`:

- `releases/StatusTimer.plugin.js`
- `releases/CommandCenter.plugin.js`

## Development

Build all plugins:

```sh
npm run build
```

Build one plugin:

```sh
npm run build:statustimer
npm run build:commandcenter
```

Test all plugins:

```sh
npm test
```

Install StatusTimer locally:

```sh
cp releases/StatusTimer.plugin.js "$HOME/Library/Application Support/BetterDiscord/plugins/StatusTimer.plugin.js"
```

Install CommandCenter locally:

```sh
cp releases/CommandCenter.plugin.js "$HOME/Library/Application Support/BetterDiscord/plugins/CommandCenter.plugin.js"
```

## GitHub Actions

Use the `Build Plugins` workflow from GitHub's Actions tab. The manual run form lets you choose:

- `all`
- `StatusTimer`
- `CommandCenter`

The workflow uploads the built `.plugin.js` files as artifacts.
