# Contributing

StatusDurations accepts focused bug fixes and compatibility improvements.

Before opening a change:

1. Keep the plugin limited to custom status durations.
2. Use BetterDiscord's public `BdApi` surface for access to Discord internals.
3. Include cleanup for every listener, timeout, patch, and DOM change.
4. Add or update focused tests and run `npm test`.
5. Build the release with `npm run build`.
