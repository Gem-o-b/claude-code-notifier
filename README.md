# claude-code-notifier

> Get notified the moment a Claude Code session finishes — or needs your input — even when you're buried in another window.

[한국어 README](./README.ko.md)

When you run several Claude Code sessions across different terminals and IDEs, it's easy to miss the moment one finishes or starts waiting for your approval. `claude-code-notifier` hooks into Claude Code and alerts you — with a desktop toast and a distinctive sound — telling you **which** project just needs you.

## Features

- 🔔 **Desktop toast** that shows the project name and full path, so you know exactly which terminal to switch to.
- 🔊 **Distinctive sound** (different from the generic notification chime) for "done" vs "waiting".
- 🖥️ **Cross-platform** — Windows, macOS, Linux. One codebase, no per-OS setup.
- ⚙️ **Zero config to start** — one `install` command wires it into Claude Code. Channels are individually toggleable.
- 🧩 **Pluggable channels** — add your own (e.g. phone push) by dropping in one file.

## How it works

Claude Code can run a command on lifecycle events. `claude-code-notifier install` registers two [hooks](https://docs.claude.com/en/docs/claude-code/hooks):

- **`Stop`** — fires when Claude finishes responding → "✅ done".
- **`Notification`** — fires when Claude is waiting for input/permission → "⏳ waiting".

Each event runs `claude-code-notifier hook <event>`, which reads the session info from stdin and fires the enabled channels.

## Requirements

- [Node.js](https://nodejs.org) ≥ 18
- [Claude Code](https://docs.claude.com/en/docs/claude-code)

## Install

```bash
npm install -g @gem-o-b/claude-code-notifier
claude-code-notifier install
```

`install` adds the hooks to `~/.claude/settings.json` and creates a default config at `~/.claude-code-notifier/config.json`. **Restart your Claude Code session** for the hooks to take effect.

Try it right away:

```bash
claude-code-notifier test
```

To remove the hooks:

```bash
claude-code-notifier uninstall
```

<details>
<summary>Install from source instead</summary>

```bash
git clone https://github.com/Gem-o-b/claude-code-notifier.git
cd claude-code-notifier
npm install
node src/cli.js install
```

</details>

## Commands

| Command | Description |
| --- | --- |
| `install` | Register `Stop` / `Notification` hooks + create default config |
| `uninstall` | Remove the registered hooks |
| `test` | Fire a sample alert right now |
| `config` | Print the config path and contents |
| `hook <stop\|notification>` | The hook handler (invoked by Claude Code — not by you) |

## Configuration

`~/.claude-code-notifier/config.json` toggles channels per event:

```jsonc
{
  "stop":         { "window": false, "toast": true, "sound": true },
  "notification": { "window": false, "toast": true, "sound": true }
}
```

| Channel | What it does | Default |
| --- | --- | --- |
| `toast` | OS desktop notification with project name + path | **on** |
| `sound` | Distinctive completion / waiting sound | **on** |
| `window` | Terminal bell + tab title (flashes taskbar/tab) | off |

### About the `window` channel

The `window` channel emits a terminal bell and a tab-title update. Whether that produces a *visible* flash depends on your terminal's bell settings, and inside a Claude Code session the tab title is managed by Claude Code itself — so it's **off by default**. If you want it, enable it in the config and turn on a visual bell in your terminal (e.g. Windows Terminal → *Bell notification style* → "Window"/"Taskbar").

## Platform support

| | Toast | Sound | Terminal bell |
| --- | --- | --- | --- |
| **Windows** | SnoreToast | `tada.wav` / `chimes.wav` | `CONOUT$` |
| **macOS** | Notification Center | `Hero.aiff` / `Submarine.aiff` | `/dev/tty` |
| **Linux** | `notify-send` | freedesktop sound | `/dev/tty` |

> Status: verified on **Windows / Windows Terminal**. macOS and Linux code paths exist but are not yet verified — testers welcome.

## The bell icon

The toast icon (`assets/bell.png`) is generated with no external assets:

```bash
node scripts/make-icon.mjs
```

## Extending: add a channel

Each channel is a module exporting `notify(ctx)` and `name`. To add one (e.g. phone push):

1. Create `src/notifiers/push.js` exporting `notify(ctx)`.
2. Register it in `src/dispatcher.js`.
3. Add its key to the config.

`ctx` provides `{ event, projectName, cwd, sessionId, message }`.

## License

MIT
