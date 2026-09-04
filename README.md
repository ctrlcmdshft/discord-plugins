# Discord Plugins

Private BetterDiscord plugin workspace for plugins created by ctrlcmdshft.

The project is MIT licensed. See `CONTRIBUTING.md` for contribution expectations.

## Plugins

- `plugins/StatusDurations` - Lightweight editable replacements for Discord's five status duration choices.

## Releases

Built BetterDiscord-ready single-file plugins are copied into `releases/`:

- `releases/StatusDurations.plugin.js`

## Development

Build StatusDurations:

```sh
npm run build
```

Or use the explicit plugin command:

```sh
npm run build:statusdurations
```

Run the tests:

```sh
npm test
```

Install StatusDurations locally:

```sh
cp releases/StatusDurations.plugin.js "$HOME/Library/Application Support/BetterDiscord/plugins/StatusDurations.plugin.js"
```

## GitHub Actions

Use the `Build Plugins` workflow from GitHub's Actions tab. It runs manually only, and the run form lets you choose:

- `all`
- `StatusDurations`

The workflow uploads only the `.plugin.js` file or files selected for that run as artifacts.
