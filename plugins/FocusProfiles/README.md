# FocusProfiles

FocusProfiles adds one-click modes to Discord's status menu. A profile can set a status, optionally restore it after a timer, mute selected server channels, and locally hide selected channels or categories.

## Use

1. Open FocusProfiles settings and configure Work, Gaming, or Away.
2. Open a channel, then use **Mute current channel** or **Hide current channel** to add it to a profile.
3. Open your Discord status menu and choose **Focus: _profile name_**.

Use **Clear Focus Profile** in the same status menu (or settings) to restore the prior status, unmute the channels set by the profile, and reveal locally hidden channels.

Channel hiding only changes this local Discord client. Notification muting uses Discord's existing per-channel notification override only when the current Discord build can read and restore that channel's setting; this prevents the plugin from overwriting an existing mute choice. If that capability is unavailable, the rest of the profile still works.

## Development

```sh
npm install
npm test
npm run build
```
